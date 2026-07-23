import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "./app.js";

const first = <ElementType,>(elements: ElementType[]): ElementType => {
  const element = elements[0];
  if (element === undefined) {
    throw new Error("Expected at least one matching element");
  }
  return element;
};

const renderApp = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
});

describe("StockHawk shell", () => {
  it("opens Search by default and navigates to Health", async () => {
    window.history.replaceState({}, "", "/");
    renderApp();

    expect(
      screen.getByRole("heading", { name: "Search offers" }),
    ).toBeInTheDocument();

    await userEvent.click(
      first(screen.getAllByRole("link", { name: "Health" })),
    );

    expect(screen.getByRole("heading", { name: "Health" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/health");
  });

  it("switches between the locked light and dark themes", async () => {
    const { container } = renderApp();

    const themeControls = screen.getAllByRole("button", {
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
