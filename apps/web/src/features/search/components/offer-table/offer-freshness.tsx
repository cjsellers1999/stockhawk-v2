import type { Offer } from "@stockhawk/contracts";
import { useEffect, useState } from "react";

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
  const [renderedAt, setRenderedAt] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(
      () => setRenderedAt(Date.now()),
      60_000,
    );
    return () => window.clearInterval(interval);
  }, []);
  const checkedAt = new Date(offer.lastCheckedAt);
  const ageMilliseconds = Math.max(0, renderedAt - checkedAt.getTime());
  const ageMinutes = Math.floor(ageMilliseconds / 60_000);
  const targetMinutes = freshnessTargetMinutes(offer.stockStatus);
  const stale = ageMilliseconds > targetMinutes * 60_000;

  return (
    <div
      className={`text-caption whitespace-nowrap ${stale ? "text-warning" : ""}`}
    >
      <time
        dateTime={offer.lastCheckedAt}
        title={checkedAtFormatter.format(checkedAt)}
      >
        {ageLabel(ageMinutes)}
      </time>
      <span className="block text-caption text-muted-foreground">
        {stale
          ? "Overdue · prior status retained"
          : `Target ${targetMinutes} min`}
      </span>
    </div>
  );
};
