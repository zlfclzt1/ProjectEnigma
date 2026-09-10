import { expect, test } from "./fixtures";

test("purchases the next guild expansion and persists its capacity", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("heading", { name: "神秘公会" })).toBeVisible();

  await page.evaluate(async () => {
    const request = indexedDB.open("mystery-guild-master-v2");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("saves", "readwrite");
    const store = transaction.objectStore("saves");
    const state = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const getRequest = store.get("primary");
      getRequest.onsuccess = () => resolve(getRequest.result as Record<string, unknown>);
      getRequest.onerror = () => reject(getRequest.error);
    });
    const guild = state.guild as { funds: number };
    const history = state.history as { dungeonClearCounts: Record<string, number> };
    guild.funds = 2_000;
    history.dungeonClearCounts.deadmines = 1;
    store.put(state);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();

  const capacityCard = page.getByRole("button", { name: /公会成员/ });
  await expect(capacityCard).toContainText("可扩建");
  await capacityCard.click();
  const dialog = page.getByRole("dialog", { name: "成员容量扩建" });
  await expect(dialog).toContainText("第一次公会扩建");
  await expect(dialog).not.toContainText("第二次公会扩建");
  await page.getByRole("button", { name: "确认扩建 · 500 G" }).click();

  await expect(dialog).toContainText("当前名册5 / 15");
  await expect(dialog).toContainText("第二次公会扩建");
  await expect(page.locator(".guild-meta")).toContainText("1500 G");

  await page.reload();
  await expect(page.getByRole("button", { name: /公会成员/ })).toContainText("5 / 15");
  await expect(page.locator(".guild-meta")).toContainText("1500 G");
});
