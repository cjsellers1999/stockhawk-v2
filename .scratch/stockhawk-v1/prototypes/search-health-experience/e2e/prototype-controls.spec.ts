import { expect, test, type Page } from "@playwright/test";

function expectUrlParam(page: Page, key: string, value: string): void {
  expect(new URL(page.url()).searchParams.get(key)).toBe(value);
}

test("shell controls change layout, theme, selection, and page", async ({ page }) => {
  await page.goto("/?variant=A&page=search&view=flat&p=1&theme=light&q=Sky%20Dragon");
  await expect(page.getByText(/matching listings/).first()).toBeVisible();

  await page.getByRole("button", { name: /Table \+ inspector/ }).click();
  await expect(page.getByLabel("Selected listing")).toBeVisible();
  expectUrlParam(page, "variant", "B");

  await page.getByRole("button", { name: 'Sky Dragon | Little 10"' }).first().click();
  await expect(page.getByLabel("Selected listing").getByRole("heading")).toHaveText(
    'Sky Dragon | Little 10"',
  );
  expect(new URL(page.url()).searchParams.get("offer")).toMatch(/^sky-little-/);

  await page.getByRole("button", { name: /Store outline/ }).click();
  await expect(page.locator(".search-table.variant-C")).toBeVisible();
  await expect(page.getByLabel("Selected listing")).toHaveCount(0);
  expectUrlParam(page, "variant", "C");

  await page.getByRole("button", { name: "Use dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expectUrlParam(page, "theme", "dark");
  await page.getByRole("button", { name: "Use light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: /Health/ }).click();
  await expect(page.getByRole("heading", { name: "Storefront health" })).toBeVisible();
  expectUrlParam(page, "page", "health");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Find Jellycat listings" })).toBeVisible();
  expectUrlParam(page, "page", "search");
});

test("search controls persist, filter, group, sort, and paginate", async ({ page }) => {
  await page.goto("/?variant=A&page=search&view=flat&p=1&theme=light&q=");
  await expect(page.getByText(/matching listings/).first()).toBeVisible();

  const search = page.getByRole("textbox", {
    name: "Search products, retailers, or site URLs",
  });
  await search.fill("Sky Dragon,Bartholomew Bear");
  await search.press("Enter");
  await expect(page.getByRole("button", { name: "Remove Sky Dragon" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Bartholomew Bear" })).toBeVisible();
  await expect(page.getByText("30 matching listings")).toBeVisible();
  expectUrlParam(page, "q", "Sky Dragon,Bartholomew Bear");

  await page.getByRole("button", { name: "Remove Bartholomew Bear" }).click();
  await expect(page.getByText("18 matching listings")).toBeVisible();
  expectUrlParam(page, "q", "Sky Dragon");

  await page.getByLabel("Stock").selectOption("in stock");
  await page.getByLabel("Match").selectOption("confirmed");
  await page.getByLabel("Historical").check();
  expectUrlParam(page, "stock", "in stock");
  expectUrlParam(page, "match", "confirmed");
  expectUrlParam(page, "history", "1");

  await page.getByRole("button", { name: "By store", exact: true }).click();
  await expect(page.locator(".store-group-row").first()).toBeVisible();
  expectUrlParam(page, "view", "store");
  const firstGroup = page.locator(".store-group-row button").first();
  await firstGroup.click();
  await expect(firstGroup.locator("span")).toHaveText("+");

  await page.locator("th.column-checked button").click();
  await expect(page.locator("th.column-checked button")).toHaveText("Checked");
  await page.locator("th.column-checked button").click();
  await expect(page.locator("th.column-checked button")).toContainText("Checked ↓");

  await page.getByRole("button", { name: "Remove Sky Dragon" }).click();
  await page.getByLabel("Stock").selectOption("all");
  await page.getByLabel("Match").selectOption("all");
  await page.getByRole("button", { name: "Flat", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText(/Page 2 of/)).toBeVisible();
  expectUrlParam(page, "p", "2");

  await expect(page.getByRole("link", { name: "Open ↗" }).first()).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
});

test("health controls filter, group, select, and queue optimistically", async ({ page }) => {
  await page.goto("/?variant=A&page=health&view=flat&p=1&theme=light&q=&health=all");
  await expect(page.getByRole("heading", { name: "Storefront health" })).toBeVisible();
  await expect(page.getByText("Collector running")).toBeVisible();

  await page.getByRole("button", { name: "Needs attention" }).click();
  await expect(page.locator(".health-table tbody")).toContainText("Tiny Hanger");
  await expect(page.locator(".health-table tbody")).not.toContainText("Little Tulips");
  expectUrlParam(page, "health", "attention");

  await page.getByRole("button", { name: "healthy" }).click();
  await expect(page.locator(".health-table tbody")).toContainText("Little Tulips");
  await expect(page.locator(".health-table tbody")).not.toContainText("Tiny Hanger");

  await page.getByRole("button", { name: "all", exact: true }).click();
  await page.getByRole("button", { name: /Table \+ inspector/ }).click();
  await page.getByRole("button", { name: /Maison Baby & Kids/ }).first().click();
  await expect(page.getByLabel("Selected storefront").getByRole("heading")).toHaveText(
    "Maison Baby & Kids",
  );
  expectUrlParam(page, "store", "maison");

  await page.getByRole("button", { name: /Store outline/ }).click();
  await expect(page.locator(".store-group-row").first()).toBeVisible();
  const firstGroup = page.locator(".store-group-row button").first();
  await firstGroup.click();
  await expect(firstGroup.locator("span")).toHaveText("+");
  await firstGroup.click();
  await expect(firstGroup.locator("span")).toHaveText("−");

  await page.getByRole("button", { name: /Compact ledger/ }).click();
  const retry = page.getByRole("button", { name: "Retry safely" }).first();
  await retry.click();
  const queued = page.getByRole("button", { name: /Queued/ }).first();
  await expect(queued).toBeDisabled();
  await expect(page.getByText("Repair Required").first()).toBeVisible();
  await page.waitForTimeout(800);
  await expect(queued).toBeDisabled();
  await expect(page.getByText("Repair Required").first()).toBeVisible();
});
