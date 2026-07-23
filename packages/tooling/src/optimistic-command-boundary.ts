import { relative, resolve } from "node:path";

import { parseSync } from "oxc-parser";

export type BoundarySource = {
  file: string;
  source: string;
};

export type BoundaryViolations = {
  mutationFetches: string[];
  mutationImports: string[];
  unregisteredFamilies: string[];
};

type AstNode = {
  type: string;
  [key: string]: unknown;
};

const readOnlyFetchMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const wrapperTypes = new Set([
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
]);
const isErrorSeverity = (severity: string) => severity === "Error";

const isNode = (value: unknown): value is AstNode =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string";

const childNodes = (node: AstNode): AstNode[] => {
  const children: AstNode[] = [];
  for (const value of Object.values(node)) {
    if (isNode(value)) {
      children.push(value);
    } else if (Array.isArray(value)) {
      children.push(...value.filter(isNode));
    }
  }
  return children;
};

const walk = (node: AstNode, visit: (current: AstNode) => void) => {
  visit(node);
  for (const child of childNodes(node)) {
    walk(child, visit);
  }
};

const parseSource = ({ file, source }: BoundarySource): AstNode => {
  const result = parseSync(file, source);
  const errors = result.errors.filter((error) =>
    isErrorSeverity(error.severity),
  );
  if (errors.length > 0) {
    throw new Error(`Cannot audit malformed source: ${file}`);
  }
  if (!isNode(result.program)) {
    throw new Error(`Cannot audit source without an AST: ${file}`);
  }
  return result.program;
};

const identifierName = (node: unknown): string | undefined =>
  isNode(node) && node.type === "Identifier" && typeof node.name === "string"
    ? node.name
    : undefined;

const literalText = (node: unknown): string | undefined =>
  isNode(node) && node.type === "Literal" && typeof node.value === "string"
    ? node.value
    : undefined;

const propertyName = (node: unknown) =>
  identifierName(node) ?? literalText(node);

const unwrapExpression = (node: AstNode): AstNode => {
  if (wrapperTypes.has(node.type) && isNode(node.expression)) {
    return unwrapExpression(node.expression);
  }
  return node;
};

const collectBindingNames = (node: unknown, names: string[]) => {
  if (!isNode(node)) {
    return;
  }
  const name = identifierName(node);
  if (name !== undefined) {
    names.push(name);
    return;
  }
  if (
    (node.type === "AssignmentPattern" || node.type === "RestElement") &&
    isNode(node.type === "AssignmentPattern" ? node.left : node.argument)
  ) {
    collectBindingNames(
      node.type === "AssignmentPattern" ? node.left : node.argument,
      names,
    );
    return;
  }
  if (node.type === "ArrayPattern") {
    const elements = Array.isArray(node.elements) ? node.elements : [];
    for (const element of elements) {
      collectBindingNames(element, names);
    }
    return;
  }
  if (node.type === "ObjectPattern") {
    const properties = Array.isArray(node.properties) ? node.properties : [];
    for (const property of properties) {
      if (!isNode(property)) {
        continue;
      }
      collectBindingNames(
        property.type === "Property" ? property.value : property.argument,
        names,
      );
    }
    return;
  }
  if (node.type === "TSParameterProperty") {
    collectBindingNames(node.parameter, names);
  }
};

const bindingCounts = (program: AstNode) => {
  const counts = new Map<string, number>();
  const addBindings = (pattern: unknown) => {
    const names: string[] = [];
    collectBindingNames(pattern, names);
    for (const name of names) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  };

  walk(program, (node) => {
    if (node.type === "VariableDeclarator") {
      addBindings(node.id);
    } else if (
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression"
    ) {
      if (node.type !== "ArrowFunctionExpression") {
        addBindings(node.id);
      }
      const parameters = Array.isArray(node.params) ? node.params : [];
      for (const parameter of parameters) {
        addBindings(parameter);
      }
    } else if (
      node.type === "ClassDeclaration" ||
      node.type === "ClassExpression"
    ) {
      addBindings(node.id);
    } else if (
      node.type === "ImportSpecifier" ||
      node.type === "ImportDefaultSpecifier" ||
      node.type === "ImportNamespaceSpecifier"
    ) {
      addBindings(node.local);
    } else if (node.type === "CatchClause") {
      addBindings(node.param);
    }
  });
  return counts;
};

