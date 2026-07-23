import { adminSessionResponseSchema } from "@stockhawk/contracts";
import { queryOptions } from "@tanstack/react-query";

import { authQueryKeys } from "./auth.query-keys";

export const sessionQueryOptions = queryOptions({
  queryFn: async () => {
    const response = await fetch("/api/auth/session");
    if (!response.ok) {
      throw new Error("Private session is unavailable");
    }
    return adminSessionResponseSchema.parse(await response.json());
  },
  queryKey: authQueryKeys.session(),
  refetchInterval: 60_000,
  staleTime: 60_000,
});
