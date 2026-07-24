import {
  healthRefreshCommandSchema,
  onboardingCaseCommandSchema,
  ownerCommandReceiptSchema,
} from "@stockhawk/contracts";

export const ownerCommandRegistry = {
  refresh_health: {
    commandSchema: healthRefreshCommandSchema,
    endpoint: "/api/owner-commands/refresh-health",
    receiptSchema: ownerCommandReceiptSchema,
  },
  resume_onboarding: {
    commandSchema: onboardingCaseCommandSchema,
    endpoint: "/api/owner-commands/resume-onboarding",
    receiptSchema: ownerCommandReceiptSchema,
  },
} as const;
