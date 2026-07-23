import type { Offer } from "@stockhawk/contracts";
import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";

import { OfferThumbnail } from "../offer-thumbnail/offer-thumbnail.js";
import { StockBadge } from "../stock-badge.js";

export const offerTableFeatures = tableFeatures({});
const columnHelper = createColumnHelper<typeof offerTableFeatures, Offer>();
const checkedAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const freshnessTargetMinutes = (status: Offer["stockStatus"]) =>
  status === "in_stock" || status === "preorder" ? 60 : 15;

export const offerTableColumns = columnHelper.columns([
  columnHelper.accessor("rawTitle", {
    cell: ({ row }) => {
      const offer = row.original;
      return (
        <div className="flex min-w-64 items-center gap-3">
          <OfferThumbnail imageUrl={offer.imageUrl} rawTitle={offer.rawTitle} />
          <div className="min-w-0">
            <div className="font-semibold whitespace-normal">
              {offer.rawTitle}
            </div>
            <div className="mt-0.5 text-xs whitespace-normal text-muted-foreground">
              {offer.canonicalProductName} · {offer.variant} exact variant
            </div>
          </div>
        </div>
      );
    },
    header: "Retailer listing",
  }),
  columnHelper.accessor("storefrontName", {
    cell: ({ row }) => (
      <div>
        <div className="font-semibold">{row.original.storefrontName}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {row.original.storefrontHostname}
        </div>
      </div>
    ),
    header: "Storefront",
  }),
  columnHelper.accessor("stockStatus", {
    cell: ({ row }) => <StockBadge status={row.original.stockStatus} />,
    header: "Stock",
  }),
  columnHelper.accessor("matchStatus", {
    cell: () => (
      <span className="inline-flex rounded-full bg-secondary px-2 py-1 text-xs font-semibold">
        Confirmed
      </span>
    ),
    header: "Match",
  }),
  columnHelper.accessor("lastCheckedAt", {
    cell: ({ row }) => {
      const offer = row.original;
      return (
        <div>
          <time dateTime={offer.lastCheckedAt}>
            {checkedAtFormatter.format(new Date(offer.lastCheckedAt))}
          </time>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Target {freshnessTargetMinutes(offer.stockStatus)} min
          </div>
        </div>
      );
    },
    header: "Last checked",
  }),
  columnHelper.display({
    cell: ({ row }) => {
      const offer = row.original;
      const action = offer.stockStatus === "in_stock" ? "Buy" : "View";
      return (
        <a
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border border-input bg-background px-3 text-xs font-semibold shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          href={offer.purchaseUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {action}
          <ExternalLink aria-hidden="true" size={14} />
        </a>
      );
    },
    header: () => <span className="sr-only">Retailer action</span>,
    id: "purchase-handoff",
  }),
]);
