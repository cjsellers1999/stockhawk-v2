import {
  MutationObserver,
  notifyManager,
  useQueryClient,
  type DefaultError,
  type MutateOptions,
  type MutationObserverOptions,
  type QueryClient,
} from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";

type CommandMutationOptionsFactory<TData, TError, TVariables, TContext> = (
  queryClient: QueryClient,
) => MutationObserverOptions<TData, TError, TVariables, TContext>;

export const useCommandMutation = <
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(
  createOptions: CommandMutationOptionsFactory<
    TData,
    TError,
    TVariables,
    TContext
  >,
) => {
  const queryClient = useQueryClient();
  const [observer] = useState(
    () =>
      new MutationObserver<TData, TError, TVariables, TContext>(
        queryClient,
        createOptions(queryClient),
      ),
  );

  const result = useSyncExternalStore(
    (onStoreChange) =>
      observer.subscribe(notifyManager.batchCalls(onStoreChange)),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult(),
  );

  const mutate = (
    variables: TVariables,
    mutateOptions?: MutateOptions<TData, TError, TVariables, TContext>,
  ) => {
    observer.mutate(variables, mutateOptions).catch(() => undefined);
  };

  return { ...result, mutate };
};
