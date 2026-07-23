import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchPage } from "./search-page.js";

const searchResult = {
  items: [
    {
      canonicalProductName: "Sky Dragon",
      imageUrl: null,
      lastCheckedAt: "2026-07-23T01:00:00.000Z",
      listingIdentity: "lst_stockhawk_synthetic_offer_v1",
      matchStatus: "confirmed",
      purchaseUrl: "https://fixture.stockhawk.test/products/sky-dragon-medium",
      rawTitle: "Sky Dragon — Medium",
      stockStatus: "in_stock",
      storefrontHostname: "fixture.stockhawk.test",
      storefrontName: "StockHawk Fixture Store",
      variant: "Medium",
    },
  ],
  total: 1,
};

const renderSearchPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SearchPage />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Offer search table", () => {
  it("renders the authoritative Offer hierarchy and exact Purchase Handoff", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(searchResult), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderSearchPage();

    const offerRow = await screen.findByRole("row", {
      name: /Sky Dragon — Medium/,
    });
    expect(screen.getByText("1 offer")).toBeInTheDocument();
    expect(
      within(offerRow).getByText("Sky Dragon · Medium exact variant"),
    ).toBeInTheDocument();
    expect(
      within(offerRow).getByText("StockHawk Fixture Store"),
    ).toBeInTheDocument();
    expect(
      within(offerRow).getByText("fixture.stockhawk.test"),
    ).toBeInTheDocument();
    expect(within(offerRow).getByText("In stock")).toBeInTheDocument();
    expect(within(offerRow).getByText("Confirmed")).toBeInTheDocument();
    expect(within(offerRow).getByText("Target 60 min")).toBeInTheDocument();
    expect(
      within(offerRow).getByRole("img", {
        name: "No image available for Sky Dragon — Medium",
      }),
    ).toBeInTheDocument();
    expect(within(offerRow).getByRole("link", { name: /Buy/ })).toHaveAttribute(
      "href",
      "https://fixture.stockhawk.test/products/sky-dragon-medium",
    );
    expect(within(offerRow).getByRole("link", { name: /Buy/ })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/offers");
  });
});