const variableInitializers = (
  program: AstNode,
  { immutableOnly = false }: { immutableOnly?: boolean } = {},
) => {
  const counts = bindingCounts(program);
  const initializers = new Map<string, AstNode>();
  walk(program, (node) => {
    if (
      node.type !== "VariableDeclaration" ||
      (immutableOnly && node.kind !== "const")
    ) {
      return;
    }
    const declarations = Array.isArray(node.declarations)
      ? node.declarations
      : [];
    for (const declaration of declarations) {
      if (!isNode(declaration) || declaration.type !== "VariableDeclarator") {
        continue;
      }
      const name = identifierName(declaration.id);
      if (
        name !== undefined &&
        counts.get(name) === 1 &&
        isNode(declaration.init)
      ) {
        initializers.set(name, declaration.init);
      }
    }
  });
  return initializers;
};

const resolveExpression = (
  node: AstNode,
  initializers: Map<string, AstNode>,
  seen = new Set<string>(),
): AstNode => {
  const unwrapped = unwrapExpression(node);
  const name = identifierName(unwrapped);
  if (name === undefined || seen.has(name)) {
    return unwrapped;
  }
  const initializer = initializers.get(name);
  if (initializer === undefined) {
    return unwrapped;
  }
  seen.add(name);
  return resolveExpression(initializer, initializers, seen);
};

const resolvedKeyName = (node: AstNode, initializers: Map<string, AstNode>) => {
  const key = node.type === "MemberExpression" ? node.property : node.key;
  if (!isNode(key)) {
    return undefined;
  }
  return node.computed === true
    ? literalText(resolveExpression(key, initializers))
    : propertyName(key);
};

const isFetchReference = (
  node: AstNode,
  initializers: Map<string, AstNode>,
  seen = new Set<string>(),
): boolean => {
  const unwrapped = unwrapExpression(node);
  const name = identifierName(unwrapped);
  if (name !== undefined) {
    if (name === "fetch") {
      return true;
    }
    if (seen.has(name)) {
      return false;
    }
    const initializer = initializers.get(name);
    if (initializer === undefined) {
      return false;
    }
    seen.add(name);
    return isFetchReference(initializer, initializers, seen);
  }
  if (
    unwrapped.type === "MemberExpression" &&
    resolvedKeyName(unwrapped, initializers) === "fetch"
  ) {
    return true;
  }
  if (unwrapped.type !== "CallExpression" || !isNode(unwrapped.callee)) {
    return false;
  }
  const callee = unwrapExpression(unwrapped.callee);
  return (
    callee.type === "MemberExpression" &&
    resolvedKeyName(callee, initializers) === "bind" &&
    isNode(callee.object) &&
    isFetchReference(callee.object, initializers, seen)
  );
};

const resolvesToBinding = (
  node: AstNode,
  bindings: Set<string>,
  initializers: Map<string, AstNode>,
) => {
  const directName = identifierName(unwrapExpression(node));
  if (directName !== undefined && bindings.has(directName)) {
    return true;
  }
  const resolvedName = identifierName(resolveExpression(node, initializers));
  return resolvedName !== undefined && bindings.has(resolvedName);
};

const destructuredFetchAliases = (
  program: AstNode,
  initializers: Map<string, AstNode>,
) => {
  const aliases = new Set<string>();
  walk(program, (node) => {
    if (
      node.type !== "VariableDeclarator" ||
      !isNode(node.id) ||
      node.id.type !== "ObjectPattern"
    ) {
      return;
    }
    const properties = Array.isArray(node.id.properties)
      ? node.id.properties
      : [];
    for (const property of properties) {
      if (
        isNode(property) &&
        property.type === "Property" &&
        resolvedKeyName(property, initializers) === "fetch"
      ) {
        const alias = identifierName(property.value);
        if (alias !== undefined) {
          aliases.add(alias);
        }
      }
    }
  });
  return aliases;
};

