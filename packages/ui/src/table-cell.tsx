import type { ComponentProps } from "react";

import { cn } from "./cn";

export const TableCell = ({ className, ...props }: ComponentProps<"td">) => (
  <td
    className={cn(
      "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
      className,
    )}
    data-slot="table-cell"
    {...props}
  />
);
