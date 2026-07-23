import {
  offerSearchResponseSchema,
  type OfferSearchQuery,
} from "@stockhawk/contracts";
import { queryOptions } from "@tanstack/react-query";

import { searchQueryKeys, type OfferQueryFilters } from "./search.query-keys";

const selectOfferQueryFilters = ({
  freshness,
  q,
  stock,
}: OfferSearchQuery): OfferQueryFilters => ({ freshness, q, stock });

const encodeOfferApiQuery = (query: OfferQueryFilters) => {
  const parameters = new URLSearchParams();
  for (const term of query.q) {
    parameters.append("q", term);
  }
  if (query.freshness !== "all") {
    parameters.set("freshness", query.freshness);
  }
  if (query.stock !== "all") {
    parameters.set("stock", query.stock);
  }
  return parameters;
};

const offerSearchUrl = (query: OfferQueryFilters) => {
  const parameters = encodeOfferApiQuery(query);
  const search = parameters.toString();
  return search === "" ? "/api/offers" : `/api/offers?${search}`;
};

export const offersQueryOptions = (query: OfferSearchQuery) => {
  const filters = selectOfferQueryFilters(query);

  return queryOptions({
    queryFn: async () => {
      const response = await fetch(offerSearchUrl(filters));
      if (!response.ok) {
        throw new Error(`Offer search failed with status ${response.status}`);
      }
      return offerSearchResponseSchema.parse(await response.json());
    },
    queryKey: searchQueryKeys.offers(filters),
    refetchInterval: 60_000,
  });
};
