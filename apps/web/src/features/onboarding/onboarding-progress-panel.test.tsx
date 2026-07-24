import {
  onboardingCaseCommandSchema,
  type OnboardingCaseCommand,
  type OnboardingProgress,
  type OwnerCommandReceipt,
} from "@stockhawk/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ownerCommandQueryKeys } from "../command-boundary/owner-command.query-keys";
import { OnboardingProgressPanel } from "./onboarding-progress-panel";
import { onboardingQueryKeys } from "./onboarding.query-keys";

const progress: OnboardingProgress = {
  candidateSites: 2_489,
  cases: {
    inProgress: 0,
    queued: 0,
    resolved: 0,
    suspended: 1,
    total: 1,
  },
  focusCase: {
    candidateIdentity: "cnd_c473d673479129cabf67849530aa60e3",
    candidateName: "101 West Vine",
    candidateUrl: "https://www.101westvine.store/",
    identity: "obc_6d6294f35cc2c20a72a5e88f56fca573",
    nextAction: "Resume onboarding preflight",
    revision: 0,
    sourceRecordCount: 2,
    stage: "preflight",
    status: "suspended",
    terminal: false,
    updatedAt: "2026-07-24T17:00:00.000Z",
    waitReason: "Awaiting explicit owner resume",
  },
  importedAt: "2026-07-24T17:00:00.000Z",
  remainingCandidateSites: 2_488,
  sourceRecords: { reconciled: 2_712, total: 2_712 },
  workbookSha256:
    "0c4d846c6547e4d36d49de7c4aff250b63ec2cec9b39bfa166aa648586f53bbf",
};
const focusCase = progress.focusCase;
if (focusCase === null) {
  throw new TypeError("Onboarding progress fixture requires a focus case");
}

const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
    status,
  });

const requestUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
};

const parseSubmittedCommand = (body: BodyInit | null | undefined) => {
  if (typeof body !== "string") {
    throw new TypeError("Expected serialized Onboarding Case command");
  }
  return onboardingCaseCommandSchema.parse(JSON.parse(body));
};

const completedReceipt = (receipt: OwnerCommandReceipt | null) => {
  if (receipt === null) {
    throw new TypeError("Expected queued Onboarding Case receipt");
  }
  return {
    ...receipt,
    completedAt: "2026-07-24T17:00:02.000Z",
    status: "completed" as const,
  };
};

