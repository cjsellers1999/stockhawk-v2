import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AppPage,
  MatchStatus,
  PrototypeVariant,
  ResultView,
  StockStatus,
  Theme,
  UrlState,
} from "./stockhawk.types";

const validVariants = new Set<PrototypeVariant>(["A", "B", "C"]);
const validStocks = new Set<"all" | StockStatus>([
  "all",
  "in stock",
  "out of stock",
  "preorder",
  "unknown",
]);
const validMatches = new Set<"all" | MatchStatus>(["all", "confirmed", "provisional"]);

function readEnum<T extends string>(
  value: string | null,
  validValues: ReadonlySet<T>,
  fallback: T,
): T {
  if (value && validValues.has(value as T)) return value as T;
  return fallback;
}

function readUrlState(): UrlState {
  const params = new URLSearchParams(window.location.search);
  const rawQuery = params.has("q") ? params.get("q") ?? "" : "Sky Dragon,Bartholomew Bear";
  const variant = readEnum(params.get("variant"), validVariants, "A");
  const page: AppPage = params.get("page") === "health" ? "health" : "search";
  const theme: Theme = params.get("theme") === "dark" ? "dark" : "light";
  const view: ResultView = params.get("view") === "store" ? "store" : "flat";
  const pageNumber = Math.max(1, Number(params.get("p") ?? "1") || 1);
  const selectedOfferId = params.get("offer") ?? "sky-large-little-tulips";
  const selectedStoreId = params.get("store") ?? "tiny-hanger";
  const healthValue = params.get("health");
  const validHealthValues = new Set<UrlState["healthFilter"]>([
    "all",
    "attention",
    "healthy",
    "dormant",
    "dead",
  ]);

  return {
    variant,
    page,
    theme,
    view,
    chips: rawQuery
      .split(",")
      .map((chip) => chip.trim())
      .filter(Boolean),
    stock: readEnum(params.get("stock"), validStocks, "all"),
    match: readEnum(params.get("match"), validMatches, "all"),
    includeHistorical: params.get("history") === "1",
    pageNumber,
    healthFilter: readEnum(healthValue, validHealthValues, "all"),
    selectedOfferId,
    selectedStoreId,
  };
}

function serializeUrlState(state: UrlState): URL {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  params.set("variant", state.variant);
  params.set("page", state.page);
  params.set("theme", state.theme);
  params.set("view", state.view);
  params.set("q", state.chips.join(","));
  params.set("stock", state.stock);
  params.set("match", state.match);
  params.set("history", state.includeHistorical ? "1" : "0");
  params.set("p", String(state.pageNumber));
  params.set("health", state.healthFilter);
  params.set("offer", state.selectedOfferId);
  params.set("store", state.selectedStoreId);

  return url;
}

const isSameUrlValue = (currentValue: unknown, nextValue: unknown): boolean => {
  if (Array.isArray(currentValue) && Array.isArray(nextValue)) {
    return (
      currentValue.length === nextValue.length &&
      currentValue.every((value, index) => value === nextValue[index])
    );
  }

  return Object.is(currentValue, nextValue);
};

export const applyUrlStateChanges = (
  currentState: UrlState,
  changes: Partial<UrlState>,
): UrlState => {
  const hasChange = Object.entries(changes).some(([key, value]) =>
    !isSameUrlValue(currentState[key as keyof UrlState], value),
  );

  if (!hasChange) return currentState;
  return { ...currentState, ...changes };
};

export function useUrlState(): [UrlState, (changes: Partial<UrlState>) => void] {
  const [state, setState] = useState<UrlState>(readUrlState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    function handlePopState(): void {
      const nextState = readUrlState();
      stateRef.current = nextState;
      setState(nextState);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const updateState = useCallback((changes: Partial<UrlState>): void => {
    const nextState = applyUrlStateChanges(stateRef.current, changes);
    if (nextState === stateRef.current) return;

    window.history.replaceState({}, "", serializeUrlState(nextState));
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  return [state, updateState];
}
