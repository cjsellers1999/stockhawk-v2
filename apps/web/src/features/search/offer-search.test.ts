import { describe, expect, it } from "vitest";

import { validateOfferSearch } from "./offer-search";

describe("Offer route search validation", () => {
  it("preserves independently valid fields when another field is malformed", () => {
    expect(
      validateOfferSearch({
        q: "Sky Dragon",
        stock: "invented",
        unsupported: true,
        view: "storefront",
      }),
    ).toEqual({
      freshness: "all",
      q: ["Sky Dragon"],
      stock: "all",
      view: "storefront",
    });
  });
});
