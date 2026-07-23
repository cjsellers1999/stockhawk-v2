import type { Offer } from "@stockhawk/contracts";
import { useState } from "react";

import styles from "./offer-table.module.css";

const checkedAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const freshnessTargetMinutes = (status: Offer["stockStatus"]) =>
  status === "in_stock" || status === "preorder" ? 60 : 15;

const ageLabel = (ageMinutes: number) => {
  if (ageMinutes < 1) {
    return "just now";
  }
  if (ageMinutes < 60) {
    return `${ageMinutes} min ago`;
  }
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) {
    return `${ageHours} hr ago`;
  }
  const ageDays = Math.floor(ageHours / 24);
  return `${ageDays} day${ageDays === 1 ? "" : "s"} ago`;
};

export const OfferFreshness = ({ offer }: { offer: Offer }) => {
  const [renderedAt] = useState(() => Date.now());
  const checkedAt = new Date(offer.lastCheckedAt);
  const ageMinutes = Math.max(
    0,
    Math.floor((renderedAt - checkedAt.getTime()) / 60_000),
  );
  const targetMinutes = freshnessTargetMinutes(offer.stockStatus);
  const stale = ageMinutes > targetMinutes;

  return (
    <div className={`${styles.fresh} ${stale ? "text-warning" : ""}`}>
      <time
        dateTime={offer.lastCheckedAt}
        title={checkedAtFormatter.format(checkedAt)}
      >
        {ageLabel(ageMinutes)}
      </time>
      <span className={`${styles.freshDetail} text-muted-foreground`}>
        {stale
          ? "Overdue · prior status retained"
          : `Target ${targetMinutes} min`}
      </span>
    </div>
  );
};
