import type { Offer } from "@stockhawk/contracts";
import { Badge } from "@stockhawk/ui/badge";

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
    className: "bg-secondary text-secondary-foreground",
    label: "Unknown",
  },
};

export const StockBadge = ({ status }: { status: Offer["stockStatus"] }) => {
  const presentation = presentationByStatus[status];

  return (
    <Badge className={presentation.className} dot>
      {presentation.label}
    </Badge>
  );
};
