import type { UrlState } from "../../stockhawk.types";
import { SearchTable } from "./search-table";
import { SearchToolbar } from "./search-toolbar";

interface SearchPageProps {
  state: UrlState;
  updateState: (changes: Partial<UrlState>) => void;
}

export function SearchPage({ state, updateState }: SearchPageProps) {
  return (
    <main className="page-content">
      <div className="page-title-line">
        <div>
          <p className="eyebrow">Morning shopping</p>
          <h1>Find Jellycat listings</h1>
        </div>
        <p>One row per retailer listing. Separate sizes and duplicate store listings stay separate.</p>
      </div>
      <SearchToolbar state={state} updateState={updateState} />
      <SearchTable state={state} variant={state.variant} updateState={updateState} />
    </main>
  );
}
