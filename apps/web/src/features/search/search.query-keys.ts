import type { OfferSearchQuery } from "@stockhawk/contracts";

export type OfferQueryFilters = Pick<
  OfferSearchQuery,
  "freshness" | "q" | "stock"
>;

export const searchQueryKeys = {
  all: ["search"] as const,
  offers: (filters: OfferQueryFilters) =>
    [...searchQueryKeys.all, "offers", filters] as const,
};
