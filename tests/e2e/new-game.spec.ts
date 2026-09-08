import { expect, test } from "./fixtures";

test("creates an isolated V2 guild with a complete starting roster", async ({ page }) => {
  await page.goto("");

  await expect(page.getByRole("heading", { name: "公会会长 V2" })).toBeVisible();
  await expect(page.getByText("5 / 10", { exact: true })).toBeVisible();
  await expect(page.getByText("3 / 10", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "公会成员" })).toBeVisible();
  await expect(page.getByRole("link", { name: "副本组队" })).toBeVisible();
});
