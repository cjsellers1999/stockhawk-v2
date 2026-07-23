# Repository instructions

## Agent skills

### Issue tracker

Issues live as local Markdown under `.scratch/`; external pull requests are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository using root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Frontend rules

- The locked artifact at `.scratch/stockhawk-v1/design/stockhawk-v1-design-prototype.html` is visual authority.
- Use locally owned shadcn/ui `base-nova` components backed by `@base-ui/react`, Tailwind CSS v4, exact-pinned TanStack Table v9 beta, and exact-pinned TanStack Query v5.
- Use StockHawk semantic theme tokens before generic Tailwind utilities. Never let shadcn defaults replace locked light/dark values.
- Reusable, app-agnostic presentation primitives live in `packages/ui` and are imported through explicit `@stockhawk/ui/*` subpaths. Do not recreate app-local `components/ui`; domain components remain feature-local.
- Vite/browser and source UI TypeScript use `module: "preserve"`, `noEmit`, and extensionless relative imports. TypeScript-emitted Node packages use `NodeNext` and runtime `.js` import extensions.
- Use Tailwind utilities for all component styling. `packages/ui/src/styles.css` owns the shared theme, semantic typography classes, and breakpoints; `apps/web/src/styles.css` is only its Tailwind entrypoint and consumer. Component stylesheets and CSS Modules are forbidden.
- Prefer normal Tailwind scale utilities. Arbitrary Tailwind values are forbidden; add reusable exact values as governed Tailwind theme tokens.
- State/selector variants, CSS-variable shorthand, and governed low-level arbitrary properties remain allowed when lint accepts them.
- Prettier sorts Tailwind classes. ESLint verifies compiler-derived ordering, rejects arbitrary/unknown/contradictory classes, and uses only narrow explicit custom-class whitelists.
- Oxlint owns TypeScript, React, React Compiler, console, and TanStack Query rules. Every warning fails verification except an explicitly documented rule severity.
- Keep strict peer checks. Any exact compatibility exception needs a written reason plus lint, typecheck, and runtime proof; never copy a repository-wide peer-check disable.
- Every true UI mutation uses the shared optimistic command boundary. Feature code may not import `useMutation` directly.
- Run `pnpm lint:check`, `pnpm format:check`, `pnpm typecheck`, relevant tests, and the production build before handoff.
