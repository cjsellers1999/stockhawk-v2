import { offerSearchQuerySchema } from "@stockhawk/contracts";
import { describe, expect, it } from "vitest";

import { offersQueryOptions } from "./offers.query";

describe("Offer query refresh", () => {
  it("refreshes server-derived freshness and ordering every minute", () => {
    const options = offersQueryOptions(offerSearchQuerySchema.parse({}));

    expect(options.refetchInterval).toBe(60_000);
  });
});
