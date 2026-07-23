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
    if (!response.ok) {
      throw new Error(`Readiness request failed with ${response.status}`);
    }
    return readinessSchema.parse(await response.json());
  },
  refetchInterval: 10_000,
  retry: false,
});
