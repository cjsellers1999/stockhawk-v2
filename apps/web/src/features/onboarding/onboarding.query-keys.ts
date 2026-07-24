export const onboardingQueryKeys = {
  all: ["onboarding"] as const,
  progress: () => [...onboardingQueryKeys.all, "progress"] as const,
};
