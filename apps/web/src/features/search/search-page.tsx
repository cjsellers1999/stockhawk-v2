import {
  offerSearchQuerySchema,
  type Offer,
  type OfferSearchQuery,
} from "@stockhawk/contracts";
import { Badge } from "@stockhawk/ui/badge";
import { Button } from "@stockhawk/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { PackageSearch } from "lucide-react";
import { useState, type FormEvent } from "react";

import { OfferTable } from "./components/offer-table/offer-table";
import { offersQueryOptions } from "./offers.query";

const noOffers: Offer[] = [];
const routeApi = getRouteApi("/");

const offerCountLabel = (count: number) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? "offer" : "offers"}`;

export const SearchPage = () => {
  const searchQuery = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [searchError, setSearchError] = useState<string>();
  const offersQuery = useQuery(offersQueryOptions(searchQuery));
  const offers = offersQuery.data?.items ?? noOffers;
  const total = offersQuery.data?.total ?? 0;

  const commitSearch = (patch: Partial<OfferSearchQuery>) => {
    const nextQuery = offerSearchQuerySchema.safeParse({
      ...searchQuery,
      ...patch,
    });
    if (!nextQuery.success) {
      setSearchError(
        "Use up to 20 search terms, each 200 characters or fewer.",
      );
      return false;
    }
    setSearchError(undefined);
    void navigate({
      replace: true,
      search: (previous) => ({ ...previous, ...patch }),
    });
    return true;
  };

  const commitSearchInput = () => {
    const term = searchInput.trim();
    if (term === "") {
      return;
    }
    if (!searchQuery.q.includes(term)) {
      if (!commitSearch({ q: [...searchQuery.q, term] })) {
        return;
      }
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
          <h1 className="text-heading-1" id="search-title">
            Search offers
          </h1>
          <p className="mt-1 text-muted-foreground">
            Find distinct retailer listings and hand purchase off to the exact
            page.
          </p>
        </div>
        <Badge className="bg-secondary text-secondary-foreground">
          {offerCountLabel(total)}
        </Badge>
      </div>

      <form
        className="mb-3 flex gap-3 max-sm:flex-col"
        onSubmit={addSearchTerm}
      >
        <div className="flex min-h-10.5 flex-1 flex-wrap items-center gap-2 rounded-md border border-input bg-background py-1.25 pr-2 pl-3 focus-within:outline-1 focus-within:outline-ring">
          <PackageSearch
            aria-hidden="true"
            className="text-muted-foreground"
            size={16}
          />
          {searchQuery.q.map((term) => (
            <span
              className="inline-flex items-center gap-1.25 rounded-sm bg-secondary px-1.75 py-0.75 text-caption whitespace-nowrap"
              key={term}
            >
              {term}
              <button
                aria-label={`Remove ${term}`}
                className="size-4 cursor-pointer border-0 bg-transparent p-0 text-muted-foreground"
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
            aria-describedby={
              searchError === undefined ? undefined : "offer-search-error"
            }
            aria-invalid={searchError === undefined ? undefined : true}
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
          className="inline-flex self-start rounded-md border border-input bg-background p-0.5"
        >
          <Button
            aria-pressed={searchQuery.view === "flat"}
            className={`h-7 rounded-sm border-0 px-2.5 text-label ${searchQuery.view === "flat" ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground shadow-none"}`}
            onClick={() => commitSearch({ view: "flat" })}
            type="button"
            variant="ghost"
          >
            Flat
          </Button>
          <Button
            aria-pressed={searchQuery.view === "storefront"}
            className={`h-7 rounded-sm border-0 px-2.5 text-label ${searchQuery.view === "storefront" ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground shadow-none"}`}
            onClick={() => commitSearch({ view: "storefront" })}
            type="button"
            variant="ghost"
          >
            By Storefront
          </Button>
        </fieldset>
      </form>
      {searchError === undefined ? null : (
        <p
          className="mb-3 text-body text-danger"
          id="offer-search-error"
          role="alert"
        >
          {searchError}
        </p>
      )}

      <div className="mb-4 flex items-center gap-2 max-sm:flex-col max-sm:items-stretch">
        <select
          aria-label="Stock status"
          className="h-8.5 rounded-sm border border-input bg-background py-0 pr-7 pl-2.5 text-caption"
          onChange={(event) =>
            commitSearch({
              stock: offerSearchQuerySchema.shape.stock.parse(
                event.currentTarget.value,
              ),
            })
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
          aria-label="Freshness"
          className="h-8.5 rounded-sm border border-input bg-background py-0 pr-7 pl-2.5 text-caption"
          onChange={(event) =>
            commitSearch({
              freshness: offerSearchQuerySchema.shape.freshness.parse(
                event.currentTarget.value,
              ),
            })
          }
          value={searchQuery.freshness}
        >
          <option value="all">All freshness</option>
          <option value="fresh">Fresh</option>
          <option value="stale">Stale</option>
        </select>
        <span className="ml-auto text-caption text-muted-foreground max-sm:ml-0">
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
        <div className="flex min-h-13.5 items-center justify-between gap-3 border-t border-border px-3 py-2.5 text-caption text-muted-foreground">
          <span>
            Showing {offers.length.toLocaleString("en-US")} of{" "}
            {total.toLocaleString("en-US")} distinct offers
          </span>
          {/* Ticket 2 returns every matching row; cursor controls are reserved by the locked design for the later pagination ticket. */}
          <nav aria-label="Pagination" className="flex gap-1">
            <Button
              aria-label="Previous page"
              className="size-8 p-0"
              disabled
              type="button"
              variant="ghost"
            >
              ‹
            </Button>
            <Button aria-current="page" className="size-8 p-0" type="button">
              1
            </Button>
            <Button
              aria-label="Next page"
              className="size-8 p-0"
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
