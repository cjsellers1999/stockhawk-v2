import type { Offer } from "@stockhawk/contracts";

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
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${presentation.className}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {presentation.label}
    </span>
  );
};
