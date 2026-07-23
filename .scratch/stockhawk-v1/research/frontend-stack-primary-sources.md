# Frontend stack: primary-source snapshot

Verified 2026-07-22. Scope: official project documentation/repositories and npm registry metadata only. npm dist-tags are mutable; the exact versions below are the reproducible snapshot.

## Locked recommendation

- Use shadcn/ui-generated source with **Base UI** primitives, not Radix. Run the CLI with explicit `-b base` even though Base UI is now shadcn's default. Base UI is stable and shadcn recommends it for new projects. ([shadcn announcement](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default), [CLI options](https://ui.shadcn.com/docs/cli))
- Use **Tailwind CSS v4** through the matching Vite plugin, semantic CSS variables, and `@theme inline`. ([shadcn Vite setup](https://ui.shadcn.com/docs/installation/vite), [shadcn manual CSS](https://ui.shadcn.com/docs/installation/manual), [Tailwind theme variables](https://tailwindcss.com/docs/theme))
- Use **TanStack Table `9.0.0-beta.55` exactly**. The npm `latest` tag is still v8; the requested v9 requires the beta line. ([v9 installation](https://tanstack.com/table/beta/docs/installation), [registry metadata](https://registry.npmjs.org/%40tanstack%2Freact-table))
- Use stable **TanStack Query `5.101.4` exactly** and its official ESLint plugin. ([Query installation](https://tanstack.com/query/latest/docs/framework/react/installation), [Query TypeScript guidance](https://tanstack.com/query/latest/docs/framework/react/typescript), [Query ESLint plugin](https://tanstack.com/query/latest/docs/eslint/eslint-plugin-query))

## Version and compatibility snapshot

| Role | npm dist-tag state | Reproducible pin | Compatibility / implication |
|---|---|---|---|
| [`shadcn`](https://registry.npmjs.org/shadcn) | `latest` = `4.14.0` | [`4.14.0`](https://registry.npmjs.org/shadcn/4.14.0) | Node `>=20.18.1`. The package now supplies `shadcn/tailwind.css` unless ejected. |
| [`@base-ui/react`](https://registry.npmjs.org/%40base-ui%2Freact) | `latest` = `1.6.0` | [`1.6.0`](https://registry.npmjs.org/%40base-ui%2Freact/1.6.0) | React/ReactDOM 17, 18, or 19; Node `>=14`. `date-fns` peers are optional. |
| [`tailwindcss`](https://registry.npmjs.org/tailwindcss) | `latest` = `4.3.3`; `v3-lts` = `3.4.19` | [`4.3.3`](https://registry.npmjs.org/tailwindcss/4.3.3) | v4 browser floor: Chrome 111, Safari 16.4, Firefox 128. ([compatibility](https://tailwindcss.com/docs/compatibility)) |
| [`@tailwindcss/vite`](https://registry.npmjs.org/%40tailwindcss%2Fvite) | `latest` = `4.3.3` | [`4.3.3`](https://registry.npmjs.org/%40tailwindcss%2Fvite/4.3.3) | Supports Vite `^5.2`, 6, 7, or 8. Use this instead of the PostCSS adapter in a Vite app. |
| [`tw-animate-css`](https://registry.npmjs.org/tw-animate-css) | `latest` = `1.4.0` | [`1.4.0`](https://registry.npmjs.org/tw-animate-css/1.4.0) | Current shadcn animation CSS companion; `tailwindcss-animate` is deprecated. ([shadcn Tailwind v4 notes](https://ui.shadcn.com/docs/tailwind-v4)) |
| [`@tanstack/react-table`](https://registry.npmjs.org/%40tanstack%2Freact-table) | `latest` = `8.21.3`; `beta` = `9.0.0-beta.55` | [`9.0.0-beta.55`](https://registry.npmjs.org/%40tanstack%2Freact-table/9.0.0-beta.55) | React `>=18`; Node `>=20`; exact `@tanstack/table-core@9.0.0-beta.55`; `@tanstack/react-store ^0.11.0`. |
| [`@tanstack/react-query`](https://registry.npmjs.org/%40tanstack%2Freact-query) | `latest` = `5.101.4` | [`5.101.4`](https://registry.npmjs.org/%40tanstack%2Freact-query/5.101.4) | React 18 or 19; exact `@tanstack/query-core@5.101.4`. |
| [`@tanstack/react-store`](https://registry.npmjs.org/%40tanstack%2Freact-store) | `latest` = `0.11.0` | [`0.11.0`](https://registry.npmjs.org/%40tanstack%2Freact-store/0.11.0), only if imported | Declare directly when using Table v9 external atoms; do not rely on react-table's transitive dependency. |
| [`@tanstack/eslint-plugin-query`](https://registry.npmjs.org/%40tanstack%2Feslint-plugin-query) | `latest` = `5.101.4` | [`5.101.4`](https://registry.npmjs.org/%40tanstack%2Feslint-plugin-query/5.101.4) | ESLint 8.57, 9, or 10; TypeScript 5.4 or 6. |
| [`prettier-plugin-tailwindcss`](https://registry.npmjs.org/prettier-plugin-tailwindcss) | `latest` = `0.8.1` | [`0.8.1`](https://registry.npmjs.org/prettier-plugin-tailwindcss/0.8.1) | Node `>=20.19`, Prettier 3, ESM-only. ([official repository](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)) |

The common React intersection is React 18 or 19. For a greenfield app, current stable [`react@19.2.8`](https://registry.npmjs.org/react/19.2.8) and [`react-dom@19.2.8`](https://registry.npmjs.org/react-dom/19.2.8) satisfy every requested package. A common tooling floor is Node 20.19+; a current LTS newer than that also satisfies these constraints.

## shadcn + Base UI + Tailwind setup

Initialize deterministically:

```sh
pnpm dlx shadcn@4.14.0 init -b base --css-variables
```

For a new Vite project, add `-t vite`. Commit `components.json`, generated UI source, `package.json`, and the lockfile. shadcn components are source owned by the application, while the CLI records how future components should be generated. ([CLI](https://ui.shadcn.com/docs/cli), [`components.json`](https://ui.shadcn.com/docs/components-json))

Use Tailwind v4's Vite plugin and CSS-first configuration:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

- Register `tailwindcss()` from `@tailwindcss/vite` in `vite.config.ts`. ([Tailwind Vite setup](https://tailwindcss.com/docs/installation/using-vite))
- Leave `components.json.tailwind.config` blank for Tailwind v4. Keep `tailwind.cssVariables: true`; shadcn recommends semantic CSS variables. ([`components.json`](https://ui.shadcn.com/docs/components-json))
- Map the locked StockHawk design tokens into `:root`/`.dark`, then expose them through `@theme inline`. Do not replace the visual contract with a stock shadcn preset.
- Keep Tailwind class names as complete static strings; its scanner does not understand dynamically assembled fragments. ([class detection](https://tailwindcss.com/docs/detecting-classes-in-source-files))
- Tailwind v4 is not intended to be combined with Sass, Less, or Stylus. ([compatibility](https://tailwindcss.com/docs/compatibility))

Base UI needs two global layout rules for its portaled popups/backdrops:

```css
#root {
  isolation: isolate;
}

body {
  position: relative;
}
```

The first isolates application stacking so portals stay above page content. The second supports dialog backdrops under iOS 26+ Safari's visual viewport behavior. Adapt `#root` to the actual app-root selector. ([Base UI quick start](https://base-ui.com/react/overview/quick-start))

Application code should normally import the styled wrappers from the committed shadcn UI directory. Use raw `@base-ui/react/*` parts only when no wrapper fits. Base UI is unstyled and tree-shakable, and its composition API uses `render`, not Radix's `asChild`. ([Base UI quick start](https://base-ui.com/react/overview/quick-start), [composition](https://base-ui.com/react/handbook/composition), [shadcn migration note](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default))

## TanStack Table v9 compatibility trap

The current shadcn Data Table guide is still a v8 recipe: it installs untagged `@tanstack/react-table`, calls `useReactTable`, and supplies `getCoreRowModel()`. Untagged installation resolves to v8.21.3. Do **not** copy that guide into a v9 implementation. ([current shadcn Data Table guide](https://ui.shadcn.com/docs/components/base/data-table), [v9 installation warning](https://tanstack.com/table/beta/docs/installation))

Use shadcn's presentational `<Table>` components with TanStack's official **v9 Shadcn Base UI** example. v9 uses `useTable`, a stable `tableFeatures(...)` definition, and explicitly selected feature/row-model modules. ([official v9 Shadcn Base UI example](https://tanstack.com/table/beta/docs/framework/react/examples/lib-shadcn-base), [v9 migration guide](https://tanstack.com/table/beta/docs/framework/react/guide/migrating))

For server-backed tables:

- Put pagination, sorting, and filter values into TanStack Query keys.
- Use Table v9 manual server-side modes; do not add client row-model transforms for operations the server already performs.
- External TanStack Store atoms are v9's recommended way to share controlled table state with Query. Add `@tanstack/react-store@0.11.0` directly if those APIs are imported. ([v9 pagination guide](https://tanstack.com/table/beta/docs/framework/react/guide/pagination), [v9 table state guide](https://tanstack.com/table/beta/docs/framework/react/guide/table-state))
- Keep `features`, columns, empty fallbacks, and transformed data references stable. Query data is stable, but inline `filter()`/`map()` results are not. ([v9 data guide](https://tanstack.com/table/beta/docs/guide/data))

## TanStack Query baseline

- Construct one stable `QueryClient` and provide it at the app root. ([provider](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider), [stable-client lint rule](https://tanstack.com/query/latest/docs/eslint/stable-query-client))
- Co-locate reusable query keys and functions with `queryOptions`; include every changing input in the key. ([query options](https://tanstack.com/query/latest/docs/framework/react/guides/query-options), [exhaustive-deps rule](https://tanstack.com/query/latest/docs/eslint/exhaustive-deps))
- Treat optimistic mutations as cancel -> snapshot -> optimistic update -> rollback on error -> authoritative invalidation/reconciliation. ([optimistic updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates))
- Enable `@tanstack/eslint-plugin-query`'s `flat/recommended` config at minimum; `flat/recommended-strict` adds the official opinionated rules. ([plugin setup](https://tanstack.com/query/latest/docs/eslint/eslint-plugin-query))

## Tailwind formatting rule

Use the official `prettier-plugin-tailwindcss@0.8.1`. For Tailwind v4, configure `tailwindStylesheet` to the CSS entry containing the theme and custom utilities. If other supported Prettier plugins are present, load the Tailwind plugin last. ([official plugin documentation](https://github.com/tailwindlabs/prettier-plugin-tailwindcss))

## Pinning and update policy

1. Save the versions above exactly and commit the package-manager lockfile. Do not leave `latest` or `beta` tags in `package.json`, scripts, or CI.
2. Especially pin Table to `9.0.0-beta.55`: v9 beta releases have made API changes at beta.10, beta.38, and beta.48/49. Upgrade one beta at a time through a reviewed dependency change; read the floating beta migration guide, then run typecheck, unit/integration tests, table interaction tests, and visual regression. ([migration guide](https://tanstack.com/table/beta/docs/framework/react/guide/migrating))
3. Pin Query to an exact patch. Its maintainers explicitly say type changes may ship as non-breaking patches and recommend locking a specific patch release. ([TypeScript guidance](https://tanstack.com/query/latest/docs/framework/react/typescript))
4. Treat shadcn component updates as source-code changes. Use the pinned CLI's `--dry-run`/`--diff`, review generated diffs, and never automatically overwrite customized components. The CLI's `eject` command can inline `shadcn/tailwind.css`, but then future shadcn CSS improvements no longer arrive automatically. ([CLI](https://ui.shadcn.com/docs/cli), [Tailwind v4 update warning](https://ui.shadcn.com/docs/tailwind-v4))
5. Upgrade stable Base UI, Tailwind, Query, and tooling only through lockfile-backed review. Re-check React, Node, Vite, ESLint, TypeScript, and browser support each time.

