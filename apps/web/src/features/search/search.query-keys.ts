import type { OfferSearchQuery } from "@stockhawk/contracts";

export const searchQueryKeys = {
  all: ["search"] as const,
  offers: (query: OfferSearchQuery) =>
    [...searchQueryKeys.all, "offers", query] as const,
};
