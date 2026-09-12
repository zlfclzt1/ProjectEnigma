import { expect, openGame, test } from "./fixtures";

test("keeps the dungeon page compact and searches the full dungeon catalog", async ({ page }) => {
  await openGame(page);
  await page.getByRole("link", { name: "副本组队" }).click();

  await expect(page.locator(".dungeon-selector")).toBeVisible();
  await expect(page.locator(".dungeon-option")).toHaveCount(27);
  await page.getByPlaceholder("输入副本名称").fill("黑石深渊");
  await page
    .locator(".dungeon-option")
    .filter({ hasText: /^黑石深渊：禁闭区/ })
    .click();
  await expect(page.locator(".dungeon-option.selected")).toContainText("黑石深渊：禁闭区");
});

test("uses a single-column dungeon picker at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page);
  await page.getByRole("link", { name: "副本组队" }).click();
  await expect(page.locator(".dungeon-selector")).toBeVisible();
  await expect(page.locator(".dungeon-selector input[type=search]")).toBeVisible();
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).resolves.toBe(true);
});

test("previews the selected lineup's base clear chance while switching dungeons", async ({
  page,
}) => {
  await openGame(page);
  await page.getByRole("link", { name: "副本组队" }).click();
  await page.getByRole("button", { name: "调整成员" }).click();
  const members = page.locator('.party-builder input[type="checkbox"]');
  for (let index = 0; index < 5; index += 1) await members.nth(index).check();

  await expect(page.locator(".party-preview")).toContainText(/全通 \d+\.\d{2}%/);
  await expect(page.locator(".party-preview")).toContainText("出发预览");
});
