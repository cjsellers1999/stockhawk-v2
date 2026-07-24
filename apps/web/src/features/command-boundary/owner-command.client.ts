import type { HealthRefreshCommand } from "@stockhawk/contracts";

import { ownerCommandRegistry } from "./owner-command-registry";

export const executeOwnerCommand = async (
  unparsedCommand: HealthRefreshCommand,
) => {
  const registration = ownerCommandRegistry.refresh_health;
  const command = registration.commandSchema.parse(unparsedCommand);
  const response = await fetch(registration.endpoint, {
    body: JSON.stringify(command),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Health refresh was rejected");
  }
  return registration.receiptSchema.parse(await response.json());
};