const isKnownFetchReference = (
  node: AstNode,
  initializers: Map<string, AstNode>,
  aliases: Set<string>,
) => {
  const name = identifierName(unwrapExpression(node));
  return (
    (name !== undefined && aliases.has(name)) ||
    isFetchReference(node, initializers)
  );
};

const reassignedFetchAliases = (
  program: AstNode,
  initializers: Map<string, AstNode>,
  initialAliases: Set<string>,
) => {
  const aliases = new Set(initialAliases);
  const assignments: AstNode[] = [];
  walk(program, (node) => {
    if (
      node.type === "AssignmentExpression" &&
      node.operator === "=" &&
      isNode(node.left) &&
      isNode(node.right) &&
      identifierName(node.left) !== undefined
    ) {
      assignments.push(node);
    }
  });

  let addedAlias = true;
  while (addedAlias) {
    addedAlias = false;
    for (const assignment of assignments) {
      const alias = identifierName(assignment.left);
      if (
        alias !== undefined &&
        !aliases.has(alias) &&
        isNode(assignment.right) &&
        isKnownFetchReference(assignment.right, initializers, aliases)
      ) {
        aliases.add(alias);
        addedAlias = true;
      }
    }
  }
  return aliases;
};

const reassignedBindingAliases = (
  program: AstNode,
  initializers: Map<string, AstNode>,
  initialBindings: Set<string>,
) => {
  const bindings = new Set(initialBindings);
  const assignments: AstNode[] = [];
  walk(program, (node) => {
    if (
      node.type === "AssignmentExpression" &&
      node.operator === "=" &&
      isNode(node.left) &&
      isNode(node.right) &&
      identifierName(node.left) !== undefined
    ) {
      assignments.push(node);
    }
  });

  let addedBinding = true;
  while (addedBinding) {
    addedBinding = false;
    for (const assignment of assignments) {
      const alias = identifierName(assignment.left);
      if (
        alias !== undefined &&
        !bindings.has(alias) &&
        isNode(assignment.right) &&
        resolvesToBinding(assignment.right, bindings, initializers)
      ) {
        bindings.add(alias);
        addedBinding = true;
      }
    }
  }
  return bindings;
};

const mutationExportBindings = (program: AstNode) => {
  const bindings = new Set<string>();
  walk(program, (node) => {
    if (
      node.type !== "ImportDeclaration" ||
      literalText(node.source) !== "@tanstack/react-query"
    ) {
      return;
    }
    const specifiers = Array.isArray(node.specifiers) ? node.specifiers : [];
    for (const specifier of specifiers) {
      if (!isNode(specifier)) {
        continue;
      }
      if (
        specifier.type === "ImportSpecifier" &&
        identifierName(specifier.imported) === "useMutation"
      ) {
        const localName = identifierName(specifier.local);
        if (localName !== undefined) {
          bindings.add(localName);
        }
      } else if (specifier.type === "ImportNamespaceSpecifier") {
        const localName = identifierName(specifier.local);
        if (localName !== undefined) {
          bindings.add(localName);
        }
      }
    }
  });
  return bindings;
};

const reactQueryNamespaceBindings = (program: AstNode) => {
  const bindings = new Set<string>();
  walk(program, (node) => {
    if (
      node.type !== "ImportDeclaration" ||
      literalText(node.source) !== "@tanstack/react-query"
    ) {
      return;
    }
    const specifiers = Array.isArray(node.specifiers) ? node.specifiers : [];
    for (const specifier of specifiers) {
      if (isNode(specifier) && specifier.type === "ImportNamespaceSpecifier") {
        const localName = identifierName(specifier.local);
        if (localName !== undefined) {
          bindings.add(localName);
        }
      }
    }
  });
  return bindings;
};

const resolveText = (node: AstNode, initializers: Map<string, AstNode>) =>
  literalText(resolveExpression(node, initializers));

