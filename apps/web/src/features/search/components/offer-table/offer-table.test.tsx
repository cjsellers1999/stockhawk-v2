import type { Offer } from "@stockhawk/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OfferTable } from "./offer-table.js";

afterEach(cleanup);

describe("Offer Storefront grouping", () => {
  it("keeps distinct durable Storefront identities in separate groups", () => {
    const firstOffer = {
      canonicalProductName: "Sky Dragon",
      imageUrl: null,
      lastCheckedAt: "2026-07-22T18:00:00.000Z",
      listingIdentity: "lst_first",
      listingPresence: "active",
      matchStatus: "confirmed",
      purchaseUrl: "https://fixture.stockhawk.test/first",
      rawTitle: "Sky Dragon — First",
      stockStatus: "in_stock",
      storefrontHostname: "fixture.stockhawk.test",
      storefrontIdentity: "stf_first",
      storefrontName: "Fixture Store",
      variant: "Medium",
    } satisfies Offer;
    const secondOffer = {
      ...firstOffer,
      listingIdentity: "lst_second",
      purchaseUrl: "https://fixture.stockhawk.test/second",
      rawTitle: "Sky Dragon — Second",
      storefrontIdentity: "stf_second",
    } satisfies Offer;

    render(
      <OfferTable
        data={[firstOffer, secondOffer]}
        failed={false}
        loading={false}
        view="storefront"
      />,
    );

    expect(screen.getAllByText("1 offer")).toHaveLength(2);
  });
});
