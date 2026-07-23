import type { ComponentProps } from "react";

import { cn } from "./cn";

export const TableCaption = ({
  className,
  ...props
}: ComponentProps<"caption">) => (
  <caption
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    data-slot="table-caption"
    {...props}
  />
);
