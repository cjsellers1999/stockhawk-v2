import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useOptimisticCommandMutation } from "./use-optimistic-command-mutation";

interface TestRow {
  id: string;
  command: "idle" | "queued";
}

interface TestRequest {
  id: string;
}

const queryKey = ["test-commands"] as const;

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function updateImmediately(current: TestRow[] | undefined, request: TestRequest): TestRow[] {
  return (current ?? []).map((row) =>
    row.id === request.id ? { ...row, command: "queued" } : row,
  );
}

function Harness({ mutationFn }: { mutationFn: (request: TestRequest) => Promise<TestRequest> }) {
  const mutation = useOptimisticCommandMutation<TestRequest, TestRequest, TestRow[]>({
    mutationFn,
    queryKey,
    optimisticUpdate: updateImmediately,
  });

  return (
    <button type="button" onClick={() => mutation.mutate({ id: "store-1" })}>
      Queue
    </button>
  );
}

function Wrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useOptimisticCommandMutation", () => {
  it("updates cache before the server settles", async () => {
    const client = makeClient();
    client.setQueryData<TestRow[]>(queryKey, [{ id: "store-1", command: "idle" }]);
    let resolveRequest: ((request: TestRequest) => void) | undefined;
    const mutationFn = () =>
      new Promise<TestRequest>((resolve) => {
        resolveRequest = resolve;
      });

    render(<Harness mutationFn={mutationFn} />, {
      wrapper: ({ children }) => <Wrapper client={client}>{children}</Wrapper>,
    });
    fireEvent.click(document.querySelector("button")!);

    await waitFor(() => {
      expect(client.getQueryData<TestRow[]>(queryKey)?.[0].command).toBe("queued");
    });

    expect(resolveRequest).toBeDefined();
    await act(async () => resolveRequest?.({ id: "store-1" }));
  });

  it("restores the snapshot when the server rejects the command", async () => {
    const client = makeClient();
    client.setQueryData<TestRow[]>(queryKey, [{ id: "store-1", command: "idle" }]);
    let rejectRequest: ((error: Error) => void) | undefined;
    const mutationFn = () =>
      new Promise<TestRequest>((_resolve, reject) => {
        rejectRequest = reject;
      });

    render(<Harness mutationFn={mutationFn} />, {
      wrapper: ({ children }) => <Wrapper client={client}>{children}</Wrapper>,
    });
    fireEvent.click(document.querySelector("button")!);

    await waitFor(() => {
      expect(client.getQueryData<TestRow[]>(queryKey)?.[0].command).toBe("queued");
    });

    expect(rejectRequest).toBeDefined();
    await act(async () => rejectRequest?.(new Error("server rejected")));
    await waitFor(() => {
      expect(client.getQueryData<TestRow[]>(queryKey)?.[0].command).toBe("idle");
    });
  });
});
