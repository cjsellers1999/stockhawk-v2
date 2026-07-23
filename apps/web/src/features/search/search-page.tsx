import type { Offer } from "@stockhawk/contracts";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";

import { Button } from "../../components/ui/button.js";
import { OfferTable } from "./components/offer-table/offer-table.js";
import { offersQueryOptions } from "./offers.query.js";

const noOffers: Offer[] = [];

const offerCountLabel = (count: number) =>
  `${count.toLocaleString("en-US")} ${count === 1 ? "offer" : "offers"}`;

export const SearchPage = () => {
  const offersQuery = useQuery(offersQueryOptions);
  const offers = offersQuery.data?.items ?? noOffers;
  const total = offersQuery.data?.total ?? 0;

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
        <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold">
          {offerCountLabel(total)}
        </span>
      </div>

      <div className="mb-3 flex gap-3 max-sm:flex-col">
        <label className="flex min-h-10 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <PackageSearch
            aria-hidden="true"
            className="text-muted-foreground"
            size={16}
          />
          <span className="sr-only">Match any product, retailer, or URL</span>
          <input
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            placeholder="Add product, retailer, or URL…"
            type="search"
          />
        </label>
        <fieldset
          aria-label="View mode"
          className="inline-flex self-start rounded-md border border-input p-0.5"
        >
          <Button
            aria-pressed="true"
            className="h-8 rounded-sm border-transparent bg-secondary text-foreground"
            type="button"
          >
            Flat
          </Button>
          <Button
            aria-pressed="false"
            className="h-8 rounded-sm text-muted-foreground"
            type="button"
            variant="ghost"
          >
            By Storefront
          </Button>
        </fieldset>
      </div>

      <div className="mb-3 flex items-center gap-2 max-sm:flex-col max-sm:items-stretch">
        <select
          aria-label="Stock status"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          defaultValue="all"
        >
          <option value="all">All stock</option>
          <option value="in_stock">In stock</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="preorder">Preorder</option>
          <option value="unknown">Unknown</option>
        </select>
        <select
          aria-label="Match status"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          defaultValue="all"
        >
          <option value="all">Confirmed + Provisional</option>
          <option value="confirmed">Confirmed only</option>
          <option value="provisional">Provisional only</option>
        </select>
        <select
          aria-label="Freshness"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          defaultValue="all"
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
        />
        <div className="flex items-center justify-between border-t border-border px-3 py-2.5 text-xs text-muted-foreground">
          <span>
            Showing {offers.length.toLocaleString("en-US")} of{" "}
            {total.toLocaleString("en-US")} distinct offers
          </span>
          <nav aria-label="Pagination" className="flex gap-1">
            <Button
              aria-label="Previous page"
              className="h-8"
              disabled
              type="button"
              variant="ghost"
            >
              ‹
            </Button>
            <Button aria-current="page" className="h-8" type="button">
              1
            </Button>
            <Button
              aria-label="Next page"
              className="h-8"
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
