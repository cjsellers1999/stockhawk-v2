import type { ComponentProps } from "react";

import { cn } from "./cn";

type BadgeProps = ComponentProps<"span"> & {
  dot?: boolean;
};

export const Badge = ({
  children,
  className,
  dot = false,
  ...props
}: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.25 rounded-sm border border-transparent px-2 py-0.5 text-2xs font-ui-strong whitespace-nowrap",
      className,
    )}
    {...props}
  >
    {dot ? (
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
    ) : null}
    {children}
  </span>
);
