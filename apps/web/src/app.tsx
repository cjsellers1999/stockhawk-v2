import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";

import { LoginPage } from "./features/auth/login-page";
import { sessionQueryOptions } from "./features/auth/session.query";
import { AppShell } from "./features/shell/app-shell";
import { readinessQueryOptions } from "./features/shell/readiness.query";
import { useTheme } from "./features/shell/theme-provider";

const AuthenticatedApp = () => {
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

export const App = () => {
  const sessionQuery = useQuery(sessionQueryOptions);

  if (sessionQuery.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-muted-foreground">
        Checking private session…
      </main>
    );
  }
  if (sessionQuery.isError) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-danger">
        <p role="alert">Private session is unavailable.</p>
      </main>
    );
  }
  if (!sessionQuery.data.authenticated) {
    return <LoginPage />;
  }
  return <AuthenticatedApp />;
};
