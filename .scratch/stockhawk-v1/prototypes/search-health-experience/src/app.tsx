import { useEffect } from "react";
import { HealthPage } from "./features/health/health-page";
import { SearchPage } from "./features/search/search-page";
import type { PrototypeVariant, UrlState } from "./stockhawk.types";
import { useUrlState } from "./use-url-state";

const variantLabels: Record<PrototypeVariant, { name: string; description: string }> = {
  A: { name: "Compact ledger", description: "Maximum rows, all facts visible" },
  B: { name: "Table + inspector", description: "Scan rows, inspect one beside them" },
  C: { name: "Store outline", description: "Linear sections organized by store/state" },
};

export function App() {
  const [state, updateState] = useUrlState();

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.style.colorScheme = state.theme;
  }, [state.theme]);

  return (
    <div className="app-shell">
      <AppHeader state={state} updateState={updateState} />
      <PrototypeStrip state={state} updateState={updateState} />
      {state.page === "search" ? (
        <SearchPage state={state} updateState={updateState} />
      ) : (
        <HealthPage state={state} updateState={updateState} />
      )}
    </div>
  );
}

interface StateControlsProps {
  state: UrlState;
  updateState: (changes: Partial<UrlState>) => void;
}

function AppHeader({ state, updateState }: StateControlsProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">SH</span>
        <div>
          <strong>StockHawk</strong>
          <span>Jellycat finder</span>
        </div>
      </div>
      <nav aria-label="Primary">
        <button
          type="button"
          className={state.page === "search" ? "active" : ""}
          onClick={() => updateState({ page: "search" })}
        >
          Search
        </button>
        <button
          type="button"
          className={state.page === "health" ? "active" : ""}
          onClick={() => updateState({ page: "health" })}
        >
          Health
          <span className="attention-count">4</span>
        </button>
      </nav>
      <div className="header-actions">
        <span className="prototype-label">Throwaway prototype</span>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => updateState({ theme: state.theme === "light" ? "dark" : "light" })}
          aria-label={`Use ${state.theme === "light" ? "dark" : "light"} mode`}
        >
          <span aria-hidden="true">{state.theme === "light" ? "◐" : "☀"}</span>
          {state.theme === "light" ? "Dark" : "Light"}
        </button>
      </div>
    </header>
  );
}

function PrototypeStrip({ state, updateState }: StateControlsProps) {
  return (
    <aside className="prototype-strip" aria-label="Prototype variant">
      <div>
        <span>Choose a table direction</span>
        <small>Same behavior, different information hierarchy</small>
      </div>
      <div className="variant-options">
        {(Object.keys(variantLabels) as PrototypeVariant[]).map((variant) => (
          <button
            type="button"
            className={state.variant === variant ? "active" : ""}
            key={variant}
            onClick={() => updateState({ variant, pageNumber: 1 })}
          >
            <span>{variant}</span>
            <strong>{variantLabels[variant].name}</strong>
            <small>{variantLabels[variant].description}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}