const renderPanel = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <OnboardingProgressPanel />
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Onboarding progress", () => {
  it("renders reconciled source truth and queues only a truthful resume intent", async () => {
    let submittedCommand: OnboardingCaseCommand | undefined;
    let latestReceipt: OwnerCommandReceipt | null = null;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input, init) => {
        const url = requestUrl(input);
        if (url === "/api/onboarding/progress") {
          return jsonResponse(progress);
        }
        if (init?.method === "POST") {
          if (typeof init.body !== "string") {
            throw new TypeError("Expected serialized Onboarding Case command");
          }
          submittedCommand = onboardingCaseCommandSchema.parse(
            JSON.parse(init.body),
          );
          latestReceipt = {
            command: submittedCommand,
            completedAt: null,
            failedAt: null,
            receiptId: "2e847567-14e4-49a9-a08c-92151429be8e",
            requestedAt: "2026-07-24T17:00:01.000Z",
            status: "queued",
          };
          return jsonResponse(latestReceipt, 202);
        }
        return jsonResponse({ receipt: latestReceipt });
      });
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();
    const user = userEvent.setup();

    expect(await screen.findByText("2,712 / 2,712")).toBeVisible();
    expect(screen.getByText("2,489")).toBeVisible();
    expect(screen.getByText("2,488")).toBeVisible();
    expect(screen.getByText("101 West Vine")).toBeVisible();
    expect(screen.getByText("Awaiting explicit owner resume")).toBeVisible();

    await user.dblClick(
      await screen.findByRole("button", { name: "Resume audit" }),
    );

    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    expect(submittedCommand).toMatchObject({
      action: "resume",
      caseIdentity: progress.focusCase?.identity,
      expectedRevision: 0,
      family: "resume_onboarding",
      schemaVersion: 1,
    });
    expect(
      await screen.findByRole("button", { name: "Queued" }),
    ).toBeDisabled();
  });

  it("restores authoritative queued intent after refresh", async () => {
    const command: OnboardingCaseCommand = {
      action: "resume",
      caseIdentity: "obc_6d6294f35cc2c20a72a5e88f56fca573",
      expectedRevision: 0,
      family: "resume_onboarding",
      idempotencyKey: "d8857fd0-b531-4a20-a08d-8f72727d4e0f",
      schemaVersion: 1,
    };
    const receipt: OwnerCommandReceipt = {
      command,
      completedAt: null,
      failedAt: null,
      receiptId: "2e847567-14e4-49a9-a08c-92151429be8e",
      requestedAt: "2026-07-24T17:00:01.000Z",
      status: "queued",
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockImplementation(async (input) =>
          requestUrl(input) === "/api/onboarding/progress"
            ? jsonResponse(progress)
            : jsonResponse({ receipt }),
        ),
    );
    renderPanel();

    expect(
      await screen.findByRole("button", { name: "Queued" }),
    ).toBeDisabled();
  });

  it("refreshes progress when a queued command receipt completes", async () => {
    let progressReads = 0;
    let latestReceipt: OwnerCommandReceipt | null = null;
    const queuedProgress: OnboardingProgress = {
      ...progress,
      cases: {
        ...progress.cases,
        queued: 1,
        suspended: 0,
      },
      focusCase: {
        ...focusCase,
        nextAction: "Run onboarding preflight",
        revision: 1,
        status: "queued",
        waitReason: null,
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
        if (requestUrl(input) === "/api/onboarding/progress") {
          progressReads += 1;
          return jsonResponse(progressReads >= 3 ? queuedProgress : progress);
        }
        if (init?.method === "POST") {
          latestReceipt = {
            command: parseSubmittedCommand(init.body),
            completedAt: null,
            failedAt: null,
            receiptId: "2e847567-14e4-49a9-a08c-92151429be8e",
            requestedAt: "2026-07-24T17:00:01.000Z",
            status: "queued",
          };
          return jsonResponse(latestReceipt, 202);
        }
        return jsonResponse({ receipt: latestReceipt });
      }),
    );
    renderPanel();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Resume audit" }),
    );
    expect(
      await screen.findByRole("button", { name: "Queued" }),
    ).toBeDisabled();

    latestReceipt = completedReceipt(latestReceipt);

    expect(
      await screen.findByText("Run onboarding preflight", undefined, {
        timeout: 2_500,
      }),
    ).toBeVisible();
  });

  it("allows a later re-audit after a successful resume without remounting", async () => {
    let authoritativeProgress = progress;
    let latestReceipt: OwnerCommandReceipt | null = null;
    const submittedCommands: OnboardingCaseCommand[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
        if (requestUrl(input) === "/api/onboarding/progress") {
          return jsonResponse(authoritativeProgress);
        }
        if (init?.method === "POST") {
          const command = parseSubmittedCommand(init.body);
          submittedCommands.push(command);
          latestReceipt = {
            command,
            completedAt: null,
            failedAt: null,
            receiptId:
              submittedCommands.length === 1
                ? "2e847567-14e4-49a9-a08c-92151429be8e"
                : "10c6216f-c1ea-4b43-9809-aa6d73895c8c",
            requestedAt: "2026-07-24T17:00:01.000Z",
            status: "queued",
          };
          return jsonResponse(latestReceipt, 202);
        }
        return jsonResponse({ receipt: latestReceipt });
      }),
    );
    const { queryClient } = renderPanel();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Resume audit" }),
    );
    await waitFor(() => {
      expect(submittedCommands).toHaveLength(1);
    });

    authoritativeProgress = {
      ...progress,
      cases: {
        ...progress.cases,
        resolved: 1,
        suspended: 0,
      },
      focusCase: {
        ...focusCase,
        nextAction: "Re-audit resolved Onboarding Case",
        revision: 2,
        status: "resolved",
        terminal: true,
        waitReason: null,
      },
    };
    latestReceipt = completedReceipt(latestReceipt);
    await act(async () => {
      await Promise.all([
        queryClient.refetchQueries({
          exact: true,
          queryKey: onboardingQueryKeys.progress(),
        }),
        queryClient.refetchQueries({
          exact: true,
          queryKey: ownerCommandQueryKeys.onboarding(),
        }),
      ]);
    });

    await user.click(await screen.findByRole("button", { name: "Re-audit" }));

    await waitFor(() => {
      expect(submittedCommands).toHaveLength(2);
    });
    expect(submittedCommands[1]).toMatchObject({
      action: "reaudit",
      expectedRevision: 2,
    });
  });

  it("explains an imported queue before any durable case opens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(async (input) =>
        requestUrl(input) === "/api/onboarding/progress"
          ? jsonResponse({
              ...progress,
              cases: {
                inProgress: 0,
                queued: 0,
                resolved: 0,
                suspended: 0,
                total: 0,
              },
              focusCase: null,
              remainingCandidateSites: 2_489,
            })
          : jsonResponse({ receipt: null }),
      ),
    );
    renderPanel();

    expect(
      await screen.findByRole("heading", {
        name: "No Onboarding Case opened",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Imported Candidate Sites remain queued for a durable case.",
      ),
    ).toBeVisible();
  });
});
