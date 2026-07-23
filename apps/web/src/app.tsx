import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { HealthPage } from "./features/health/health-page.js";
import { AppShell, type Destination } from "./features/shell/app-shell.js";
import { readinessQueryOptions } from "./features/shell/readiness.query.js";
import { SearchPage } from "./features/search/search-page.js";

const destinationFromPath = (): Destination =>
  window.location.pathname === "/health" ? "health" : "search";

export const App = () => {
  const [dark, setDark] = useState(false);
  const [destination, setDestination] =
    useState<Destination>(destinationFromPath);
  const readinessQuery = useQuery(readinessQueryOptions);

  useEffect(() => {
    const handlePopState = () => setDestination(destinationFromPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const navigate = (nextDestination: Destination) => {
    const path = nextDestination === "health" ? "/health" : "/";
    window.history.pushState({}, "", path);
    setDestination(nextDestination);
  };

  const page = destination === "health" ? <HealthPage /> : <SearchPage />;

  return (
    <AppShell
      dark={dark}
      destination={destination}
      onNavigate={navigate}
      onThemeChange={setDark}
      readiness={readinessQuery.data}
      readinessFailed={readinessQuery.isError}
    >
      {page}
    </AppShell>
  );
};
