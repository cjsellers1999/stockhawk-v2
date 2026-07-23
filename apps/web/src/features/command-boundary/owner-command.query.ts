import { latestOwnerCommandResponseSchema } from "@stockhawk/contracts";
import { queryOptions } from "@tanstack/react-query";

import { ownerCommandQueryKeys } from "./owner-command.query-keys";
import { ownerCommandRegistry } from "./owner-command-registry";

export type PendingOwnerIntent = {
  idempotencyKey: string;
  requestedAt: string;
};

export const ownerCommandReceiptQueryOptions = queryOptions({
  queryFn: async ({ signal }) => {
    const response = await fetch(ownerCommandRegistry.refresh_health.endpoint, {
      signal,
    });
    if (!response.ok) {
      throw new Error("Owner command state is unavailable");
    }
    const result = latestOwnerCommandResponseSchema.parse(
      await response.json(),
    );
    return result.receipt;
  },
  queryKey: ownerCommandQueryKeys.healthRefresh(),
  refetchInterval: (query) =>
    query.state.data?.status === "queued" ? 1_000 : false,
});

export const pendingOwnerCommandIntentsQueryOptions = queryOptions({
  initialData: [] as PendingOwnerIntent[],
  queryFn: async (): Promise<PendingOwnerIntent[]> => [],
  queryKey: ownerCommandQueryKeys.healthRefreshPending(),
  staleTime: Infinity,
});
