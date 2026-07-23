import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const lint = async (className: string) => {
  const workspace = fileURLToPath(new URL("../../../", import.meta.url));
  const eslint = new ESLint({
    cwd: workspace,
    overrideConfigFile: fileURLToPath(
      new URL("../../../eslint.config.mjs", import.meta.url),
    ),
  });
  const [result] = await eslint.lintText(
    `export const Example = () => <div className="${className}" />;`,
    {
      filePath: "apps/web/src/app.tsx",
    },
  );
  return result?.messages.map(({ ruleId }) => ruleId) ?? [];
};

describe("Tailwind policy", () => {
  it("accepts ordered semantic utilities and state variants", async () => {
    await expect(
      lint("rounded-md bg-background text-foreground hover:bg-accent"),
    ).resolves.toEqual([]);
  });

  it("rejects arbitrary values", async () => {
    await expect(lint("w-[13px]")).resolves.toContain(
      "tailwindcss/no-arbitrary-value",
    );
  });

  it("rejects unknown classes", async () => {
    await expect(lint("stockhawk-mystery-class")).resolves.toContain(
      "tailwindcss/no-custom-classname",
    );
  });
});
