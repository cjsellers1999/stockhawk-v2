import type { ComponentProps } from "react";

import { cn } from "./cn";

export const Table = ({ className, ...props }: ComponentProps<"table">) => (
  <div className="relative w-full overflow-x-auto" data-slot="table-container">
    <table
      className={cn("w-full caption-bottom text-body", className)}
      data-slot="table"
      {...props}
    />
  </div>
);
