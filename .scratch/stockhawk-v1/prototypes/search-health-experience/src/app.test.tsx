import { StrictMode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app";

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderApp = () => {
  const client = makeClient();

  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
};

describe("prototype controls", () => {
  it("changes the visible layout when a variant button is clicked", async () => {
    window.history.replaceState(
      {},
      "",
      "/?variant=A&page=search&view=flat&p=1&theme=light&q=Sky%20Dragon",
    );
    renderApp();
    await screen.findByText(/matching listings/);

    fireEvent.click(
      screen.getByRole("button", {
        name: /BTable \+ inspectorScan rows, inspect one beside them/,
      }),
    );

    expect(await screen.findByText("Selected listing")).toBeTruthy();
    expect(window.location.search).toContain("variant=B");
  });
});
