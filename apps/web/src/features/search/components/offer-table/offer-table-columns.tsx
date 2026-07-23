import type { Offer } from "@stockhawk/contracts";
import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";

import badgeStyles from "../offer-badge.module.css";
import { OfferThumbnail } from "../offer-thumbnail/offer-thumbnail.js";
import { StockBadge } from "../stock-badge.js";
import { OfferFreshness } from "./offer-freshness.js";
import styles from "./offer-table.module.css";

export const offerTableFeatures = tableFeatures({});
const columnHelper = createColumnHelper<typeof offerTableFeatures, Offer>();

export const offerTableColumns = columnHelper.columns([
  columnHelper.accessor("rawTitle", {
    cell: ({ row }) => {
      const offer = row.original;
      return (
        <div className={`${styles.product} flex items-center`}>
          <OfferThumbnail imageUrl={offer.imageUrl} rawTitle={offer.rawTitle} />
          <div className="min-w-0">
            <div className={`${styles.productTitle} whitespace-normal`}>
              {offer.rawTitle}
            </div>
            <div
              className={`${styles.canonical} whitespace-normal text-muted-foreground`}
            >
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
      <div className={styles.store}>
        <div className={styles.storeName}>{row.original.storefrontName}</div>
        <div className={`${styles.storeUrl} text-muted-foreground`}>
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
      <span
        className={`${badgeStyles.badge} inline-flex items-center bg-secondary text-secondary-foreground`}
      >
        Confirmed
      </span>
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
          className={`${styles.actionLink} inline-flex items-center justify-center border border-input bg-background shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none`}
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
