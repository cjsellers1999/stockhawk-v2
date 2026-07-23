import type { HealthRefreshCommand } from "@stockhawk/contracts";

import { ownerCommandRegistry } from "./owner-command-registry";

const csrfCookieName = "stockhawk_csrf";

const readCookie = (name: string) => {
  for (const part of document.cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
};

export const executeOwnerCommand = async (
  unparsedCommand: HealthRefreshCommand,
) => {
  const registration = ownerCommandRegistry.refresh_health;
  const command = registration.commandSchema.parse(unparsedCommand);
  const csrfToken = readCookie(csrfCookieName);
  if (csrfToken === undefined) {
    throw new Error("Secure command token is unavailable");
  }
  const response = await fetch(registration.endpoint, {
    body: JSON.stringify(command),
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Health refresh was rejected");
  }
  return registration.receiptSchema.parse(await response.json());
};
