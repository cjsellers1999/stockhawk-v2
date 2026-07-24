import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppRouter } from "../../router";
import { ThemeProvider } from "../shell/theme-provider";

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

const requestUrl = (input: Parameters<typeof fetch>[0]) => {
  if (typeof input === "string") {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
};

const renderSearchPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: ["/"] }),
  );
  const view = render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return { ...view, router };
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("Offer search table", () => {
  it("renders the authoritative Offer hierarchy and exact Purchase Handoff", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = requestUrl(input);
      let body: unknown = {
        api: "ready",
        database: "ready",
        worker: "ready",
      };
      if (url.startsWith("/api/offers")) {
        body = searchResult;
      }
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { router } = renderSearchPage();

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
    expect(fetchMock).toHaveBeenCalledWith("/api/offers", { method: "GET" });

    const user = userEvent.setup();
    await user.type(
      screen.getByRole("searchbox", {
        name: "Match any product, retailer, or URL",
      }),
      "Sky Dragon{Enter}",
    );
    await user.selectOptions(screen.getByLabelText("Stock status"), "in_stock");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/offers?q=Sky+Dragon&stock=in_stock",
        { method: "GET" },
      );
    });
    const offerRequestCount = fetchMock.mock.calls.filter(([input]) =>
      requestUrl(input).startsWith("/api/offers"),
    ).length;

    await user.click(screen.getByRole("button", { name: "By Storefront" }));

    await waitFor(() => {
      expect(router.state.location.search).toEqual({
        q: ["Sky Dragon"],
        stock: "in_stock",
        view: "storefront",
      });
    });
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        requestUrl(input).startsWith("/api/offers"),
      ),
    ).toHaveLength(offerRequestCount);
    expect(router.state.location.search).toEqual({
      q: ["Sky Dragon"],
      stock: "in_stock",
      view: "storefront",
    });
    expect(
      router.state.matches.find((match) => match.routeId === "/")?.search,
    ).toEqual({
      freshness: "all",
      q: ["Sky Dragon"],
      stock: "in_stock",
      view: "storefront",
    });
    for (const searchLink of screen.getAllByRole("link", { name: "Search" })) {
      expect(searchLink).toHaveAttribute("aria-current", "page");
    }
    expect(
      screen.getByRole("button", { name: "Remove Sky Dragon" }),
    ).toBeInTheDocument();
  });

  it("keeps invalid search terms editable and explains the limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(searchResult), {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
        ),
      ),
    );
    const { router } = renderSearchPage();
    const user = userEvent.setup();
    const searchbox = await screen.findByRole("searchbox", {
      name: "Match any product, retailer, or URL",
    });
    const oversizedTerm = "x".repeat(201);

    await user.type(searchbox, `${oversizedTerm}{Enter}`);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use up to 20 search terms, each 200 characters or fewer.",
    );
    expect(searchbox).toHaveValue(oversizedTerm);
    expect(router.state.location.search).toEqual({});
  });
});
