import { Button } from "@stockhawk/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Toaster } from "sonner";

import { CommandMenu } from "./features/shell/command-menu";
import { ThemeProvider } from "./features/shell/theme-provider";
import { router } from "./router";
import "./styles.css";

const queryClient = new QueryClient();
const rootElement = document.querySelector("#root");

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
    <section
      aria-labelledby="application-error-title"
      className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm"
      role="alert"
    >
      <h1 className="text-heading-2" id="application-error-title">
        StockHawk could not continue
      </h1>
      <p className="mt-2 text-body text-muted-foreground">
        {error instanceof Error
          ? error.message
          : "An unexpected application error occurred."}
      </p>
      <Button className="mt-4" onClick={resetErrorBoundary} type="button">
        Try again
      </Button>
    </section>
  </main>
);

if (rootElement === null) {
  throw new Error("StockHawk application root is missing");
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ErrorBoundary>
      <CommandMenu />
      <Toaster position="bottom-right" />
    </ThemeProvider>
  </StrictMode>,
);
