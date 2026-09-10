import { expect, test } from "./fixtures";

test("keeps the dungeon page compact and searches the full dungeon catalog", async ({ page }) => {
  await page.goto("");
  await page.getByRole("link", { name: "副本组队" }).click();

  await expect(page.locator(".current-dungeon")).toContainText("怒焰裂谷");
  await expect(page.locator(".dungeon-option")).toHaveCount(0);
  await page.getByRole("button", { name: "切换副本" }).click();

  const dialog = page.getByRole("dialog", { name: "选择副本" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".dungeon-option")).toHaveCount(1);
  await dialog.getByPlaceholder("输入副本名称").fill("黑石深渊");
  await expect(dialog.locator(".dungeon-option")).toHaveCount(2);
  await dialog
    .locator(".dungeon-option")
    .filter({ hasText: /^黑石深渊：禁闭区/ })
    .click();
  await expect(dialog.locator(".dungeon-detail")).toContainText("推荐等级54");
  await dialog.getByRole("button", { name: "查看这个副本" }).click();

  await expect(page.locator(".current-dungeon")).toContainText("黑石深渊：禁闭区");
  await expect(page.locator(".current-dungeon")).toContainText("未解锁");
});

test("uses a single-column dungeon picker at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  await page.getByRole("link", { name: "副本组队" }).click();
  await page.getByRole("button", { name: "切换副本" }).click();

  const dialog = page.getByRole("dialog", { name: "选择副本" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByPlaceholder("输入副本名称")).toBeVisible();
  await expect(dialog.locator(".dungeon-detail")).toBeVisible();
  await expect(dialog).toHaveCSS("width", "354px");
});

test("previews the selected lineup's base clear chance while switching dungeons", async ({
  page,
}) => {
  await page.goto("");
  await page.getByRole("link", { name: "副本组队" }).click();
  const members = page.locator('.party-builder input[type="checkbox"]');
  for (let index = 0; index < 5; index += 1) await members.nth(index).check();

  await page.getByRole("button", { name: "切换副本" }).click();
  const dialog = page.getByRole("dialog", { name: "选择副本" });
  await expect(dialog.locator(".party-preview-badge.ready")).toContainText(/基础全通 \d+\.\d{2}%/);
  await expect(dialog.locator(".party-preview-detail")).toContainText(/当前阵容 · 基础全通/);
  await expect(dialog.locator(".party-preview-detail")).toContainText(/标准路线，不含可选首领/);
});
