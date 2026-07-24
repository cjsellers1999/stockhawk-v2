import {
  latestOwnerCommandResponseSchema,
  onboardingProgressSchema,
} from "@stockhawk/contracts";
import { queryOptions } from "@tanstack/react-query";

import { ownerCommandRegistry } from "../command-boundary/owner-command-registry";
import { ownerCommandQueryKeys } from "../command-boundary/owner-command.query-keys";
import { onboardingQueryKeys } from "./onboarding.query-keys";

export const onboardingProgressQueryOptions = queryOptions({
  queryFn: async ({ signal }) => {
    const response = await fetch("/api/onboarding/progress", { signal });
    if (!response.ok) {
      throw new Error("Onboarding progress is unavailable");
    }
    return onboardingProgressSchema.parse(await response.json());
  },
  queryKey: onboardingQueryKeys.progress(),
});

export const onboardingCommandReceiptQueryOptions = queryOptions({
  queryFn: async ({ signal }) => {
    const response = await fetch(
      ownerCommandRegistry.resume_onboarding.endpoint,
      { signal },
    );
    if (!response.ok) {
      throw new Error("Onboarding Case command state is unavailable");
    }
    const result = latestOwnerCommandResponseSchema.parse(
      await response.json(),
    );
    if (
      result.receipt !== null &&
      result.receipt.command.family !== "resume_onboarding"
    ) {
      throw new Error("Onboarding Case command state has the wrong family");
    }
    return result.receipt;
  },
  queryKey: ownerCommandQueryKeys.onboarding(),
  refetchInterval: (query) =>
    query.state.data?.status === "queued" ? 1_000 : false,
});
