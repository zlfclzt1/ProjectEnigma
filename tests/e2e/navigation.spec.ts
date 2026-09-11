import { expect, openGame, test } from "./fixtures";

test("keeps member filters while navigating without bouncing pages", async ({ page }) => {
  await openGame(page);
  await page.getByRole("link", { name: "公会成员" }).click();
  await expect(page).toHaveURL(/#\/members$/);

  const selects = page.locator(".filter-bar select");
  const classValue = await selects.nth(0).locator("option").nth(1).getAttribute("value");
  await selects.nth(0).selectOption(classValue!);
  await selects.nth(1).selectOption("dps");

  await page.getByRole("link", { name: "公会总览" }).click();
  await expect(page).toHaveURL(/#\/overview$/);
  await page.getByRole("link", { name: "公会成员" }).click();
  await expect(page).toHaveURL(/#\/members$/);
  await expect(selects.nth(0)).toHaveValue(classValue!);
  await expect(selects.nth(1)).toHaveValue("dps");

  await page.getByRole("link", { name: "副本组队" }).click();
  await expect(page).toHaveURL(/#\/dungeons$/);
  await page.getByRole("link", { name: "活动进度" }).click();
  await expect(page).toHaveURL(/#\/activities$/);
});
