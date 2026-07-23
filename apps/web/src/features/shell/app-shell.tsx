import type { Readiness } from "@stockhawk/contracts";
import { cn } from "@stockhawk/ui/cn";
import { ThemeMenu } from "@stockhawk/ui/theme-menu";
import { Link } from "@tanstack/react-router";
import { Activity, Search } from "lucide-react";
import type { ReactNode } from "react";

import { defaultOfferSearchQuery } from "../search/offer-search";

type Destination = "health" | "search";

type AppShellProps = {
  children: ReactNode;
  dark: boolean;
  onThemeChange: (dark: boolean) => void;
  readiness: Readiness | undefined;
  readinessFailed: boolean;
};

type NavigationLinkProps = {
  compact?: boolean;
  destination: Destination;
  label: string;
};

const NavigationLink = ({
  compact = false,
  destination,
  label,
}: NavigationLinkProps) => {
  const Icon = destination === "search" ? Search : Activity;
  const className = cn(
    "items-center rounded-control text-muted-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground",
    compact
      ? "inline-flex p-2"
      : "flex gap-3 px-3 py-2.25 font-semibold no-underline hover:bg-accent hover:text-foreground",
  );
  const content = (
    <>
      <Icon aria-hidden="true" size={16} />
      <span className={compact ? "sr-only" : undefined}>{label}</span>
    </>
  );

  return destination === "search" ? (
    <Link
      activeOptions={{ exact: true, includeSearch: false }}
      aria-label={compact ? label : undefined}
      className={className}
      search={defaultOfferSearchQuery}
      to="/"
    >
      {content}
    </Link>
  ) : (
    <Link
      aria-label={compact ? label : undefined}
      className={className}
      to="/health"
    >
      {content}
    </Link>
  );
};

export const AppShell = ({
  children,
  dark,
  onThemeChange,
  readiness,
  readinessFailed,
}: AppShellProps) => (
  <div className="flex min-h-screen max-mobile:block">
    <aside className="flex min-h-screen w-56 basis-56 flex-col border-r border-border bg-sidebar max-mobile:sticky max-mobile:top-0 max-mobile:z-10 max-mobile:h-14.5 max-mobile:min-h-0 max-mobile:w-auto max-mobile:basis-auto max-mobile:flex-row max-mobile:items-center max-mobile:border-r-0 max-mobile:border-b">
      <div className="flex h-15.5 items-center gap-2.25 border-b border-border px-4 text-lg font-bold max-mobile:h-14.5 max-mobile:border-b-0">
        <svg
          aria-hidden="true"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M16 7h.01M3.4 18H12a8 8 0 0 0 8-8V7l1.8-2.4-3.3.6A8 8 0 0 0 5 11v1c0 1.7-.7 3.3-2 4.5L1.8 18H5v3" />
        </svg>
        <span className="max-compact:hidden">StockHawk</span>
      </div>
      <nav aria-label="Primary" className="grid gap-1 p-2 max-mobile:hidden">
        <NavigationLink destination="search" label="Search" />
        <NavigationLink destination="health" label="Health" />
      </nav>
      <div className="ml-auto hidden items-center gap-1 pr-2.5 max-mobile:flex">
        <NavigationLink compact destination="search" label="Search" />
        <NavigationLink compact destination="health" label="Health" />
        <ThemeMenu dark={dark} onThemeChange={onThemeChange} />
      </div>
      <div className="mt-auto px-4 pt-3 pb-4 text-xs text-muted-foreground max-mobile:hidden">
        Private owner application
        <br />
        StockHawk V1
      </div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="flex h-15.5 items-center justify-end gap-2 border-b border-border px-6 max-mobile:hidden">
        <div
          aria-label="Service readiness"
          className="flex gap-2 text-xs text-muted-foreground"
        >
          <span>
            API{" "}
            {readiness?.api ?? (readinessFailed ? "unavailable" : "checking")}
          </span>
          <span>
            Database{" "}
            {readiness?.database ??
              (readinessFailed ? "unavailable" : "checking")}
          </span>
          <span>
            Worker{" "}
            {readiness?.worker ??
              (readinessFailed ? "unavailable" : "checking")}
          </span>
        </div>
        <ThemeMenu dark={dark} onThemeChange={onThemeChange} />
      </header>
      <main className="mx-auto max-w-stockhawk p-6 max-mobile:px-3.5 max-mobile:py-4.5">
        {children}
      </main>
    </div>
  </div>
);
