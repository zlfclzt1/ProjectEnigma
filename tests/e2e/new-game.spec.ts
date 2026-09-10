import { expect, test } from "./fixtures";

test("creates an isolated V2 guild with a complete starting roster", async ({ page }) => {
  await page.goto("");

  await expect(page.locator("h1")).toHaveCount(0);
  await expect(page.getByLabel("版本 V2")).toBeVisible();
  await expect(page.getByText("5 / 10", { exact: true })).toBeVisible();
  await expect(page.getByText("3 / 10", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "公会成员" })).toBeVisible();
  await expect(page.getByRole("link", { name: "副本组队" })).toBeVisible();
});
