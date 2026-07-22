import { useState, type KeyboardEvent } from "react";
import type { UrlState } from "../../stockhawk.types";

interface SearchToolbarProps {
  state: UrlState;
  updateState: (changes: Partial<UrlState>) => void;
}

function uniqueChips(chips: string[]): string[] {
  return Array.from(new Set(chips.map((chip) => chip.trim()).filter(Boolean)));
}

export function SearchToolbar({ state, updateState }: SearchToolbarProps) {
  const [draft, setDraft] = useState("");

  function addDraftChips(): void {
    const nextChips = uniqueChips([...state.chips, ...draft.split(",")]);
    if (nextChips.length === state.chips.length) return;
    updateState({ chips: nextChips, pageNumber: 1 });
    setDraft("");
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addDraftChips();
  }

  function removeChip(chipToRemove: string): void {
    updateState({
      chips: state.chips.filter((chip) => chip !== chipToRemove),
      pageNumber: 1,
    });
  }

  return (
    <div className="search-controls" aria-label="Search and filters">
      <div className="query-line">
        <span className="search-icon" aria-hidden="true">
          ⌕
        </span>
        <div className="chip-input">
          {state.chips.map((chip) => (
            <span className="query-chip" key={chip}>
              {chip}
              <button type="button" onClick={() => removeChip(chip)} aria-label={`Remove ${chip}`}>
                ×
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={addDraftChips}
            placeholder={state.chips.length > 0 ? "Add another…" : "Products, retailer, or site URL…"}
            aria-label="Search products, retailers, or site URLs"
          />
        </div>
        <span className="match-any-label">MATCH ANY</span>
      </div>

      <div className="filter-line">
        <label>
          Stock
          <select
            value={state.stock}
            onChange={(event) =>
              updateState({ stock: event.target.value as UrlState["stock"], pageNumber: 1 })
            }
          >
            <option value="all">All statuses</option>
            <option value="in stock">In stock</option>
            <option value="out of stock">Out of stock</option>
            <option value="preorder">Preorder</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>
          Match
          <select
            value={state.match}
            onChange={(event) =>
              updateState({ match: event.target.value as UrlState["match"], pageNumber: 1 })
            }
          >
            <option value="all">All matches</option>
            <option value="confirmed">Confirmed</option>
            <option value="provisional">Provisional</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={state.includeHistorical}
            onChange={(event) =>
              updateState({ includeHistorical: event.target.checked, pageNumber: 1 })
            }
          />
          Historical
        </label>
        <span className="control-divider" />
        <div className="segmented" aria-label="Result view">
          <button
            type="button"
            className={state.view === "flat" ? "active" : ""}
            onClick={() => updateState({ view: "flat", pageNumber: 1 })}
          >
            Flat
          </button>
          <button
            type="button"
            className={state.view === "store" ? "active" : ""}
            onClick={() => updateState({ view: "store", pageNumber: 1 })}
          >
            By store
          </button>
        </div>
        <span className="url-saved">Saved in URL</span>
      </div>
    </div>
  );
}
