import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppRouter } from "./router";
import { ThemeProvider } from "./features/shell/theme-provider";

vi.mock("./features/search/search-page.js", async (importOriginal) => {
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
  return importOriginal();
});

const first = <ElementType,>(elements: ElementType[]): ElementType => {
  const element = elements[0];
  if (element === undefined) {
    throw new Error("Expected at least one matching element");
  }
  return element;
};

const renderApp = (initialEntry = "/") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [initialEntry] }),
  );
  const view = render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return { ...view, router };
};

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
  window.localStorage.clear();
});

describe("StockHawk shell", () => {
  it("keeps route-level feedback visible while Search loads", async () => {
    renderApp();

    expect(await screen.findByText("Loading page…")).toBeInTheDocument();
    expect(screen.getByText("StockHawk")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Search offers" }),
    ).toBeInTheDocument();
  });

  it("opens Search by default and navigates to Health", async () => {
    const { router } = renderApp();

    expect(
      await screen.findByRole("heading", { name: "Search offers" }),
    ).toBeInTheDocument();

    await userEvent.click(
      first(screen.getAllByRole("link", { name: "Health" })),
    );

    expect(screen.getByRole("heading", { name: "Health" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/health");
  });

  it("switches between the locked light and dark themes", async () => {
    const { container } = renderApp();

    const themeControls = await screen.findAllByRole("button", {
      name: "Use dark theme",
    });
    const themeControl = first(themeControls.slice(1));

    await userEvent.click(themeControl);
    expect(
      await screen.findByRole("menuitem", { name: "Use dark theme" }),
    ).toBeInTheDocument();
    await userEvent.click(themeControl);
    await waitFor(() => {
      expect(
        screen.queryByRole("menuitem", { name: "Use dark theme" }),
      ).not.toBeInTheDocument();
    });
    await userEvent.click(themeControl);
    const darkMenuItem = await screen.findByRole("menuitem", {
      name: "Use dark theme",
    });

    expect(container).not.toContainElement(darkMenuItem);
    await userEvent.keyboard("{ArrowDown}");
    expect(darkMenuItem).toHaveFocus();
    await userEvent.click(darkMenuItem);

    expect(document.documentElement).toHaveClass("dark");

    await userEvent.click(
      first(screen.getAllByRole("button", { name: "Use light theme" })),
    );
    const lightMenuItem = await screen.findByRole("menuitem", {
      name: "Use light theme",
    });
    await userEvent.keyboard("{ArrowDown}");
    expect(lightMenuItem).toHaveFocus();
    await userEvent.click(lightMenuItem);

    expect(document.documentElement).not.toHaveClass("dark");
  });
});
