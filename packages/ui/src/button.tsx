import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "./cn";

const buttonVariants = cva(
  "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-semibold whitespace-nowrap shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        ghost: "border-transparent bg-transparent shadow-none hover:bg-accent",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type ButtonProps = ComponentProps<typeof BaseButton> &
  VariantProps<typeof buttonVariants>;

export const Button = ({ className, variant, ...props }: ButtonProps) => (
  <BaseButton
    className={cn(buttonVariants({ variant }), className)}
    {...props}
  />
);
