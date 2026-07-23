import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const expectNoAxeViolations = async (page) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
};

test("owner logs in and sees one truthful command reconcile", async ({
  page,
}) => {
  await page.goto("/health");
  await expect(
    page.getByRole("heading", { name: "Private owner login" }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByLabel("Admin password").fill("ticket-3-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();

  const mutationRequests = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().endsWith("/api/owner-commands/refresh-health")
    ) {
      mutationRequests.push(request);
    }
  });

  await page.getByRole("button", { name: "Refresh" }).dblclick();
  await expect(page.getByRole("button", { name: "Queued" })).toBeDisabled();
  expect(mutationRequests).toHaveLength(1);
  await expectNoAxeViolations(page);

  await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled({
    timeout: 10_000,
  });
  expect(mutationRequests).toHaveLength(1);
});
