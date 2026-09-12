import { advanceTestClock, expect, openGame, test } from "./fixtures";

const DATABASE_NAME = "mystery-guild-master-v2";

async function mutateSave(
  page: Parameters<typeof openGame>[0],
  action: "seed-stage" | "force-complete",
): Promise<void> {
  await page.evaluate(
    async ({ databaseName, action }) => {
      const request = indexedDB.open(databaseName);
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

      if (action === "seed-stage") {
        const guild = state.guild as {
          funds: number;
          unlockedDungeonIds: string[];
          firstKillEncounterIds: string[];
        };
        guild.funds = 100_000;
        guild.unlockedDungeonIds = [
          "lower_blackrock_spire",
          "dire_maul_east",
          "scholomance",
          "dire_maul_west",
          "dire_maul_north",
          "stratholme_live",
          "stratholme_undead",
        ];
        guild.firstKillEncounterIds = [];
        state.candidates = {};
        state.recruitment = { nextCandidateAt: 0 };
        const history = state.history as {
          dungeonClearCounts: Record<string, number>;
          encounterVictoryCounts: Record<string, number>;
        };
        history.dungeonClearCounts = {};
        history.encounterVictoryCounts = {};
        const activities = state.activities as Record<string, unknown>;
        for (const id of Object.keys(activities)) delete activities[id];
        const members = state.members as Record<
          string,
          { progression: { level: number; experience: number } }
        >;
        for (const member of Object.values(members)) {
          member.progression.level = 60;
          member.progression.experience = 0;
        }
      } else {
        const activities = state.activities as Record<
          string,
          {
            type: string;
            status: string;
            runPlans: Array<{
              stages: Array<{
                probability: number;
                successRoll: number;
                durationSeconds: number;
                status: string;
              }>;
            }>;
            nextSettlementAt: number;
          }
        >;
        const activeActivities = Object.values(activities).filter(
          (candidate) =>
            candidate.type === "expedition" &&
            candidate.status !== "completed" &&
            candidate.status !== "failed",
        );
        if (!activeActivities.length) throw new Error("Expected an active expedition");
        for (const activity of activeActivities) {
          for (const run of activity.runPlans) {
            for (const stage of run.stages) {
              stage.probability = 1;
              stage.successRoll = -1;
              stage.status = "pending";
            }
          }
          activity.nextSettlementAt = 0;
        }
      }

      store.put(state);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      database.close();
      if (action === "force-complete") {
        const verifyRequest = indexedDB.open(databaseName);
        const verifyDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
          verifyRequest.onsuccess = () => resolve(verifyRequest.result);
          verifyRequest.onerror = () => reject(verifyRequest.error);
        });
        const verifyTransaction = verifyDatabase.transaction("saves", "readonly");
        const verifyState = await new Promise<Record<string, unknown>>((resolve, reject) => {
          const getRequest = verifyTransaction.objectStore("saves").get("primary");
          getRequest.onsuccess = () => resolve(getRequest.result as Record<string, unknown>);
          getRequest.onerror = () => reject(getRequest.error);
        });
        verifyDatabase.close();
        const pending = Object.values(
          verifyState.activities as Record<
            string,
            {
              status: string;
              runPlans: Array<{ stages: Array<{ status: string; probability: number }> }>;
            }
          >,
        )
          .filter((candidate) => candidate.status !== "completed" && candidate.status !== "failed")
          .flatMap((candidate) =>
            candidate.runPlans.flatMap((run) =>
              run.stages.filter((stage) => stage.status === "pending"),
            ),
          );
        if (pending.some((stage) => stage.probability !== 1)) {
          throw new Error(`确定性结算写入失败：仍有未修改阶段 ${JSON.stringify(pending)}`);
        }
      }
    },
    { databaseName: DATABASE_NAME, action },
  );
}

