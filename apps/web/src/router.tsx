import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  stripSearchParams,
  type RouterHistory,
} from "@tanstack/react-router";

import { App } from "./app.js";
import { HealthPage } from "./features/health/health-page.js";
import {
  defaultOfferSearchQuery,
  validateOfferSearch,
} from "./features/search/offer-search.js";

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: () => <p>Page not found.</p>,
});

const searchRoute = createRoute({
  component: lazyRouteComponent(
    () => import("./features/search/search-page.js"),
    "SearchPage",
  ),
  getParentRoute: () => rootRoute,
  path: "/",
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
