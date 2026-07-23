import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { authQueryKeys } from "./auth.query-keys";
import { LoginPage } from "./login-page";

const renderLogin = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>,
  );
  return queryClient;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("admin login", () => {
  it("reconciles the authenticated server session", async () => {
    const response = {
      authenticated: true,
      expiresAt: "2026-07-24T05:00:00.000Z",
    } as const;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify(response), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Admin password"), "owner password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(queryClient.getQueryData(authQueryKeys.session())).toEqual(
        response,
      );
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
      body: JSON.stringify({ password: "owner password" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  });

  it("keeps the private shell locked after rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Admin session required",
            statusCode: 401,
          }),
          { status: 401 },
        ),
      ),
    );
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Admin password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Login failed. Check the password and try again.",
    );
    expect(screen.getByLabelText("Admin password")).toHaveValue("");
  });
});