const registeredFamilies = (
  sources: BoundarySource[],
  registryPath: string,
) => {
  const registrationSource = sources.find(
    ({ file }) => resolve(file) === resolve(registryPath),
  );
  if (registrationSource === undefined) {
    throw new Error("Optimistic command registry source is missing");
  }
  const program = parseSource(registrationSource);
  const families = new Set<string>();

  walk(program, (node) => {
    if (
      node.type !== "VariableDeclarator" ||
      identifierName(node.id) !== "ownerCommandRegistry" ||
      !isNode(node.init)
    ) {
      return;
    }
    const registry = unwrapExpression(node.init);
    if (registry.type !== "ObjectExpression") {
      return;
    }
    const properties = Array.isArray(registry.properties)
      ? registry.properties
      : [];
    for (const property of properties) {
      if (isNode(property) && property.type === "Property") {
        const family = propertyName(property.key);
        if (family !== undefined) {
          families.add(family);
        }
      }
    }
  });
  return families;
};

type FetchInvocation = "direct" | "indirect";

const fetchInvocation = (
  callee: unknown,
  initializers: Map<string, AstNode>,
  destructuredAliases: Set<string>,
): FetchInvocation | undefined => {
  if (!isNode(callee)) {
    return undefined;
  }
  const resolvedCallee = unwrapExpression(callee);
  if (
    isKnownFetchReference(resolvedCallee, initializers, destructuredAliases)
  ) {
    return "direct";
  }
  if (
    resolvedCallee.type === "MemberExpression" &&
    ["apply", "call"].includes(
      resolvedKeyName(resolvedCallee, initializers) ?? "",
    ) &&
    isNode(resolvedCallee.object)
  ) {
    if (
      isKnownFetchReference(
        resolvedCallee.object,
        initializers,
        destructuredAliases,
      )
    ) {
      return "indirect";
    }
  }
  return undefined;
};

const containsEscapedFetchReference = (
  node: AstNode,
  initializers: Map<string, AstNode>,
  aliases: Set<string>,
): boolean => {
  if (isKnownFetchReference(node, initializers, aliases)) {
    return true;
  }
  if (node.type === "CallExpression") {
    if (fetchInvocation(node.callee, initializers, aliases) !== undefined) {
      return false;
    }
    const callArguments = Array.isArray(node.arguments) ? node.arguments : [];
    return callArguments.some(
      (argument) =>
        isNode(argument) &&
        containsEscapedFetchReference(argument, initializers, aliases),
    );
  }
  return childNodes(node).some((child) =>
    containsEscapedFetchReference(child, initializers, aliases),
  );
};

type FetchMethodResolution = "read-only" | "unsafe" | "unspecified";

const requestInitMethod = (
  optionsArgument: AstNode,
  initializers: Map<string, AstNode>,
): FetchMethodResolution => {
  const options = unwrapExpression(optionsArgument);
  if (options.type !== "ObjectExpression") {
    return "unsafe";
  }
  const properties = Array.isArray(options.properties)
    ? options.properties
    : [];
  if (
    properties.some(
      (property) =>
        !isNode(property) ||
        property.type === "SpreadElement" ||
        (property.type === "Property" &&
          property.computed === true &&
          literalText(property.key) === undefined),
    )
  ) {
    return "unsafe";
  }
  const methodProperties = properties.filter(
    (property) =>
      isNode(property) &&
      property.type === "Property" &&
      propertyName(property.key) === "method",
  );
  if (methodProperties.length === 0) {
    return "unspecified";
  }
  if (methodProperties.length !== 1) {
    return "unsafe";
  }
  const [methodProperty] = methodProperties;
  if (!isNode(methodProperty) || !isNode(methodProperty.value)) {
    return "unsafe";
  }
  const method = resolveText(methodProperty.value, initializers)?.toUpperCase();
  return method !== undefined && readOnlyFetchMethods.has(method)
    ? "read-only"
    : "unsafe";
};

