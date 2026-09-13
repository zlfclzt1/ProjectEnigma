import { expect, openGame, test } from "./fixtures";

test("browses the profession workspace and organizes the guild bank", async ({ page }) => {
  await openGame(page, "/#/professions");

  await expect(page.getByRole("heading", { name: "专业与生产" })).toBeVisible();
  await expect(page.getByText("公会仓库", { exact: true })).toBeVisible();
  await expect(page.getByText("经济观测", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("搜索材料或消耗品")).toBeVisible();

  await page.getByPlaceholder("搜索材料或消耗品").fill("铜");
  await expect(page.getByText("没有匹配的库存物品")).toBeVisible();
  await page.getByPlaceholder("搜索材料或消耗品").fill("");
  await page.getByRole("button", { name: "整理仓库" }).click();
  await expect(page.getByText("公会仓库已按物品名称整理。")).toBeVisible();
});

test("creates and persists a custom expedition supply plan", async ({ page }) => {
  await openGame(page, "/#/dungeons");

  await page.getByRole("button", { name: "新建方案" }).click();
  await expect(page.getByRole("heading", { name: "新建补给方案" })).toBeVisible();
  await page.locator(".supply-editor input").first().fill("夜行补给");
  await page.getByRole("button", { name: "添加物品" }).click();
  await page.getByRole("button", { name: "保存", exact: true }).click();

  await expect(page.getByText("补给方案“夜行补给”已保存。")).toBeVisible();
  const supplyPicker = page.locator(".supply-picker select");
  await expect(supplyPicker).toHaveValue(/.+/);
  await expect(supplyPicker).toContainText("夜行补给");

  await page.reload();
  await expect(page.locator(".supply-picker select")).toContainText("夜行补给");
});
