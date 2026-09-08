import { expect, test as base, type Page } from "@playwright/test";

export const TEST_START_TIME = 1_800_000_000_000;

export const test = base.extend<{ assertNoBrowserErrors: void }>({
  assertNoBrowserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      await page.addInitScript((timestamp) => {
        (globalThis as { __MYSTERY_TEST_NOW__?: number }).__MYSTERY_TEST_NOW__ = timestamp;
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
  }, milliseconds);
}
