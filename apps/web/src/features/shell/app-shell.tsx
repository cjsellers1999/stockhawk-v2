import type { Readiness } from "@stockhawk/contracts";
import { Activity, Search } from "lucide-react";
import type { ReactNode } from "react";

import { ThemeMenu } from "../../components/ui/theme-menu.js";
import styles from "./app-shell.module.css";

export type Destination = "health" | "search";

type AppShellProps = {
  children: ReactNode;
  dark: boolean;
  destination: Destination;
  onNavigate: (destination: Destination) => void;
  onThemeChange: (dark: boolean) => void;
  readiness: Readiness | undefined;
  readinessFailed: boolean;
};

type NavigationLinkProps = {
  compact?: boolean;
  current: boolean;
  destination: Destination;
  label: string;
  onNavigate: (destination: Destination) => void;
};

const NavigationLink = ({
  current,
  compact = false,
  destination,
  label,
  onNavigate,
}: NavigationLinkProps) => {
  const Icon = destination === "search" ? Search : Activity;
  const href = destination === "search" ? "/" : "/health";

  return (
    <a
      aria-label={compact ? label : undefined}
      aria-current={current ? "page" : undefined}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(destination);
      }}
    >
      <Icon aria-hidden="true" size={16} />
      <span className={compact ? styles.compactLabel : undefined}>{label}</span>
    </a>
  );
};

export const AppShell = ({
  children,
  dark,
  destination,
  onNavigate,
  onThemeChange,
  readiness,
  readinessFailed,
}: AppShellProps) => (
  <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <svg
          aria-hidden="true"
          className={styles.brandMark}
          viewBox="0 0 24 24"
        >
          <path d="M16 7h.01M3.4 18H12a8 8 0 0 0 8-8V7l1.8-2.4-3.3.6A8 8 0 0 0 5 11v1c0 1.7-.7 3.3-2 4.5L1.8 18H5v3" />
        </svg>
        <span className={styles.brandWordmark}>StockHawk</span>
      </div>
      <nav aria-label="Primary" className={styles.navigation}>
        <NavigationLink
          current={destination === "search"}
          destination="search"
          label="Search"
          onNavigate={onNavigate}
        />
        <NavigationLink
          current={destination === "health"}
          destination="health"
          label="Health"
          onNavigate={onNavigate}
        />
      </nav>
      <div className={styles.mobileNavigation}>
        <NavigationLink
          compact
          current={destination === "search"}
          destination="search"
          label="Search"
          onNavigate={onNavigate}
        />
        <NavigationLink
          compact
          current={destination === "health"}
          destination="health"
          label="Health"
          onNavigate={onNavigate}
        />
        <ThemeMenu dark={dark} onThemeChange={onThemeChange} />
      </div>
      <div className={styles.footer}>
        Private owner application
        <br />
        StockHawk V1
      </div>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <div aria-label="Service readiness" className={styles.readiness}>
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
      <main className={styles.content}>{children}</main>
    </div>
  </div>
);
