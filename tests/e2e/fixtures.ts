import { expect, test as base, type Page } from "@playwright/test";

export const TEST_START_TIME = 1_800_000_000_000;

export const test = base.extend<{ assertNoBrowserErrors: void }>({
  assertNoBrowserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      await page.addInitScript((timestamp) => {
        const runtime = globalThis as { __MYSTERY_TEST_NOW__?: number };
        const stored = sessionStorage.getItem("mystery-test-now");
        runtime.__MYSTERY_TEST_NOW__ = stored ? Number(stored) : timestamp;
        sessionStorage.setItem("mystery-test-now", String(runtime.__MYSTERY_TEST_NOW__));
      }, TEST_START_TIME);
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`console: ${message.text()}`);
      });
      await use();
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";

export async function advanceTestClock(page: Page, milliseconds: number): Promise<void> {
  await page.evaluate((amount) => {
    const runtime = globalThis as { __MYSTERY_TEST_NOW__?: number };
    runtime.__MYSTERY_TEST_NOW__ = (runtime.__MYSTERY_TEST_NOW__ ?? Date.now()) + amount;
    sessionStorage.setItem("mystery-test-now", String(runtime.__MYSTERY_TEST_NOW__));
  }, milliseconds);
}

export async function openGame(page: Page, target = ""): Promise<void> {
  await page.goto(target);
  const guildName = page.getByLabel("公会名称");
  if (await guildName.isVisible().catch(() => false)) {
    await guildName.fill("测试远征团");
    await page.getByRole("button", { name: "开始远征" }).click();
    await expect(page.getByLabel("版本 V2")).toBeVisible();
  }
}
