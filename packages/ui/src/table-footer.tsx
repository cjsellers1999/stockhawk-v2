import type { ComponentProps } from "react";

import { cn } from "./cn";

export const TableFooter = ({
  className,
  ...props
}: ComponentProps<"tfoot">) => (
  <tfoot
    className={cn(
      "border-t bg-muted/50 text-label [&>tr]:last:border-b-0",
      className,
    )}
    data-slot="table-footer"
    {...props}
  />
);
