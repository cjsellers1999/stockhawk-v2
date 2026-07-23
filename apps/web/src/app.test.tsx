import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppRouter } from "./router.js";

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
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, router };
};

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
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
    await userEvent.click(first(themeControls.slice(1)));
    const darkMenuItem = screen.getByRole("menuitem", {
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
    const lightMenuItem = screen.getByRole("menuitem", {
      name: "Use light theme",
    });
    await userEvent.keyboard("{ArrowDown}");
    expect(lightMenuItem).toHaveFocus();
    await userEvent.click(lightMenuItem);

    expect(document.documentElement).not.toHaveClass("dark");
  });
});