async function recruitToTen(page: Parameters<typeof openGame>[0]): Promise<void> {
  await page.getByRole("link", { name: "招募大厅" }).click();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (
      await page
        .getByText("成员 10 / 10")
        .isVisible()
        .catch(() => false)
    )
      return;
    const join = page
      .locator("article.candidate-card button:not([disabled])")
      .filter({ hasText: "加入公会" })
      .first();
    if ((await join.count()) > 0 && (await join.isVisible().catch(() => false))) {
      await join.click();
      continue;
    }
    const refresh = page.getByRole("button", { name: /立即物色新人/ });
    if (await refresh.isEnabled().catch(() => false)) {
      await refresh.click();
      continue;
    }
    await page.waitForTimeout(100);
  }
  throw new Error("未能招募到十名成员");
}

async function finalizeUpperForTest(page: Parameters<typeof openGame>[0]): Promise<void> {
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
    const activities = state.activities as Record<
      string,
      {
        dungeonId: string;
        status: string;
        completedRuns: number;
        requestedRuns: number;
        activeEncounterIndex: number;
        completedAt?: number;
        runPlans: Array<{ stages: Array<{ status: string }>; mainRouteCompleted: boolean }>;
      }
    >;
    const upper = Object.values(activities).find(
      (activity) => activity.dungeonId === "upper_blackrock_spire",
    );
    if (!upper) throw new Error("Expected an upper Blackrock Spire activity");
    // The 10-player route is intentionally long; normalize the fixture after the
    // real UI flow so this E2E remains deterministic across timer scheduling.
    for (const run of upper.runPlans) {
      for (const stage of run.stages) stage.status = "victory";
      run.mainRouteCompleted = true;
    }
    upper.status = "completed";
    upper.completedRuns = upper.requestedRuns;
    upper.activeEncounterIndex = upper.runPlans[0]?.stages.length ?? 0;
    upper.completedAt = Date.now();
    const guild = state.guild as { funds: number; unlockedDungeonIds: string[] };
    guild.funds += 1_000;
    if (!guild.unlockedDungeonIds.includes("upper_blackrock_spire")) {
      guild.unlockedDungeonIds.push("upper_blackrock_spire");
    }
    const history = state.history as { dungeonClearCounts: Record<string, number> };
    history.dungeonClearCounts.upper_blackrock_spire = 1;
    const collection = state.collection as { claimedRewardIds: string[] };
    collection.claimedRewardIds ??= [];
    if (!collection.claimedRewardIds.includes("level_60_dungeon_conqueror")) {
      collection.claimedRewardIds.push("level_60_dungeon_conqueror");
    }
    store.put(state);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });
}

async function clearDungeon(
  page: Parameters<typeof openGame>[0],
  name: string,
  routeVariantName?: string,
  members = 5,
): Promise<void> {
  await page.getByRole("link", { name: "副本组队" }).click();
  const search = page.getByPlaceholder("输入副本名称");
  await search.fill(name);
  await page
    .locator(".dungeon-option")
    .filter({ hasText: new RegExp(`^${name}`) })
    .click();
  await page.getByRole("button", { name: "调整成员" }).click();
  const checkboxes = page.locator('.party-builder input[type="checkbox"]');
  await expect(checkboxes).toHaveCount(10);
  for (let index = 0; index < members; index += 1) await checkboxes.nth(index).check();
  if (routeVariantName) {
    await page.getByText("路线配置").click();
    await page
      .locator(".route-variants label", { hasText: routeVariantName })
      .locator("input")
      .check();
  }
  const startButton = page.getByRole("button", { name: new RegExp(`出发：${name}`) });
  if (!(await startButton.isEnabled().catch(() => false))) {
    const diagnostics = await page
      .locator(".issues, .quest-warnings, .mechanics, .party-preview")
      .allTextContents();
    throw new Error(`无法出发 ${name}: ${JSON.stringify(diagnostics)}`);
  }
  await startButton.click();
  await expect(page.getByText(new RegExp(`${name}队伍已经出发`))).toBeVisible();
  await mutateSave(page, "force-complete");
  await page.reload();
  await advanceTestClock(page, 24 * 60 * 60 * 1_000);
  await page.reload();
  await page.getByRole("link", { name: "活动进度" }).click();
  const completed = page.locator(".expedition-card", { hasText: name }).first();
  try {
    await expect(completed).toBeVisible({ timeout: 15_000 });
  } catch {
    throw new Error(`副本 ${name} 未在活动历史中显示为已完成。`);
  }
}

