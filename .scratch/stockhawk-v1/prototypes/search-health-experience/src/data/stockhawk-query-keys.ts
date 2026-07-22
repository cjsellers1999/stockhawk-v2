export const stockhawkQueryKeys = {
  all: ["stockhawk"] as const,
  offers: () => [...stockhawkQueryKeys.all, "offers"] as const,
  storefronts: () => [...stockhawkQueryKeys.all, "storefronts"] as const,
};
