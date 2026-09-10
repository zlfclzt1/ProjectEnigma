import { expect, test } from "./fixtures";

test("saves, manages, and reapplies a fixed team", async ({ page }) => {
  await page.goto("");
  await page.getByRole("link", { name: "副本组队" }).click();

  const members = page.locator('.party-builder input[type="checkbox"]');
  await expect(members).toHaveCount(5);
  for (let index = 0; index < 5; index += 1) await members.nth(index).check();

  await page.getByRole("button", { name: "保存当前阵容" }).click();
  const nameDialog = page.getByRole("dialog", { name: "保存当前阵容" });
  await expect(nameDialog.getByLabel("队伍名称")).toHaveValue("固定队伍 1");
  await nameDialog.getByLabel("队伍名称").fill("怒焰常驻队");
  await nameDialog.getByRole("button", { name: "保存", exact: true }).click();

  await expect(page.getByText("已保存固定队伍“怒焰常驻队”。")).toBeVisible();
  for (let index = 0; index < 5; index += 1) await members.nth(index).uncheck();
  await page.getByRole("button", { name: "套用", exact: true }).click();
  for (let index = 0; index < 5; index += 1) await expect(members.nth(index)).toBeChecked();

  await page.getByRole("button", { name: "管理固定队伍" }).click();
  const manager = page.getByRole("dialog", { name: "管理固定队伍" });
  await expect(manager.getByText("怒焰常驻队", { exact: true })).toBeVisible();
  await expect(manager.getByLabel("搜索成员")).toBeVisible();
  await expect(manager.getByText("5 / 40 人")).toBeVisible();
});