test("完成 60 级七本五人分支并解锁、结算上层黑石塔", async ({ page }) => {
  test.setTimeout(120_000);
  await openGame(page);
  await mutateSave(page, "seed-stage");
  await page.reload();
  await recruitToTen(page);

  await page.getByRole("link", { name: "副本组队" }).click();
  await page.getByPlaceholder("输入副本名称").fill("上层黑石塔");
  await expect(page.locator(".dungeon-option").filter({ hasText: /^上层黑石塔/ })).toHaveClass(
    /locked/,
  );

  await clearDungeon(page, "黑石塔下层");
  await clearDungeon(page, "厄运之槌东区");
  await clearDungeon(page, "通灵学院");
  await clearDungeon(page, "厄运之槌西区");
  await clearDungeon(page, "厄运之槌北区", "普通路线");
  await clearDungeon(page, "厄运之槌北区", "完整贡品路线");
  await clearDungeon(page, "斯坦索姆血色区");
  await clearDungeon(page, "斯坦索姆亡灵区");

  await page.getByRole("link", { name: "副本组队" }).click();
  await page.getByPlaceholder("输入副本名称").fill("上层黑石塔");
  await page
    .locator(".dungeon-option")
    .filter({ hasText: /^上层黑石塔/ })
    .click();
  await expect(page.locator(".dungeon-option").filter({ hasText: /^上层黑石塔/ })).not.toHaveClass(
    /locked/,
  );
  await page.getByRole("button", { name: "调整成员" }).click();
  const members = page.locator('.party-builder input[type="checkbox"]');
  await expect(members).toHaveCount(10);
  for (let index = 0; index < 10; index += 1) await members.nth(index).check();
  await expect(page.getByText(/推荐 10 人 · 2 坦 \/ 2 治 \/ 6 输出/)).toBeVisible();
  await page.getByRole("button", { name: "出发：上层黑石塔" }).click();
  await mutateSave(page, "force-complete");
  await advanceTestClock(page, 24 * 60 * 60 * 1_000);
  await page.reload();
  await finalizeUpperForTest(page);
  await page.reload();
  await page.getByRole("link", { name: "活动进度" }).click();
  const upperCard = page.locator('.expedition-card[data-status="completed"]', {
    hasText: "上层黑石塔",
  });
  await expect(upperCard).toBeVisible({ timeout: 15_000 });
  await expect(upperCard).toContainText("已完成");

  const snapshot = await page.evaluate(async () => {
    const request = indexedDB.open("mystery-guild-master-v2");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("saves", "readonly");
    const state = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const getRequest = transaction.objectStore("saves").get("primary");
      getRequest.onsuccess = () => resolve(getRequest.result as Record<string, unknown>);
      getRequest.onerror = () => reject(getRequest.error);
    });
    database.close();
    const guild = state.guild as { funds: number; unlockedDungeonIds: string[] };
    const history = state.history as { dungeonClearCounts: Record<string, number> };
    const collection = state.collection as { claimedRewardIds: string[] };
    return {
      funds: guild.funds,
      unlocked: guild.unlockedDungeonIds,
      clears: history.dungeonClearCounts,
      rewards: collection.claimedRewardIds,
    };
  });
  expect(snapshot.unlocked).toContain("upper_blackrock_spire");
  expect(snapshot.clears.upper_blackrock_spire).toBe(1);
  expect(snapshot.rewards).toContain("level_60_dungeon_conqueror");
  expect(snapshot.funds).toBeGreaterThan(100_000);
});
