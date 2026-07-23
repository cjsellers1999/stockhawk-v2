import type { ComponentProps } from "react";

import { cn } from "./cn";

export const TableHeader = ({
  className,
  ...props
}: ComponentProps<"thead">) => (
  <thead
    className={cn("[&_tr]:border-b", className)}
    data-slot="table-header"
    {...props}
  />
);
