import { applyUrlStateChanges } from "./use-url-state";
import type { UrlState } from "./stockhawk.types";

const state: UrlState = {
  variant: "A",
  page: "search",
  theme: "light",
  view: "flat",
  chips: ["Sky Dragon"],
  stock: "all",
  match: "all",
  includeHistorical: false,
  pageNumber: 1,
  healthFilter: "all",
  selectedOfferId: "sky-large-little-tulips",
  selectedStoreId: "tiny-hanger",
};

describe("applyUrlStateChanges", () => {
  it("preserves the state reference for a no-op pagination reset", () => {
    expect(applyUrlStateChanges(state, { pageNumber: 1 })).toBe(state);
    expect(applyUrlStateChanges(state, { chips: ["Sky Dragon"] })).toBe(state);
  });

  it("creates new state for a real change", () => {
    expect(applyUrlStateChanges(state, { pageNumber: 2 })).toEqual({
      ...state,
      pageNumber: 2,
    });
  });
});
