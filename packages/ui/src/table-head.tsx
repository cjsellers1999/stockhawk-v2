import type { ComponentProps } from "react";

import { cn } from "./cn";

export const TableHead = ({ className, ...props }: ComponentProps<"th">) => (
  <th
    className={cn(
      "h-10 px-2 text-left align-middle text-label whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
      className,
    )}
    data-slot="table-head"
    {...props}
  />
);
