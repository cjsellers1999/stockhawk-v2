import type { Offer } from "@stockhawk/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OfferTable } from "./offer-table";

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

  it("omits a canonical label that duplicates the retailer title", () => {
    const offer = {
      canonicalProductName: "Sky Dragon",
      imageUrl: null,
      lastCheckedAt: "2026-07-22T18:00:00.000Z",
      listingIdentity: "lst_equal_title",
      listingPresence: "active",
      matchStatus: "confirmed",
      purchaseUrl: "https://fixture.stockhawk.test/equal-title",
      rawTitle: "Sky Dragon",
      stockStatus: "in_stock",
      storefrontHostname: "fixture.stockhawk.test",
      storefrontIdentity: "stf_fixture",
      storefrontName: "Fixture Store",
      variant: "Medium",
    } satisfies Offer;

    render(
      <OfferTable data={[offer]} failed={false} loading={false} view="flat" />,
    );

    expect(screen.getByText("Medium exact variant")).toBeInTheDocument();
    expect(
      screen.queryByText("Sky Dragon · Medium exact variant"),
    ).not.toBeInTheDocument();
  });
});
