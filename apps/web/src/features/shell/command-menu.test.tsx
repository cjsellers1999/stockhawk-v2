import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { authQueryKeys } from "../auth/auth.query-keys";
import { CommandMenu } from "./command-menu";

const renderCommandMenu = (authenticated: boolean) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(
    authQueryKeys.session(),
    authenticated
      ? {
          authenticated: true,
          expiresAt: "2026-07-24T05:00:00.000Z",
        }
      : { authenticated: false },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <CommandMenu />
    </QueryClientProvider>,
  );
};

afterEach(cleanup);

describe("private command menu", () => {
  it("registers its shortcut only for an authenticated owner", () => {
    renderCommandMenu(false);

    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });

    expect(
      screen.queryByPlaceholderText("Search commands…"),
    ).not.toBeInTheDocument();
  });

  it("opens from the owner shortcut after authentication", () => {
    renderCommandMenu(true);

    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });

    expect(screen.getByPlaceholderText("Search commands…")).toBeInTheDocument();
  });
});
