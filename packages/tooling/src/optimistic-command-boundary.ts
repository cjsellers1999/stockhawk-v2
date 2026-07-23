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

const mutationMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);
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

const variableInitializers = (program: AstNode) => {
  const initializers = new Map<string, AstNode>();
  walk(program, (node) => {
    if (node.type !== "VariableDeclarator") {
      return;
    }
    const name = identifierName(node.id);
    if (name !== undefined && isNode(node.init)) {
      initializers.set(name, node.init);
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

const isFetchCall = (callee: unknown) => {
  if (!isNode(callee)) {
    return false;
  }
  if (identifierName(callee) === "fetch") {
    return true;
  }
  return (
    callee.type === "MemberExpression" &&
    propertyName(callee.property) === "fetch"
  );
};

const mutationMethod = (call: AstNode, initializers: Map<string, AstNode>) => {
  const callArguments = Array.isArray(call.arguments) ? call.arguments : [];
  const optionsArgument = callArguments[1];
  if (!isNode(optionsArgument)) {
    return undefined;
  }
  const options = resolveExpression(optionsArgument, initializers);
  if (options.type !== "ObjectExpression") {
    return undefined;
  }
  const properties = Array.isArray(options.properties)
    ? options.properties
    : [];
  const methodProperty = properties.find(
    (property) =>
      isNode(property) &&
      property.type === "Property" &&
      propertyName(property.key) === "method",
  );
  if (!isNode(methodProperty) || !isNode(methodProperty.value)) {
    return undefined;
  }
  return resolveText(methodProperty.value, initializers)?.toUpperCase();
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
    const initializers = variableInitializers(program);
    const insideBoundary = resolve(source.file).startsWith(
      `${resolve(boundaryDirectory)}/`,
    );
    const namespaceImports = new Set<string>();
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
          if (specifier.type === "ImportNamespaceSpecifier") {
            const localName = identifierName(specifier.local);
            if (localName !== undefined) {
              namespaceImports.add(localName);
            }
          }
        }
      }
      if (
        !insideBoundary &&
        node.type === "MemberExpression" &&
        isNode(node.object) &&
        namespaceImports.has(identifierName(node.object) ?? "") &&
        propertyName(node.property) === "useMutation"
      ) {
        mutationImports.add(displayPath);
      }
      if (
        !insideBoundary &&
        node.type === "CallExpression" &&
        isFetchCall(node.callee)
      ) {
        const method = mutationMethod(node, initializers);
        if (method !== undefined && mutationMethods.has(method)) {
          mutationFetches.add(displayPath);
        }
      }
      if (
        node.type === "Property" &&
        propertyName(node.key) === "family" &&
        isNode(node.value)
      ) {
        const family = resolveText(node.value, initializers);
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
