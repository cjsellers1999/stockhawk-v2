import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchPage } from "./search-page.js";

const searchResult = {
  items: [
    {
      canonicalProductName: "Sky Dragon",
      imageUrl: null,
      lastCheckedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
      listingIdentity: "lst_stockhawk_synthetic_offer_v1",
      listingPresence: "active",
      matchStatus: "confirmed",
      purchaseUrl: "https://fixture.stockhawk.test/products/sky-dragon-medium",
      rawTitle: "Sky Dragon — Medium",
      stockStatus: "in_stock",
      storefrontHostname: "fixture.stockhawk.test",
      storefrontIdentity: "stf_fixture_store",
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
    window.history.replaceState({}, "", "/");
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
    expect(within(offerRow).getByText("4 min ago")).toBeInTheDocument();
    expect(within(offerRow).getByText("Target 60 min")).toBeInTheDocument();
    expect(
      within(offerRow).getByLabelText(
        "No image available for Sky Dragon — Medium",
      ),
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

    const user = userEvent.setup();
    await user.type(
      screen.getByRole("searchbox", {
        name: "Match any product, retailer, or URL",
      }),
      "Sky Dragon{Enter}",
    );
    await user.selectOptions(screen.getByLabelText("Stock status"), "in_stock");
    await user.click(screen.getByRole("button", { name: "By Storefront" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/offers?q=Sky+Dragon&stock=in_stock&view=storefront",
      );
    });
    expect(window.location.search).toBe(
      "?q=Sky+Dragon&stock=in_stock&view=storefront",
    );
    expect(
      screen.getByRole("button", { name: "Remove Sky Dragon" }),
    ).toBeInTheDocument();
  });
});
