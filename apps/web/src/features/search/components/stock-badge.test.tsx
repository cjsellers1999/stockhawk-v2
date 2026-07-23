import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StockBadge } from "./stock-badge.js";

afterEach(cleanup);

describe("Stock badge", () => {
  it("uses the locked neutral foreground for Unknown", () => {
    render(<StockBadge status="unknown" />);

    expect(screen.getByText("Unknown")).toHaveClass(
      "text-secondary-foreground",
    );
    expect(screen.getByText("Unknown")).not.toHaveClass(
      "text-muted-foreground",
    );
  });
});
