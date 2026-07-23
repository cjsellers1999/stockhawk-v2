import {
  offerSearchResponseSchema,
  type OfferSearchQuery,
} from "@stockhawk/contracts";
import { queryOptions } from "@tanstack/react-query";

import { searchQueryKeys } from "./search.query-keys.js";

const encodeOfferApiQuery = (query: OfferSearchQuery) => {
  const parameters = new URLSearchParams();
  for (const term of query.q) {
    parameters.append("q", term);
  }
  if (query.freshness !== "all") {
    parameters.set("freshness", query.freshness);
  }
  if (query.match !== "all") {
    parameters.set("match", query.match);
  }
  if (query.stock !== "all") {
    parameters.set("stock", query.stock);
  }
  if (query.view !== "flat") {
    parameters.set("view", query.view);
  }
  return parameters;
};

const offerSearchUrl = (query: OfferSearchQuery) => {
  const parameters = encodeOfferApiQuery(query);
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
