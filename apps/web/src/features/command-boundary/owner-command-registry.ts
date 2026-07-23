import {
  healthRefreshCommandSchema,
  ownerCommandReceiptSchema,
} from "@stockhawk/contracts";

export const ownerCommandRegistry = {
  refresh_health: {
    commandSchema: healthRefreshCommandSchema,
    endpoint: "/api/owner-commands/refresh-health",
    receiptSchema: ownerCommandReceiptSchema,
  },
} as const;
