# TanStack Router search parameters: implementation review

Verified 2026-07-23. Scope: official TanStack Router and TanStack Query documentation, plus the versions and source currently installed in this repository.

## Short answer

`apps/web/src/features/search/offers.query.ts` is **not parsing browser navigation search parameters**. It receives an already validated `OfferSearchQuery` and serializes that value into the query string for a separate HTTP request to `/api/offers`. TanStack Router owns the browser URL; `URLSearchParams` here owns the API request URL. Using it for that flat, repeated-`q` API protocol is reasonable.

The hand-written browser search validator in `offer-search.ts` works, but it is not the current recommended Zod 4 integration. TanStack recommends passing a Zod 4 schema directly to `validateSearch`. The route should use a route-specific resilient schema because the shared API schema is strict and would not preserve the current behavior of independently defaulting malformed fields. ([Search Params: validation](https://tanstack.com/router/latest/docs/guide/search-params#validating-search-params), [Search Params: Zod](https://tanstack.com/router/latest/docs/guide/search-params#zod))

## What each layer should own

| Layer | Current file | Responsibility | Assessment |
|---|---|---|---|
| Browser URL parsing and serialization | `router.tsx`, then TanStack Router internals | Convert the location query string to JSON-like values, validate them, and expose typed route state | TanStack Router already does the raw parsing. Do not add `URLSearchParams` here. |
| Browser URL validation | `offer-search.ts` and `router.tsx` | Convert untrusted router search input to resilient, typed `OfferSearchQuery` state | Correct behavior, but unnecessarily hand-written for Zod 4. |
| Browser URL reading/writing | `search-page.tsx` | Read validated state and navigate with typed updates | Already uses typed TanStack Router APIs. A route API and functional updates would follow the docs more closely. |
| API request serialization | `offers.query.ts` | Convert the typed server filters into `/api/offers?...` | `URLSearchParams` is appropriate; this is a different URL boundary from routing. |
| Server-data cache | `offers.query.ts`, `search.query-keys.ts` | Keep the query key and fetch function together and cache each distinct server request | `queryOptions` is the recommended pattern. The key/request currently include presentation-only `view`. |

TanStack Router deliberately parses a browser query string into structured JSON before `validateSearch` runs. It supports arrays and nested values beyond the platform's string-only API, then expects validation because the values still came from untrusted URL text. ([JSON-first search params](https://tanstack.com/router/latest/docs/guide/search-params#json-first-search-params), [validating and typing](https://tanstack.com/router/latest/docs/guide/search-params#validating-and-typing-search-params))

That warning against “just using `URLSearchParams`” applies to application state in the **router URL**. It does not mean `URLSearchParams` is forbidden when encoding a conventional outbound HTTP query such as repeated `q` fields for Fastify.

## Recommended validation shape

The application uses Zod `4.4.3`. Current TanStack guidance says Zod 4 schemas should be supplied directly:

```ts
validateSearch: offerRouteSearchSchema
```

`@tanstack/zod-adapter` is for Zod 3; it should not be added here. Zod 4 implements the Standard Schema input/output contract that Router consumes directly. The installed Router validator types also resolve Standard Schema input separately from output, which is what makes navigation inputs and validated route values type-safe.

Do **not** pass the current `offerSearchQuerySchema` directly without changing its behavior:

- `.strict()` rejects unknown URL keys, while the current route validator ignores them.
- An invalid value in one field rejects the whole object, while the current validator keeps the other valid fields.
- TanStack recommends sensible fallbacks for malformed search values so a bad URL does not interrupt the page, and shows Zod `.catch(...)` for that policy. ([validation fallback guidance](https://tanstack.com/router/latest/docs/guide/search-params#validating-search-params))

Prefer a dedicated route schema whose individual fields use `.catch(defaultValue)` and whose object strips unknown keys. It may reuse the shared schema's field definitions, but the route's recovery policy should remain distinct from the strict API contract. Then remove `validateOfferSearch` and pass that Zod 4 schema directly to `validateSearch`.

`stripSearchParams(defaultOfferSearchQuery)` is already an officially documented middleware for keeping default values out of generated URLs. It should remain. ([search middleware and `stripSearchParams`](https://tanstack.com/router/latest/docs/guide/search-params#transforming-search-with-search-middlewares))

## Reading and writing route state

`useSearch({ from: "/" })` and `useNavigate({ from: "/" })` are typed TanStack Router APIs, so the current component is not manually parsing the browser URL. TanStack specifically recommends supplying `from` for stronger type safety. Because this route component is code-split, the docs suggest `getRouteApi("/")` and `routeApi.useSearch()` as the route-local alternative. ([reading search params](https://tanstack.com/router/latest/docs/guide/search-params#search-params-in-components))

For updates, TanStack documents functional navigation:

```ts
navigate({
  replace: true,
  search: (previous) => ({ ...previous, ...patch }),
})
```

This avoids rebuilding the whole search object from a captured render value and preserves unrelated route state. The current `safeParse` before navigation is still useful where the UI must show a friendly error for user-entered constraints, such as the 20-term and 200-character limits; it is input feedback, not browser URL parsing. ([writing with `navigate({ search })`](https://tanstack.com/router/latest/docs/guide/search-params#usenavigate-navigate-search))

## Router + Query data loading

`offersQueryOptions` correctly uses `queryOptions` to colocate the query key and query function. TanStack recommends this because the same typed options can be reused by `useQuery`, `useSuspenseQuery`, and `queryClient` prefetch/ensure APIs. ([Query Options](https://tanstack.com/query/v5/docs/framework/react/guides/query-options))

The current component-level `useQuery` is valid, but it starts critical page data only after the component renders. TanStack Router recommends coordinating critical external data in a route loader to avoid a loading flash and request waterfalls:

1. Put the `QueryClient` in typed router context.
2. Select server-affecting validated search fields in `loaderDeps`.
3. Call `context.queryClient.ensureQueryData(offersQueryOptions(deps))` in the loader.
4. Read the same options with `useSuspenseQuery` in the component.

([External data loading](https://tanstack.com/router/v1/docs/guide/external-data-loading#using-loaders-to-ensure-data-is-loaded), [TanStack Query integration](https://tanstack.com/router/latest/docs/integrations/query#preload-with-a-loader-and-read-with-a-hook))

TanStack warns that loaders should receive search-driven inputs through `loaderDeps`, and that only values actually used to fetch data should be included. This makes navigation, preloading, and cache identity agree. ([search params through `loaderDeps`](https://tanstack.com/router/v1/docs/guide/data-loading#using-search-params-in-loaders))

For this route, the server result depends on:

- `q`
- `freshness`
- `stock`

`view` is presentation state. The database search ignores it, yet `offers.query.ts` sends it to the API and `searchQueryKeys.offers(query)` includes it in cache identity. Toggling “By Storefront” therefore creates a distinct cache entry and refetches identical server data. Derive a server-filter object without `view`, and use that same object for `loaderDeps`, the query key, and API serialization. Query's rule is that a key must contain every changing variable used by the query function; it need not contain values that do not affect the result. ([Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys#if-your-query-function-depends-on-a-variable-include-it-in-your-query-key))

## Recommended change order

1. Add a resilient Zod 4 route-search schema and pass it directly to `validateSearch`.
2. Keep `stripSearchParams` for defaults.
3. Replace the hand-written route validator, preserving its per-field recovery tests.
4. Separate server filters from presentation-only `view`; keep `URLSearchParams` for the API request encoder.
5. Add typed router context, `loaderDeps`, and `ensureQueryData` if initial offer data should block route rendering.
6. Reuse the query options in the page, preferably with `useSuspenseQuery` after loader prefetching.

## Verdict by file

- **`offers.query.ts`:** the concern is based on a naming/boundary mix-up. Its `URLSearchParams` is API serialization, not route parsing. Keep the mechanism, but stop sending `view`.
- **`offer-search.ts`:** replace the custom field parser with a dedicated resilient Zod 4 schema.
- **`router.tsx`:** pass that schema directly to `validateSearch`; its default-stripping middleware is already the right TanStack primitive. Add `loaderDeps`/loader only if adopting route-coordinated loading.
- **`search-page.tsx`:** current reads and navigation are typed. Prefer `getRouteApi` in the lazy component and functional search updates; retain explicit parsing where it provides form-validation feedback.

