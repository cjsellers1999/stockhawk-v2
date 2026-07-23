import { PackageSearch } from "lucide-react";

import { Button } from "../../components/ui/button.js";

export const SearchPage = () => (
  <section aria-labelledby="search-title">
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold" id="search-title">
          Search offers
        </h1>
        <p className="mt-1 text-muted-foreground">
          Find Jellycat offers, then continue directly to the retailer.
        </p>
      </div>
      <span className="text-sm text-muted-foreground">0 offers</span>
    </div>
    <div className="mb-3 flex gap-3 max-sm:flex-col">
      <label className="flex min-h-10 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3">
        <PackageSearch
          aria-hidden="true"
          className="text-muted-foreground"
          size={16}
        />
        <span className="sr-only">Search products, retailers, and sites</span>
        <input
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder="Product, retailer, or site"
          type="search"
        />
      </label>
      <div
        aria-label="View"
        className="inline-flex self-start rounded-md border border-input p-0.5"
      >
        <Button className="h-8 rounded-sm bg-secondary" type="button">
          Flat
        </Button>
        <Button
          className="h-8 rounded-sm text-muted-foreground"
          type="button"
          variant="ghost"
        >
          By Storefront
        </Button>
      </div>
    </div>
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-3xl border-collapse text-left">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-3 py-2.5 font-semibold">Retailer listing</th>
            <th className="px-3 py-2.5 font-semibold">Storefront</th>
            <th className="px-3 py-2.5 font-semibold">Stock</th>
            <th className="px-3 py-2.5 font-semibold">Match</th>
            <th className="px-3 py-2.5 font-semibold">Last checked</th>
            <th className="px-3 py-2.5 font-semibold">
              <span className="sr-only">Retailer action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              className="px-3 py-8 text-center text-muted-foreground"
              colSpan={6}
            >
              No Offers yet. The verified skeleton is ready for the first
              Observation Batch.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
);
