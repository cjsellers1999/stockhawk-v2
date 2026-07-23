import { offerSearchResponseSchema } from "@stockhawk/contracts";
import { queryOptions } from "@tanstack/react-query";

import { searchQueryKeys } from "./search.query-keys.js";

export const offersQueryOptions = queryOptions({
  queryFn: async () => {
    const response = await fetch("/api/offers");
    if (!response.ok) {
      throw new Error(`Offer search failed with status ${response.status}`);
    }
    return offerSearchResponseSchema.parse(await response.json());
  },
  queryKey: searchQueryKeys.offers(),
});
