import {
  healthRefreshCommandSchema,
  type HealthRefreshCommand,
  type OwnerCommandReceipt,
} from "@stockhawk/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useOptimisticOwnerCommand } from "../command-boundary/use-optimistic-owner-command";
import { ownerCommandQueryKeys } from "../command-boundary/owner-command.query-keys";
import { HealthPage } from "./health-page";

const firstIdempotencyKey = "d8857fd0-b531-4a20-a08d-8f72727d4e0f";
const secondIdempotencyKey = "1e9b8871-2b68-4369-bb56-2061f80d87f9";
const receiptId = "2e847567-14e4-49a9-a08c-92151429be8e";

const receiptFor = (
  command: HealthRefreshCommand,
  status: OwnerCommandReceipt["status"] = "queued",
): OwnerCommandReceipt => ({
  command,
  completedAt: status === "completed" ? "2026-07-23T17:00:01.000Z" : null,
  failedAt: status === "failed" ? "2026-07-23T17:00:01.000Z" : null,
  receiptId,
  requestedAt: "2026-07-23T17:00:00.000Z",
  status,
});

const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
    status,
  });

const requestMethod = (init: RequestInit | undefined) => init?.method ?? "GET";

const renderWithQuery = (view: React.ReactNode) => {
  document.cookie = "stockhawk_csrf=test-csrf-token; Path=/";
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  return {
    ...render(
      <QueryClientProvider client={queryClient}>{view}</QueryClientProvider>,
    ),
    queryClient,
  };
};

const OverlapHarness = () => {
  const command = useOptimisticOwnerCommand();
  return (
    <>
      <button
        onClick={() =>
          command.execute({
            family: "refresh_health",
            idempotencyKey: firstIdempotencyKey,
            schemaVersion: 1,
          })
        }
        type="button"
      >
        First
      </button>
      <button
        onClick={() =>
          command.execute({
            family: "refresh_health",
            idempotencyKey: secondIdempotencyKey,
            schemaVersion: 1,
          })
        }
        type="button"
      >
        Second
      </button>
      <output>{command.isQueued ? "Queued" : "Idle"}</output>
    </>
  );
};

afterEach(() => {
  cleanup();
  document.cookie = "stockhawk_csrf=; Max-Age=0; Path=/";
  vi.unstubAllGlobals();
});