const requestInputMethod = (
  input: AstNode,
  initializers: Map<string, AstNode>,
  seen = new Set<AstNode>(),
): FetchMethodResolution => {
  const resolved = resolveExpression(input, initializers);
  if (seen.has(resolved)) {
    return "unsafe";
  }
  seen.add(resolved);
  if (
    literalText(resolved) !== undefined ||
    resolved.type === "TemplateLiteral" ||
    (resolved.type === "NewExpression" &&
      identifierName(resolved.callee) === "URL")
  ) {
    return "read-only";
  }
  if (
    resolved.type !== "NewExpression" ||
    identifierName(resolved.callee) !== "Request"
  ) {
    return "unsafe";
  }
  const requestArguments = Array.isArray(resolved.arguments)
    ? resolved.arguments
    : [];
  const requestOptions = requestArguments[1];
  if (isNode(requestOptions)) {
    const configuredMethod = requestInitMethod(requestOptions, initializers);
    if (configuredMethod !== "unspecified") {
      return configuredMethod;
    }
  }
  const requestInput = requestArguments[0];
  return isNode(requestInput)
    ? requestInputMethod(requestInput, initializers, seen)
    : "unsafe";
};

const fetchMethod = (
  call: AstNode,
  initializers: Map<string, AstNode>,
): FetchMethodResolution => {
  const callArguments = Array.isArray(call.arguments) ? call.arguments : [];
  const optionsArgument = callArguments[1];
  if (isNode(optionsArgument)) {
    const configuredMethod = requestInitMethod(optionsArgument, initializers);
    if (configuredMethod !== "unspecified") {
      return configuredMethod;
    }
  }
  const input = callArguments[0];
  return isNode(input) ? requestInputMethod(input, initializers) : "unsafe";
};

