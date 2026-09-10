import { advanceTestClock, expect, test } from "./fixtures";

test("starts an expedition, advances its route, and exposes a combat report", async ({ page }) => {
  await page.goto("");
  await page.getByRole("link", { name: "副本组队" }).click();

  const members = page.locator('.member-options input[type="checkbox"]');
  await expect(members).toHaveCount(5);
  for (let index = 0; index < 5; index += 1) await members.nth(index).check();
  await page.locator(".page-heading select").selectOption("2");
  await expect(page.getByText(/全通 \d+\.\d{2}%/)).toBeVisible();
  await expect(page.locator(".boss-route li")).toHaveCount(4);
  await page.getByRole("button", { name: /出发：怒焰裂谷/ }).click();
  await expect(page.getByRole("dialog", { name: /怒焰裂谷 · 行动审批/ })).toBeVisible();
  await page.getByRole("button", { name: "只接任务并出发" }).click();

  await page.getByRole("link", { name: "活动进度" }).click();
  await expect(page.locator(".expedition-card")).toHaveCount(1);
  await expect(page.locator(".boss-route li.active")).toHaveCount(1);

  await advanceTestClock(page, 24 * 60 * 60 * 1_000);
  await page.getByRole("link", { name: "战斗记录" }).click();
  await expect.poll(async () => page.locator("aside nav a").count()).toBeGreaterThan(0);
  await expect(page.getByText("成员统计")).toBeVisible();
  await expect(page.getByText("副本日常")).toBeVisible();
});