describe("optimistic Health refresh", () => {
  it("blocks refresh until authoritative command state is known", async () => {
    let resolveRead: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveRead = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithQuery(<HealthPage />);
    const user = userEvent.setup();

    const checking = screen.getByRole("button", { name: "Checking" });
    expect(checking).toBeDisabled();
    await user.click(checking);
    expect(
      fetchMock.mock.calls.filter(([, init]) => requestMethod(init) === "POST"),
    ).toHaveLength(0);

    resolveRead?.(jsonResponse({ receipt: null }));
    expect(
      await screen.findByRole("button", { name: "Refresh" }),
    ).toBeEnabled();
  });

  it("keeps refresh unavailable after authoritative state cannot load", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error("Injected receipt outage")),
    );
    renderWithQuery(<HealthPage />);

    expect(
      await screen.findByRole("button", { name: "Unavailable" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Refresh state is unavailable.",
    );
  });

  it("surfaces terminal command failure before offering a retry", async () => {
    const command: HealthRefreshCommand = {
      family: "refresh_health",
      idempotencyKey: firstIdempotencyKey,
      schemaVersion: 1,
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          jsonResponse({ receipt: receiptFor(command, "failed") }),
        ),
    );
    renderWithQuery(<HealthPage />);

    expect(
      await screen.findByRole("button", { name: "Retry refresh" }),
    ).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Latest health refresh failed.",
    );
  });

  it("restores authoritative queued intent after a browser refresh", async () => {
    const command: HealthRefreshCommand = {
      family: "refresh_health",
      idempotencyKey: firstIdempotencyKey,
      schemaVersion: 1,
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse({ receipt: receiptFor(command) })),
    );

    renderWithQuery(<HealthPage />);

    expect(
      await screen.findByRole("button", { name: "Queued" }),
    ).toBeDisabled();
  });

  it("deduplicates rapid clicks and reconciles proven completion", async () => {
    let resolveCommand: ((response: Response) => void) | undefined;
    let authoritativeReceipt: OwnerCommandReceipt | null = null;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation((_input, init) => {
        if (requestMethod(init) === "POST") {
          return new Promise<Response>((resolve) => {
            resolveCommand = resolve;
          });
        }
        return Promise.resolve(jsonResponse({ receipt: authoritativeReceipt }));
      });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQuery(<HealthPage />);
    const user = userEvent.setup();
    const refresh = await screen.findByRole("button", { name: "Refresh" });

    await user.dblClick(refresh);

    expect(
      fetchMock.mock.calls.filter(([, init]) => requestMethod(init) === "POST"),
    ).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Queued" })).toBeDisabled();

    const postCall = fetchMock.mock.calls.find(
      ([, init]) => requestMethod(init) === "POST",
    );
    const commandBody = postCall?.[1]?.body;
    if (typeof commandBody !== "string") {
      throw new TypeError("Expected a serialized refresh command");
    }
    const command = healthRefreshCommandSchema.parse(JSON.parse(commandBody));
    authoritativeReceipt = receiptFor(command, "completed");
    resolveCommand?.(jsonResponse(receiptFor(command), 202));

    expect(
      await screen.findByRole("button", { name: "Refresh" }),
    ).toBeEnabled();
  });

  it("rolls a rejected command back to the exact prior state", async () => {
    const priorCommand: HealthRefreshCommand = {
      family: "refresh_health",
      idempotencyKey: firstIdempotencyKey,
      schemaVersion: 1,
    };
    const priorReceipt = receiptFor(priorCommand, "completed");
    let resolveCommand: ((response: Response) => void) | undefined;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation((_input, init) =>
        requestMethod(init) === "POST"
          ? new Promise<Response>((resolve) => {
              resolveCommand = resolve;
            })
          : Promise.resolve(jsonResponse({ receipt: priorReceipt })),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { queryClient } = renderWithQuery(<HealthPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Refresh" }));
    expect(screen.getByRole("button", { name: "Queued" })).toBeDisabled();
    resolveCommand?.(
      jsonResponse(
        { error: "Conflict", message: "Rejected", statusCode: 409 },
        409,
      ),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
    });
    expect(
      queryClient.getQueryData(ownerCommandQueryKeys.healthRefresh()),
    ).toEqual(priorReceipt);
    expect(
      queryClient.getQueryData(ownerCommandQueryKeys.healthRefreshPending()),
    ).toEqual([]);
  });

  it("keeps a later optimistic layer when an overlapping command fails", async () => {
    const resolvers: Array<(response: Response) => void> = [];
    let latestReceipt: OwnerCommandReceipt | null = null;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation((_input, init) => {
        if (requestMethod(init) === "POST") {
          return new Promise<Response>((resolve) => {
            resolvers.push(resolve);
          });
        }
        return Promise.resolve(jsonResponse({ receipt: latestReceipt }));
      });
    vi.stubGlobal("fetch", fetchMock);

    const { queryClient } = renderWithQuery(<OverlapHarness />);
    const user = userEvent.setup();

    await screen.findByText("Idle");
    await user.click(screen.getByRole("button", { name: "First" }));
    await user.click(screen.getByRole("button", { name: "Second" }));
    expect(screen.getByText("Queued")).toBeInTheDocument();

    await queryClient.refetchQueries({
      exact: true,
      queryKey: ownerCommandQueryKeys.healthRefresh(),
    });
    expect(
      queryClient.getQueryData(ownerCommandQueryKeys.healthRefreshPending()),
    ).toMatchObject([
      { idempotencyKey: firstIdempotencyKey },
      { idempotencyKey: secondIdempotencyKey },
    ]);
    expect(screen.getByText("Queued")).toBeInTheDocument();

    resolvers[0]?.(jsonResponse({ message: "Rejected" }, 409));
    await waitFor(() => {
      expect(screen.getByText("Queued")).toBeInTheDocument();
    });

    const secondCommand: HealthRefreshCommand = {
      family: "refresh_health",
      idempotencyKey: secondIdempotencyKey,
      schemaVersion: 1,
    };
    latestReceipt = receiptFor(secondCommand, "completed");
    resolvers[1]?.(jsonResponse(receiptFor(secondCommand), 202));

    expect(await screen.findByText("Idle")).toBeInTheDocument();
  });

  it("ignores an older success that resolves after a newer command", async () => {
    const resolvers: Array<(response: Response) => void> = [];
    let rejectAuthoritativeReads = false;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation((_input, init) => {
        if (requestMethod(init) === "POST") {
          return new Promise<Response>((resolve) => {
            resolvers.push(resolve);
          });
        }
        return rejectAuthoritativeReads
          ? Promise.reject(new Error("Injected reconciliation outage"))
          : Promise.resolve(jsonResponse({ receipt: null }));
      }),
    );
    const { queryClient } = renderWithQuery(<OverlapHarness />);
    const user = userEvent.setup();
    await screen.findByText("Idle");

    await user.click(screen.getByRole("button", { name: "First" }));
    await user.click(screen.getByRole("button", { name: "Second" }));
    const firstCommand: HealthRefreshCommand = {
      family: "refresh_health",
      idempotencyKey: firstIdempotencyKey,
      schemaVersion: 1,
    };
    const secondCommand: HealthRefreshCommand = {
      family: "refresh_health",
      idempotencyKey: secondIdempotencyKey,
      schemaVersion: 1,
    };

    rejectAuthoritativeReads = true;
    resolvers[1]?.(jsonResponse(receiptFor(secondCommand), 202));
    await waitFor(() => {
      expect(
        queryClient.getQueryData<OwnerCommandReceipt>(
          ownerCommandQueryKeys.healthRefresh(),
        )?.command,
      ).toEqual(secondCommand);
    });
    expect(
      queryClient.getQueryData(ownerCommandQueryKeys.healthRefreshPending()),
    ).toMatchObject([{ idempotencyKey: firstIdempotencyKey }]);
    expect(screen.getByText("Queued")).toBeInTheDocument();

    resolvers[0]?.(jsonResponse(receiptFor(firstCommand), 202));
    await waitFor(() => {
      expect(
        queryClient.getQueryData(ownerCommandQueryKeys.healthRefreshPending()),
      ).toEqual([]);
    });
    expect(
      queryClient.getQueryData<OwnerCommandReceipt>(
        ownerCommandQueryKeys.healthRefresh(),
      )?.command,
    ).toEqual(secondCommand);
  });
});
