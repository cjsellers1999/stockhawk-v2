import type { Offer } from "@stockhawk/contracts";

import styles from "./offer-badge.module.css";

const presentationByStatus: Record<
  Offer["stockStatus"],
  { className: string; label: string }
> = {
  in_stock: {
    className: "bg-success-background text-success",
    label: "In stock",
  },
  out_of_stock: {
    className: "bg-danger-background text-danger",
    label: "Out of stock",
  },
  preorder: {
    className: "bg-information-background text-information",
    label: "Preorder",
  },
  unknown: {
    className: "bg-secondary text-muted-foreground",
    label: "Unknown",
  },
};

export const StockBadge = ({ status }: { status: Offer["stockStatus"] }) => {
  const presentation = presentationByStatus[status];

  return (
    <span
      className={`${styles.badge} inline-flex items-center ${presentation.className}`}
    >
      <span aria-hidden="true" className={`${styles.dot} bg-current`} />
      {presentation.label}
    </span>
  );
};
