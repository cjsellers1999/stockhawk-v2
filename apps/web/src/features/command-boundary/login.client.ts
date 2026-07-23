import {
  adminLoginCommandSchema,
  adminSessionResponseSchema,
  type AdminLoginCommand,
} from "@stockhawk/contracts";

export const executeLoginCommand = async (
  unparsedCommand: AdminLoginCommand,
) => {
  const command = adminLoginCommandSchema.parse(unparsedCommand);
  const response = await fetch("/api/auth/login", {
    body: JSON.stringify(command),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Admin login was rejected");
  }
  const session = adminSessionResponseSchema.parse(await response.json());
  if (!session.authenticated) {
    throw new Error("Admin login did not create a session");
  }
  return session;
};
