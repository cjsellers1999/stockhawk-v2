import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
} from "@tanstack/react-query";

interface OptimisticCommandOptions<TData, TVariables, TQueryData> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: QueryKey;
  optimisticUpdate: (current: TQueryData | undefined, variables: TVariables) => TQueryData;
}

interface MutationContext<TQueryData> {
  previous: TQueryData | undefined;
}

/**
 * The only allowed mutation entry point in StockHawk UI code.
 * It makes the requested command visible immediately, then rolls back or reconciles.
 */
export function useOptimisticCommandMutation<TData, TVariables, TQueryData>(
  options: OptimisticCommandOptions<TData, TVariables, TQueryData>,
): UseMutationResult<TData, Error, TVariables, MutationContext<TQueryData>> {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, MutationContext<TQueryData>>({
    mutationFn: options.mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: options.queryKey });
      const previous = queryClient.getQueryData<TQueryData>(options.queryKey);

      queryClient.setQueryData<TQueryData>(options.queryKey, (current) =>
        options.optimisticUpdate(current, variables),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(options.queryKey, context?.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: options.queryKey });
    },
  });
}
