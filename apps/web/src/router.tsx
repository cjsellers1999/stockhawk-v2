import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  stripSearchParams,
  type RouterHistory,
} from "@tanstack/react-router";

import { App } from "./app";
import { HealthPage } from "./features/health/health-page";
import {
  defaultOfferSearchQuery,
  validateOfferSearch,
} from "./features/search/offer-search";

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: () => <p>Page not found.</p>,
});

const searchRoute = createRoute({
  component: lazyRouteComponent(
    () => import("./features/search/search-page"),
    "SearchPage",
  ),
  getParentRoute: () => rootRoute,
  path: "/",
  pendingComponent: () => <p>Loading page…</p>,
  pendingMs: 0,
  search: {
    middlewares: [stripSearchParams(defaultOfferSearchQuery)],
  },
  validateSearch: validateOfferSearch,
});

const healthRoute = createRoute({
  component: HealthPage,
  getParentRoute: () => rootRoute,
  path: "/health",
});

const routeTree = rootRoute.addChildren([searchRoute, healthRoute]);

export const createAppRouter = (history?: RouterHistory) =>
  createRouter({
    defaultPreload: "intent",
    routeTree,
    ...(history === undefined ? {} : { history }),
  });

export const router = createAppRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
