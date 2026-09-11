import { expect, openGame, test } from "./fixtures";

test("persists application commands in isolated IndexedDB across reloads", async ({ page }) => {
  await openGame(page);
  await page.getByRole("link", { name: "招募大厅" }).click();
  await expect(page.locator("article.candidate-card")).toHaveCount(3);

  await page.getByRole("button", { name: /立即物色新人/ }).click();
  await expect(page.locator("article.candidate-card")).toHaveCount(4);
  await expect(page.locator(".guild-meta")).toContainText("0 G");

  await page.reload();
  await expect(page.locator("article.candidate-card")).toHaveCount(4);
  await expect(page.locator(".guild-meta")).toContainText("0 G");
});

test("keeps the V1 localStorage save and clearly starts a separate V2 guild", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("mystery-guild-master-save-v1", '{"guildName":"旧公会"}');
  });
  await page.goto("");

  await expect(page.getByText(/检测到旧版存档/)).toBeVisible();
  await expect(page.getByText(/将创建一个全新的游戏/)).toBeVisible();
  await expect(page.getByText(/旧存档仍保留在浏览器中/)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("mystery-guild-master-save-v1")))
    .toBe('{"guildName":"旧公会"}');
});
