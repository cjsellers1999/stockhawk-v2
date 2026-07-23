import type { QueryClient } from "@tanstack/react-query";

import { authQueryKeys } from "../auth/auth.query-keys";
import { executeLoginCommand } from "./login.client";
import { useCommandMutation } from "./use-command-mutation";

const createLoginCommandOptions = (queryClient: QueryClient) => ({
  mutationFn: executeLoginCommand,
  onSuccess: (session: Awaited<ReturnType<typeof executeLoginCommand>>) => {
    queryClient.setQueryData(authQueryKeys.session(), session);
  },
});

export const useLoginCommand = () => {
  const mutation = useCommandMutation(createLoginCommandOptions);

  return {
    failed: mutation.isError,
    isPending: mutation.isPending,
    login: (password: string) => mutation.mutate({ password }),
  };
};
