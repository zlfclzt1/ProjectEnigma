import { expect, test } from "./fixtures";

test("browses the unlocked item catalog without revealing locked loot", async ({ page }) => {
  await page.goto("");
  await page.getByRole("link", { name: "装备图鉴" }).click();
  await expect(page).toHaveURL(/#\/catalog$/);
  await expect(page.getByRole("heading", { name: "装备图鉴" })).toBeVisible();
  await expect(page.locator(".dungeon-catalog")).toHaveCount(15);
  await expect(page.getByText("装备资料封存中").first()).toBeVisible();
  await expect(page.getByText("狼王斗篷")).toHaveCount(0);

  const item = page.locator(".catalog-item").first();
  await item.locator(".item-summary").click();
  await expect(item.locator(".catalog-tooltip")).toBeVisible();
  await expect(item.locator(".catalog-tooltip")).toContainText("权重");

  await page.locator(".catalog-filters select").nth(6).selectOption("missing");
  await expect(page.getByText(/当前筛选显示 \d+ 条 Boss 掉落/)).toBeVisible();
});

test("keeps the catalog usable at a narrow mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/catalog");

  await expect(page.getByRole("heading", { name: "装备图鉴" })).toBeVisible();
  await expect(page.locator(".catalog-filters select")).toHaveCount(7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("claims collection rewards once and persists their effects", async ({ page }) => {
  await page.goto("");
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
    const guild = state.guild as { unlockedDungeonIds: string[] };
    if (!guild.unlockedDungeonIds.includes("wailing_caverns")) {
      guild.unlockedDungeonIds.push("wailing_caverns");
    }
    const collection = state.collection as {
      items: Record<string, { acquisitionCount: number; seenRandomSuffixIds: string[] }>;
      claimedRewardIds: string[];
    };
    collection.claimedRewardIds.push("prototype_wailing_collection_set");
    for (const itemId of [
      "10412",
      "6460",
      "13245",
      "6472",
      "5404",
      "10410",
      "6465",
      "6447",
      "6473",
      "6449",
      "6448",
    ]) {
      collection.items[itemId] = { acquisitionCount: 1, seenRandomSuffixIds: [] };
    }
    store.put(state);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await page.getByRole("link", { name: "装备图鉴" }).click();

  const setFilter = page.locator(".catalog-filters select").nth(2);
  await expect(setFilter).toBeEnabled();
  await expect(page.locator(".reward-card", { hasText: "成套归档" })).toContainText("已领取");

  const fundsReward = page.locator(".reward-card", { hasText: "洞穴寻踪" });
  await fundsReward.getByRole("button", { name: "领取奖励" }).click();
  await expect(page.locator(".guild-meta")).toContainText("350 G");

  await page.reload();
  await expect(page.locator(".reward-card", { hasText: "洞穴寻踪" })).toContainText("已领取");
  await expect(page.locator(".catalog-filters select").nth(2)).toBeEnabled();
  await expect(page.locator(".guild-meta")).toContainText("350 G");
});
