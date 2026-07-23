import type {
  HealthRefreshCommand,
  OwnerCommandReceipt,
} from "@stockhawk/contracts";
import {
  useQuery,
  type MutationObserverOptions,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { executeOwnerCommand } from "./owner-command.client";
import {
  ownerCommandReceiptQueryOptions,
  pendingOwnerCommandIntentsQueryOptions,
  type PendingOwnerIntent,
} from "./owner-command.query";
import { ownerCommandQueryKeys } from "./owner-command.query-keys";
import { useCommandMutation } from "./use-command-mutation";

type MutationContext = {
  idempotencyKey: string;
};

const withoutPendingIntent = (
  intents: PendingOwnerIntent[],
  idempotencyKey: string,
): PendingOwnerIntent[] =>
  intents.filter((intent) => intent.idempotencyKey !== idempotencyKey);

const createOwnerCommandOptions = (
  queryClient: QueryClient,
): MutationObserverOptions<
  OwnerCommandReceipt,
  Error,
  HealthRefreshCommand,
  MutationContext
> => ({
  mutationFn: executeOwnerCommand,
  onMutate: async (command): Promise<MutationContext> => {
    await queryClient.cancelQueries({
      queryKey: ownerCommandQueryKeys.healthRefresh(),
    });
    queryClient.setQueryData<PendingOwnerIntent[]>(
      ownerCommandQueryKeys.healthRefreshPending(),
      (current = []) => [
        ...current,
        {
          idempotencyKey: command.idempotencyKey,
          requestedAt: new Date().toISOString(),
        },
      ],
    );
    toast("Health refresh queued");
    return { idempotencyKey: command.idempotencyKey };
  },
  onError: (_error, _command, context) => {
    if (context === undefined) {
      return;
    }
    queryClient.setQueryData<PendingOwnerIntent[]>(
      ownerCommandQueryKeys.healthRefreshPending(),
      (current = []) => withoutPendingIntent(current, context.idempotencyKey),
    );
    toast.error("Health refresh was rejected");
  },
  onSettled: async () => {
    const pending = queryClient.getQueryData<PendingOwnerIntent[]>(
      ownerCommandQueryKeys.healthRefreshPending(),
    );
    if (pending?.length === 0) {
      await queryClient.invalidateQueries({
        exact: true,
        queryKey: ownerCommandQueryKeys.healthRefresh(),
      });
    }
  },
  onSuccess: (receipt, _command, context) => {
    queryClient.setQueryData(ownerCommandQueryKeys.healthRefresh(), receipt);
    queryClient.setQueryData<PendingOwnerIntent[]>(
      ownerCommandQueryKeys.healthRefreshPending(),
      (current = []) => withoutPendingIntent(current, context.idempotencyKey),
    );
  },
});

export const useOptimisticOwnerCommand = () => {
  const authoritativeQuery = useQuery(ownerCommandReceiptQueryOptions);
  const pendingQuery = useQuery(pendingOwnerCommandIntentsQueryOptions);
  const mutation = useCommandMutation<
    OwnerCommandReceipt,
    Error,
    HealthRefreshCommand,
    MutationContext
  >(createOwnerCommandOptions);

  return {
    execute: (
      command: HealthRefreshCommand,
      callbacks: { onSettled?: () => void } = {},
    ) => mutation.mutate(command, callbacks),
    isQueued:
      pendingQuery.data.length > 0 ||
      authoritativeQuery.data?.status === "queued",
  };
};
