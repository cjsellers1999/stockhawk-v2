import type { Offer } from "@stockhawk/contracts";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfferFreshness } from "./offer-freshness.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Offer freshness", () => {
  it("crosses the raw freshness deadline while the page remains open", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T19:00:00.000Z"));
    const offer = {
      canonicalProductName: "Sky Dragon",
      imageUrl: null,
      lastCheckedAt: "2026-07-22T18:00:30.000Z",
      listingIdentity: "lst_freshness",
      listingPresence: "active",
      matchStatus: "confirmed",
      purchaseUrl: "https://fixture.stockhawk.test/sky-dragon",
      rawTitle: "Sky Dragon — Medium",
      stockStatus: "in_stock",
      storefrontHostname: "fixture.stockhawk.test",
      storefrontIdentity: "stf_fixture_store",
      storefrontName: "Fixture Store",
      variant: "Medium",
    } satisfies Offer;

    render(<OfferFreshness offer={offer} />);
    expect(screen.getByText("Target 60 min")).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(60_000));

    expect(
      screen.getByText("Overdue · prior status retained"),
    ).toBeInTheDocument();
  });
});
