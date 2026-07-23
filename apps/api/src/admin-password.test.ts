import { describe, expect, it } from "vitest";

import {
  createAdminPasswordVerifier,
  hashAdminPassword,
} from "./admin-password.js";

describe("admin password", () => {
  it("stores a salted scrypt digest and verifies without exposing plaintext", async () => {
    const encoded = await hashAdminPassword("correct horse battery staple", {
      salt: Buffer.from("0123456789abcdef", "utf8"),
    });
    const verify = createAdminPasswordVerifier(encoded);

    expect(encoded).toMatch(/^scrypt\$/);
    expect(encoded).not.toContain("correct horse battery staple");
    await expect(verify("correct horse battery staple")).resolves.toBe(true);
    await expect(verify("wrong password")).resolves.toBe(false);
  });

  it("rejects malformed password configuration at startup", () => {
    expect(() => createAdminPasswordVerifier("plaintext")).toThrow(
      /password hash/i,
    );
  });
});
