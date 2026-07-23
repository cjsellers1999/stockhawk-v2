import type { ComponentProps } from "react";

import { cn } from "./cn";

export const TableRow = ({ className, ...props }: ComponentProps<"tr">) => (
  <tr
    className={cn(
      "border-b transition-colors hover:bg-muted/55 has-aria-expanded:bg-muted/55 data-[state=selected]:bg-muted",
      className,
    )}
    data-slot="table-row"
    {...props}
  />
);