export const auditOptimisticCommandBoundary = ({
  boundaryDirectory,
  registryPath,
  repositoryRoot,
  sources,
}: {
  boundaryDirectory: string;
  registryPath: string;
  repositoryRoot: string;
  sources: BoundarySource[];
}): BoundaryViolations => {
  const registrations = registeredFamilies(sources, registryPath);
  const mutationFetches = new Set<string>();
  const mutationImports = new Set<string>();
  const unregisteredFamilies = new Set<string>();

  for (const source of sources) {
    const program = parseSource(source);
    const fetchInitializers = variableInitializers(program);
    const fetchAliases = reassignedFetchAliases(
      program,
      fetchInitializers,
      destructuredFetchAliases(program, fetchInitializers),
    );
    const initializers = variableInitializers(program, {
      immutableOnly: true,
    });
    const mutationBindings = mutationExportBindings(program);
    const namespaceImports = reassignedBindingAliases(
      program,
      fetchInitializers,
      reactQueryNamespaceBindings(program),
    );
    const insideBoundary = resolve(source.file).startsWith(
      `${resolve(boundaryDirectory)}/`,
    );
    const displayPath = relative(repositoryRoot, source.file);

    walk(program, (node) => {
      if (
        node.type === "ImportDeclaration" &&
        literalText(node.source) === "@tanstack/react-query"
      ) {
        const specifiers = Array.isArray(node.specifiers)
          ? node.specifiers
          : [];
        for (const specifier of specifiers) {
          if (!isNode(specifier)) {
            continue;
          }
          if (
            specifier.type === "ImportSpecifier" &&
            identifierName(specifier.imported) === "useMutation" &&
            !insideBoundary
          ) {
            mutationImports.add(displayPath);
          }
        }
      }
      if (
        node.type === "ExportAllDeclaration" &&
        literalText(node.source) === "@tanstack/react-query"
      ) {
        mutationImports.add(displayPath);
      }
      if (
        !insideBoundary &&
        node.type === "ImportExpression" &&
        literalText(node.source) === "@tanstack/react-query"
      ) {
        mutationImports.add(displayPath);
      }
      if (node.type === "ExportNamedDeclaration") {
        const specifiers = Array.isArray(node.specifiers)
          ? node.specifiers
          : [];
        const exportsMutation = specifiers.some(
          (specifier) =>
            isNode(specifier) &&
            specifier.type === "ExportSpecifier" &&
            (literalText(node.source) === "@tanstack/react-query"
              ? identifierName(specifier.local) === "useMutation"
              : isNode(specifier.local) &&
                resolvesToBinding(
                  specifier.local,
                  mutationBindings,
                  fetchInitializers,
                )),
        );
        if (exportsMutation) {
          mutationImports.add(displayPath);
        }
      }
      if (
        !insideBoundary &&
        node.type === "MemberExpression" &&
        isNode(node.object) &&
        resolvesToBinding(node.object, namespaceImports, fetchInitializers) &&
        (resolvedKeyName(node, fetchInitializers) === "useMutation" ||
          (node.computed === true &&
            resolvedKeyName(node, fetchInitializers) === undefined))
      ) {
        mutationImports.add(displayPath);
      }
      if (
        !insideBoundary &&
        node.type === "VariableDeclarator" &&
        isNode(node.id) &&
        node.id.type === "ObjectPattern" &&
        isNode(node.init) &&
        resolvesToBinding(node.init, namespaceImports, fetchInitializers)
      ) {
        const properties = Array.isArray(node.id.properties)
          ? node.id.properties
          : [];
        if (
          properties.some(
            (property) =>
              isNode(property) &&
              property.type === "Property" &&
              (resolvedKeyName(property, fetchInitializers) === "useMutation" ||
                (property.computed === true &&
                  resolvedKeyName(property, fetchInitializers) === undefined)),
          )
        ) {
          mutationImports.add(displayPath);
        }
      }
      if (!insideBoundary) {
        const escapedExpression =
          node.type === "VariableDeclarator" && isNode(node.init)
            ? node.init
            : node.type === "AssignmentExpression" && isNode(node.right)
              ? node.right
              : node.type === "ReturnStatement" && isNode(node.argument)
                ? node.argument
                : node.type === "ExportDefaultDeclaration" &&
                    isNode(node.declaration)
                  ? node.declaration
                  : undefined;
        if (
          escapedExpression !== undefined &&
          containsEscapedFetchReference(
            escapedExpression,
            fetchInitializers,
            fetchAliases,
          )
        ) {
          mutationFetches.add(displayPath);
        }
      }
      if (!insideBoundary && node.type === "CallExpression") {
        const invocation = fetchInvocation(
          node.callee,
          fetchInitializers,
          fetchAliases,
        );
        if (
          invocation === "indirect" ||
          (invocation === "direct" &&
            fetchMethod(node, initializers) !== "read-only")
        ) {
          mutationFetches.add(displayPath);
        }
        if (
          invocation === undefined &&
          ((isNode(node.callee) &&
            containsEscapedFetchReference(
              node.callee,
              fetchInitializers,
              fetchAliases,
            )) ||
            (Array.isArray(node.arguments) ? node.arguments : []).some(
              (argument) =>
                isNode(argument) &&
                containsEscapedFetchReference(
                  argument,
                  fetchInitializers,
                  fetchAliases,
                ),
            ))
        ) {
          mutationFetches.add(displayPath);
        }
      }
      const assignedFamily =
        node.type === "AssignmentExpression" &&
        isNode(node.left) &&
        node.left.type === "MemberExpression" &&
        isNode(node.right)
          ? {
              key: resolvedKeyName(node.left, initializers),
              keyIsDynamic:
                node.left.computed === true &&
                resolvedKeyName(node.left, initializers) === undefined,
              value: node.right,
            }
          : undefined;
      const propertyFamily =
        node.type === "Property" && isNode(node.value)
          ? {
              key: resolvedKeyName(node, initializers),
              keyIsDynamic:
                node.computed === true &&
                resolvedKeyName(node, initializers) === undefined,
              value: node.value,
            }
          : undefined;
      const familyCandidate = assignedFamily ?? propertyFamily;
      if (familyCandidate?.keyIsDynamic === true) {
        unregisteredFamilies.add(`${displayPath}:<dynamic>`);
      } else if (familyCandidate?.key === "family") {
        const family = resolveText(familyCandidate.value, initializers);
        if (family === undefined) {
          unregisteredFamilies.add(`${displayPath}:<dynamic>`);
        } else if (!registrations.has(family)) {
          unregisteredFamilies.add(`${displayPath}:${family}`);
        }
      }
    });
  }

  return {
    mutationFetches: [...mutationFetches].toSorted(),
    mutationImports: [...mutationImports].toSorted(),
    unregisteredFamilies: [...unregisteredFamilies].toSorted(),
  };
};
