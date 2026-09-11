import { expect, test } from "./fixtures";

test("creates an isolated V2 guild with a complete starting roster", async ({ page }) => {
  await page.goto("");

  await expect(page.getByRole("heading", { name: "建立你的公会" })).toBeVisible();
  await expect(page.getByLabel("公会名称")).toHaveValue("");
  await page.getByLabel("公会名称").fill("测试远征团");
  await page.getByRole("button", { name: "开始远征" }).click();

  await expect(page.getByLabel("版本 V2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "测试远征团" })).toBeVisible();
  await expect(page.getByText("5 / 10", { exact: true })).toBeVisible();
  await expect(page.getByText("3 / 10", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "公会成员" })).toBeVisible();
  await expect(page.getByRole("link", { name: "副本组队" })).toBeVisible();
});
