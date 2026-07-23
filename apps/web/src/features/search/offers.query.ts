import {
  offerSearchResponseSchema,
  type OfferSearchQuery,
} from "@stockhawk/contracts";
import { queryOptions } from "@tanstack/react-query";

import { encodeOfferSearch } from "./offer-search-state.js";
import { searchQueryKeys } from "./search.query-keys.js";

const offerSearchUrl = (query: OfferSearchQuery) => {
  const parameters = encodeOfferSearch(query);
  const search = parameters.toString();
  return search === "" ? "/api/offers" : `/api/offers?${search}`;
};

export const offersQueryOptions = (query: OfferSearchQuery) =>
  queryOptions({
    queryFn: async () => {
      const response = await fetch(offerSearchUrl(query));
      if (!response.ok) {
        throw new Error(`Offer search failed with status ${response.status}`);
      }
      return offerSearchResponseSchema.parse(await response.json());
    },
    queryKey: searchQueryKeys.offers(query),
    refetchInterval: 60_000,
  });
