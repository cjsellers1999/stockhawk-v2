import { offerSearchQuerySchema } from "@stockhawk/contracts";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { offersQueryOptions } from "./offers.query";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Offer query refresh", () => {
  it("refreshes server-derived freshness and ordering every minute", () => {
    const options = offersQueryOptions(offerSearchQuerySchema.parse({}));

    expect(options.refetchInterval).toBe(60_000);
  });

  it("excludes presentation-only view state from the API and cache key", async () => {
    const flatQuery = offerSearchQuerySchema.parse({
      q: "Sky Dragon",
      stock: "in_stock",
    });
    const storefrontQuery = offerSearchQuerySchema.parse({
      ...flatQuery,
      view: "storefront",
    });
    const flatOptions = offersQueryOptions(flatQuery);
    const storefrontOptions = offersQueryOptions(storefrontQuery);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await new QueryClient().fetchQuery(storefrontOptions);

    expect(storefrontOptions.queryKey).toEqual(flatOptions.queryKey);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/offers?q=Sky+Dragon&stock=in_stock",
      { method: "GET" },
    );
  });
});
