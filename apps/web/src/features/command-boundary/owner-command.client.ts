import type {
  HealthRefreshCommand,
  OnboardingCaseCommand,
} from "@stockhawk/contracts";

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

export const executeOnboardingCaseCommand = async (
  unparsedCommand: OnboardingCaseCommand,
) => {
  const registration = ownerCommandRegistry.resume_onboarding;
  const command = registration.commandSchema.parse(unparsedCommand);
  const response = await fetch(registration.endpoint, {
    body: JSON.stringify(command),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Onboarding Case command was rejected");
  }
  const receipt = registration.receiptSchema.parse(await response.json());
  if (receipt.command.family !== "resume_onboarding") {
    throw new Error("Onboarding Case command returned the wrong receipt");
  }
  return receipt;
};
