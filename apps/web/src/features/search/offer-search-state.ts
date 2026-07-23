import {
  offerSearchQuerySchema,
  type OfferSearchQuery,
} from "@stockhawk/contracts";

const defaultOfferSearchQuery = offerSearchQuerySchema.parse({});

export const decodeOfferSearch = (search: string): OfferSearchQuery => {
  const parameters = new URLSearchParams(search);
  const result = offerSearchQuerySchema.safeParse({
    freshness: parameters.get("freshness") ?? undefined,
    match: parameters.get("match") ?? undefined,
    q: parameters.getAll("q"),
    stock: parameters.get("stock") ?? undefined,
    view: parameters.get("view") ?? undefined,
  });
  return result.success ? result.data : defaultOfferSearchQuery;
};

export const encodeOfferSearch = (query: OfferSearchQuery) => {
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

export const updateOfferSearch = (
  query: OfferSearchQuery,
  patch: Record<string, unknown>,
) => offerSearchQuerySchema.parse({ ...query, ...patch });
