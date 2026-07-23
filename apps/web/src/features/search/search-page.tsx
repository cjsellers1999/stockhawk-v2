import type { Offer } from "@stockhawk/contracts";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "../../components/ui/button.js";
import badgeStyles from "./components/offer-badge.module.css";
import { OfferTable } from "./components/offer-table/offer-table.js";
import {
  decodeOfferSearch,
  encodeOfferSearch,
  updateOfferSearch,
} from "./offer-search-state.js";
import { offersQueryOptions } from "./offers.query.js";
import styles from "./search-page.module.css";

const noOffers: Offer[] = [];

const offerCountLabel = (count: number) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? "offer" : "offers"}`;

const initialSearch = () => decodeOfferSearch(window.location.search);

export const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState("");
  const offersQuery = useQuery(offersQueryOptions(searchQuery));
  const offers = offersQuery.data?.items ?? noOffers;
  const total = offersQuery.data?.total ?? 0;

  const commitSearch = (patch: Record<string, unknown>) => {
    const nextQuery = updateOfferSearch(searchQuery, patch);
    const parameters = encodeOfferSearch(nextQuery).toString();
    const nextUrl =
      parameters === ""
        ? window.location.pathname
        : `${window.location.pathname}?${parameters}`;
    window.history.replaceState(window.history.state, "", nextUrl);
    setSearchQuery(nextQuery);
  };

  const commitSearchInput = () => {
    const term = searchInput.trim();
    if (term === "") {
      return;
    }
    if (!searchQuery.q.includes(term)) {
      commitSearch({ q: [...searchQuery.q, term] });
    }
    setSearchInput("");
  };

  const addSearchTerm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    commitSearchInput();
  };

  const removeSearchTerm = (term: string) => {
    commitSearch({
      q: searchQuery.q.filter((candidate) => candidate !== term),
    });
  };

  return (
    <section aria-labelledby="search-title">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" id="search-title">
            Search offers
          </h1>
          <p className="mt-1 text-muted-foreground">
            Find distinct retailer listings and hand purchase off to the exact
            page.
          </p>
        </div>
        <span
          className={`${badgeStyles.badge} inline-flex items-center bg-secondary text-secondary-foreground`}
        >
          {offerCountLabel(total)}
        </span>
      </div>

      <form
        className="mb-3 flex gap-3 max-sm:flex-col"
        onSubmit={addSearchTerm}
      >
        <div
          className={`${styles.searchBox} flex flex-1 flex-wrap items-center border border-input bg-background`}
        >
          <PackageSearch
            aria-hidden="true"
            className="text-muted-foreground"
            size={16}
          />
          {searchQuery.q.map((term) => (
            <span
              className={`${styles.chip} inline-flex items-center bg-secondary whitespace-nowrap`}
              key={term}
            >
              {term}
              <button
                aria-label={`Remove ${term}`}
                className={`${styles.chipButton} cursor-pointer border-0 bg-transparent text-muted-foreground`}
                onClick={() => removeSearchTerm(term)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
          <label className="sr-only" htmlFor="offer-search-input">
            Match any product, retailer, or URL
          </label>
          <input
            className="min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            id="offer-search-input"
            onChange={(event) => setSearchInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitSearchInput();
              }
            }}
            placeholder="Add product, retailer, or URL…"
            type="search"
            value={searchInput}
          />
        </div>
        <fieldset
          aria-label="View mode"
          className={`${styles.segmented} inline-flex self-start border border-input bg-background`}
        >
          <Button
            aria-pressed={searchQuery.view === "flat"}
            className={`${styles.segmentedButton} ${searchQuery.view === "flat" ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground shadow-none"}`}
            onClick={() => commitSearch({ view: "flat" })}
            type="button"
            variant="ghost"
          >
            Flat
          </Button>
          <Button
            aria-pressed={searchQuery.view === "storefront"}
            className={`${styles.segmentedButton} ${searchQuery.view === "storefront" ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground shadow-none"}`}
            onClick={() => commitSearch({ view: "storefront" })}
            type="button"
            variant="ghost"
          >
            By Storefront
          </Button>
        </fieldset>
      </form>

      <div className="mb-4 flex items-center gap-2 max-sm:flex-col max-sm:items-stretch">
        <select
          aria-label="Stock status"
          className={`${styles.filterField} border border-input bg-background`}
          onChange={(event) =>
            commitSearch({ stock: event.currentTarget.value })
          }
          value={searchQuery.stock}
        >
          <option value="all">All stock</option>
          <option value="in_stock">In stock</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="preorder">Preorder</option>
          <option value="unknown">Unknown</option>
        </select>
        <select
          aria-label="Match status"
          className={`${styles.filterField} border border-input bg-background`}
          onChange={(event) =>
            commitSearch({ match: event.currentTarget.value })
          }
          value={searchQuery.match}
        >
          <option value="all">Confirmed + Provisional</option>
          <option value="confirmed">Confirmed only</option>
          <option value="provisional">Provisional only</option>
        </select>
        <select
          aria-label="Freshness"
          className={`${styles.filterField} border border-input bg-background`}
          onChange={(event) =>
            commitSearch({ freshness: event.currentTarget.value })
          }
          value={searchQuery.freshness}
        >
          <option value="all">All freshness</option>
          <option value="fresh">Fresh</option>
          <option value="stale">Stale</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground max-sm:ml-0">
          {total.toLocaleString("en-US")} {total === 1 ? "result" : "results"}
          {" · freshest first"}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <OfferTable
          data={offers}
          failed={offersQuery.isError}
          loading={offersQuery.isPending}
          view={searchQuery.view}
        />
        <div
          className={`${styles.tableFoot} flex items-center justify-between border-t border-border text-xs text-muted-foreground`}
        >
          <span>
            Showing {offers.length.toLocaleString("en-US")} of{" "}
            {total.toLocaleString("en-US")} distinct offers
          </span>
          <nav aria-label="Pagination" className="flex gap-1">
            <Button
              aria-label="Previous page"
              className={`${styles.pagerButton} h-8`}
              disabled
              type="button"
              variant="ghost"
            >
              ‹
            </Button>
            <Button
              aria-current="page"
              className={`${styles.pagerButton} h-8`}
              type="button"
            >
              1
            </Button>
            <Button
              aria-label="Next page"
              className={`${styles.pagerButton} h-8`}
              disabled
              type="button"
              variant="ghost"
            >
              ›
            </Button>
          </nav>
        </div>
      </div>
    </section>
  );
};
