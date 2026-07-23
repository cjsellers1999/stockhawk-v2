import { Menu } from "@base-ui/react/menu";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";

import { Button } from "./button";

type ThemeMenuProps = {
  dark: boolean;
  onThemeChange: (dark: boolean) => void;
};

export const ThemeMenu = ({ dark, onThemeChange }: ThemeMenuProps) => {
  const [open, setOpen] = useState(false);
  const label = dark ? "Use light theme" : "Use dark theme";

  return (
    <Menu.Root onOpenChange={setOpen} open={open}>
      <Menu.Trigger
        render={
          <Button
            aria-label={label}
            onClick={() => setOpen(true)}
            variant="ghost"
          />
        }
      >
        {dark ? (
          <Sun aria-hidden="true" size={16} />
        ) : (
          <Moon aria-hidden="true" size={16} />
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          align="end"
          className="z-20 outline-none"
          sideOffset={6}
        >
          <Menu.Popup className="min-w-32 rounded-md border border-border bg-card p-1 text-card-foreground shadow-sm focus:outline-none">
            <Menu.Item
              className="cursor-default rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent"
              onClick={() => onThemeChange(!dark)}
            >
              {label}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};
