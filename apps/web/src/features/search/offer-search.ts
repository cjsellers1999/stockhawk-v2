import {
  offerSearchQuerySchema,
  type OfferSearchQuery,
} from "@stockhawk/contracts";

export const defaultOfferSearchQuery = offerSearchQuerySchema.parse({});

type SearchFieldSchema<Output> = {
  safeParse: (
    value: unknown,
  ) => { data: Output; success: true } | { success: false };
};

const parseSearchField = <Output>({
  fallback,
  schema,
  value,
}: {
  fallback: Output;
  schema: SearchFieldSchema<Output>;
  value: unknown;
}): Output => {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
};

export const validateOfferSearch = (
  search: Record<string, unknown>,
): OfferSearchQuery => ({
  freshness: parseSearchField({
    fallback: defaultOfferSearchQuery.freshness,
    schema: offerSearchQuerySchema.shape.freshness,
    value: search.freshness,
  }),
  match: parseSearchField({
    fallback: defaultOfferSearchQuery.match,
    schema: offerSearchQuerySchema.shape.match,
    value: search.match,
  }),
  q: parseSearchField({
    fallback: defaultOfferSearchQuery.q,
    schema: offerSearchQuerySchema.shape.q,
    value: search.q,
  }),
  stock: parseSearchField({
    fallback: defaultOfferSearchQuery.stock,
    schema: offerSearchQuerySchema.shape.stock,
    value: search.stock,
  }),
  view: parseSearchField({
    fallback: defaultOfferSearchQuery.view,
    schema: offerSearchQuerySchema.shape.view,
    value: search.view,
  }),
});
