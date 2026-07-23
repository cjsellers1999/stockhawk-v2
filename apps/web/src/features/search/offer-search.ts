import { offerSearchQuerySchema } from "@stockhawk/contracts";

export const defaultOfferSearchQuery = offerSearchQuerySchema.parse({});

export const offerRouteSearchSchema = offerSearchQuerySchema
  .extend({
    freshness: offerSearchQuerySchema.shape.freshness.catch(
      defaultOfferSearchQuery.freshness,
    ),
    q: offerSearchQuerySchema.shape.q.catch(defaultOfferSearchQuery.q),
    stock: offerSearchQuerySchema.shape.stock.catch(
      defaultOfferSearchQuery.stock,
    ),
    view: offerSearchQuerySchema.shape.view.catch(defaultOfferSearchQuery.view),
  })
  .strip();
