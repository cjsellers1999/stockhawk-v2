import { useQuery } from "@tanstack/react-query";

import { onboardingProgressQueryOptions } from "./onboarding.query";

export const useOnboardingProgress = () =>
  useQuery(onboardingProgressQueryOptions);
