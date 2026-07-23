import { Dialog } from "@base-ui/react/dialog";
import { Search, X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type CommandDialogProps = {
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export const CommandDialog = ({
  children,
  onOpenChange,
  open,
}: CommandDialogProps) => (
  <Dialog.Root onOpenChange={onOpenChange} open={open}>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-20 bg-foreground/20 backdrop-blur-xs transition-opacity" />
      <Dialog.Viewport className="fixed inset-0 z-20 flex items-start justify-center px-4 pt-24">
        <Dialog.Popup className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
          <Dialog.Title className="sr-only">Commands</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search StockHawk destinations and actions.
          </Dialog.Description>
          {children}
          <Dialog.Close
            aria-label="Close commands"
            className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X aria-hidden="true" size={16} />
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Viewport>
    </Dialog.Portal>
  </Dialog.Root>
);

export const CommandInput = ({
  className,
  ...props
}: ComponentProps<"input">) => (
  <label className="flex items-center gap-2 border-b border-border px-4">
    <Search aria-hidden="true" className="text-muted-foreground" size={16} />
    <span className="sr-only">Search commands</span>
    <input
      className={`h-12 min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted-foreground ${className ?? ""}`}
      type="search"
      {...props}
    />
  </label>
);

export const CommandEmpty = ({ children, ...props }: ComponentProps<"p">) => (
  <p
    className="px-4 py-8 text-center text-body text-muted-foreground"
    {...props}
  >
    {children}
  </p>
);

export const CommandItem = ({
  children,
  ...props
}: ComponentProps<"button">) => (
  <button
    className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-body hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    type="button"
    {...props}
  >
    {children}
  </button>
);
