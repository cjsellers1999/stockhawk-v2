import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "./features/shell/app-shell.js";
import { readinessQueryOptions } from "./features/shell/readiness.query.js";

export const App = () => {
  const [dark, setDark] = useState(false);
  const readinessQuery = useQuery(readinessQueryOptions);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <AppShell
      dark={dark}
      onThemeChange={setDark}
      readiness={readinessQuery.data}
      readinessFailed={readinessQuery.isError}
    >
      <Outlet />
    </AppShell>
  );
};
