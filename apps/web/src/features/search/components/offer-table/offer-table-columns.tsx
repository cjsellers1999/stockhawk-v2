import type { Offer } from "@stockhawk/contracts";
import { Badge } from "@stockhawk/ui/badge";
import { Thumbnail } from "@stockhawk/ui/thumbnail";
import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";

import { StockBadge } from "../stock-badge";
import { OfferFreshness } from "./offer-freshness";

export const offerTableFeatures = tableFeatures({});
const columnHelper = createColumnHelper<typeof offerTableFeatures, Offer>();

export const offerTableColumns = columnHelper.columns([
  columnHelper.accessor("rawTitle", {
    cell: ({ row }) => {
      const offer = row.original;
      const exactVariant = `${offer.variant} exact variant`;
      const secondaryLabel =
        offer.canonicalProductName === offer.rawTitle
          ? exactVariant
          : `${offer.canonicalProductName} · ${exactVariant}`;
      return (
        <div className="flex min-w-62.5 items-center gap-2.5">
          <Thumbnail
            fallbackAlt={`No image available for ${offer.rawTitle}`}
            imageAlt={`Retailer listing: ${offer.rawTitle}`}
            imageUrl={offer.imageUrl}
          />
          <div className="min-w-0">
            <div className="text-heading-6 whitespace-normal">
              {offer.rawTitle}
            </div>
            <div className="mt-0.75 text-caption whitespace-normal text-muted-foreground">
              {secondaryLabel}
            </div>
          </div>
        </div>
      );
    },
    header: "Retailer listing",
  }),
  columnHelper.accessor("storefrontName", {
    cell: ({ row }) => (
      <div className="min-w-36.25">
        <div className="text-heading-6">{row.original.storefrontName}</div>
        <div className="text-caption text-muted-foreground">
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
      <Badge className="bg-secondary text-secondary-foreground">
        Confirmed
      </Badge>
    ),
    header: "Match",
  }),
  columnHelper.accessor("lastCheckedAt", {
    cell: ({ row }) => <OfferFreshness offer={row.original} />,
    header: "Last checked",
  }),
  columnHelper.display({
    cell: ({ row }) => {
      const offer = row.original;
      const action =
        offer.listingPresence === "active" && offer.stockStatus === "in_stock"
          ? "Buy"
          : "View";
      return (
        <a
          className="inline-flex h-8 items-center justify-center gap-1.75 rounded-sm border border-input bg-background px-2.75 text-label shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
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
