import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";

import { AppShell } from "./features/shell/app-shell";
import { readinessQueryOptions } from "./features/shell/readiness.query";
import { useTheme } from "./features/shell/theme-provider";

export const App = () => {
  const { dark, setDark } = useTheme();
  const readinessQuery = useQuery(readinessQueryOptions);

  return (
    <>
      {readinessQuery.isError && readinessQuery.data === undefined ? (
        <output className="sr-only">No data available for readiness.</output>
      ) : null}
      <AppShell
        dark={dark}
        onThemeChange={setDark}
        readiness={readinessQuery.data}
        readinessFailed={readinessQuery.isError}
      >
        <Outlet />
      </AppShell>
    </>
  );
};
