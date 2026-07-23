# Frontend tooling reference

Date inspected: 2026-07-22

Source snapshot: commit `d60c74dcec2401125f912e710a30ca003bf6ed94` (`2026-07-20T22:40:06-07:00`). Only configuration, package metadata, theme policy, and representative primitive imports were inspected.

## Decision

Adopt the inspected frontend enforcement architecture, updated to current compatible package releases and StockHawk paths. Do not copy its ACERTUS brand, proprietary Interstate fonts, components, package namespace, application selectors, or light-only theme.

StockHawk's [locked design](../design/DESIGN.md) remains visual authority. This reference governs how that design is implemented and checked, not what it looks like.

## Adopted setup

### Workspace commands

- Keep root `dev`, `build`, `test`, `lint`, `lint:check`, `format`, `format:check`, and `typecheck` commands behind the local Turborepo graph.
- Run Oxlint first for fast TypeScript/React/TanStack Query rules, then ESLint for Tailwind compiler-aware rules.
- Treat every warning as a failure in `lint:check`.
- Run formatting, type checking, tests, and production build as independent gates; no one command substitutes for another.
- Keep pnpm peer checks strict. The source repository's workspace-wide `strictPeerDependencies: false` is not adopted. If a current tool has not declared compatibility with the selected TypeScript release, allow only the exact package/version pair after lint, typecheck, config-test, and production-build proof.

### Oxlint baseline

- Type-aware linting with the `eslint`, `typescript`, `unicorn`, `oxc`, and `react` plugins.
- TanStack Query's ESLint plugin loaded for `exhaustive-deps`, `stable-query-client`, `no-unstable-deps`, `infinite-query-property-order`, `no-void-query-fn`, and `mutation-property-order`; retain `no-rest-destructuring` as a warning only if the installed plugin still recommends that severity.
- Reject explicit `any`, unsafe TypeScript escape hatches, namespaces, avoidable non-null patterns, unused variables, `var`, mutable values that can be `const`, obsolete rest/spread patterns, and console output.
- Enable the React Compiler lint rule together with the compiler; do not enforce a compiler rule without compiling the same code.
- StockHawk's stricter architectural rules remain additional gates: direct feature `useMutation`, direct mutation endpoints, network access outside the Broker, and domain writes outside the Persistence Boundary are forbidden.

### Tailwind ESLint baseline

Use ESLint flat config with `eslint-plugin-tailwindcss` pointed at StockHawk's real Tailwind CSS entry stylesheet. Enable these rules as errors:

- `tailwindcss/classnames-order`
- `tailwindcss/enforces-negative-arbitrary-values`
- `tailwindcss/enforces-shorthand`
- `tailwindcss/important-modifier-suffix`
- `tailwindcss/no-arbitrary-value`
- `tailwindcss/no-contradicting-classname`
- `tailwindcss/no-custom-classname`
- `tailwindcss/no-unnecessary-arbitrary-value`

Use the Babel ESLint parser pattern if the chosen current TypeScript release is newer than the parser support range of the Tailwind plugin. Keep any custom-class whitelist exact and narrow.

### Tailwind authoring policy

- Use StockHawk semantic theme utilities/tokens before generic Tailwind values.
- Use normal Tailwind scale utilities when they exactly express the locked design.
- Do not use arbitrary Tailwind values such as raw pixel sizes, hex colors, arbitrary gaps, or arbitrary z-index values.
- Tailwind state/selector variants, CSS-variable shorthand, and governed low-level arbitrary properties remain allowed when the rule supports them.
- Put reusable, owner-approved design decisions from the locked artifact in the central theme. Do not add a global token merely to silence lint.
- Put one-off exact component geometry in component-owned CSS Modules or scoped custom properties.
- Do not hand-sort classes. Prettier owns ordering; ESLint verifies it.

### Tailwind and shadcn wiring

- Use Tailwind CSS v4's CSS-first Vite setup: `@tailwindcss/vite`, then `@import 'tailwindcss'` in the application stylesheet.
- Define the locked light/dark semantic variables and expose them through Tailwind's CSS-first theme mechanism. Do not accept shadcn defaults when they differ from the canonical design artifact.
- Initialize shadcn/ui for Vite/React with `style: "base-nova"`, `rsc: false`, TypeScript, CSS variables, neutral base metadata, Lucide icons, and local aliases.
- Use Base UI-backed shadcn components and `@base-ui/react`; do not introduce parallel Radix-backed copies of the same primitive families.
- Keep generated shadcn component source owned by StockHawk. Edit and test it like application code.
- Keep UI components under `apps/web` while it is the only consumer. Do not create a separate UI package until a real second consumer creates that seam.

### Prettier and editor setup

- Use `prettier-plugin-tailwindcss` with the actual StockHawk stylesheet supplied through `tailwindStylesheet`.
- Register class helper names `classNames`, `clsx`, `cn`, `cva`, `tw`, `twJoin`, and `twMerge` for formatting and Tailwind IntelliSense.
- Recommend the official `bradlc.vscode-tailwindcss` extension and commit the matching class-function and CSS-entry settings.
- Preserve StockHawk's chosen general Prettier style; the critical imported behavior is compiler-derived Tailwind ordering.

### Verification

- Unit-test the lint configuration with accepted/rejected class examples, including ordering, unknown classes, arbitrary values, allowed variants, CSS-variable shorthand, and the narrow whitelist.
- Prove the production build generates every semantic token used by the locked design in both themes.
- Run `lint:check`, `format:check`, `typecheck`, tests, and build from a locked install in the deterministic gate.

## Explicitly not copied

- `@metrogistics/acertus-ui`, ACERTUS colors, Interstate fonts, logos, semantic names, and proprietary assets.
- The source repository's light-only theme limitation.
- Source-specific application selectors or broad whitelists.
- A shared UI package solely because the source repository has one.
- Storybook as a mandatory V1 service; StockHawk's existing Playwright visual-regression gate is sufficient unless component isolation later proves valuable.
- The source repository's exact dependency patch versions when a newer compatible release exists at StockHawk bootstrap time.
