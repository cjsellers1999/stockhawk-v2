import { readinessSchema } from "@stockhawk/contracts";
import { queryOptions } from "@tanstack/react-query";

export const readinessQueryKeys = {
  all: ["readiness"] as const,
  current: () => [...readinessQueryKeys.all, "current"] as const,
};

export const readinessQueryOptions = queryOptions({
  queryKey: readinessQueryKeys.current(),
  queryFn: async () => {
    const response = await fetch("/api/readiness");
    return readinessSchema.parse(await response.json());
  },
  refetchInterval: 10_000,
  retry: false,
});
