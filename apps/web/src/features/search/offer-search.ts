import {
  offerSearchQuerySchema,
  type OfferSearchQuery,
} from "@stockhawk/contracts";

export const defaultOfferSearchQuery = offerSearchQuerySchema.parse({});

export const validateOfferSearch = (
  search: Record<string, unknown>,
): OfferSearchQuery => {
  const result = offerSearchQuerySchema.safeParse(search);
  return result.success ? result.data : defaultOfferSearchQuery;
};
