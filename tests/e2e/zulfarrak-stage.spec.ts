import type { Page } from "@playwright/test";
import { advanceTestClock, expect, openGame, test } from "./fixtures";

const DATABASE_NAME = "mystery-guild-master-v2";
const SAVE_STORE = "saves";
const SAVE_KEY = "primary";

async function updateSave(
  page: Page,
  action: "prepare-stage" | "guarantee-stage-run" | "add-collection-loot",
): Promise<void> {
  await page.evaluate(
    async ({ databaseName, saveStore, saveKey, requestedAction }) => {
      const request = indexedDB.open(databaseName);
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const transaction = database.transaction(saveStore, "readwrite");
      const store = transaction.objectStore(saveStore);
      const state = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const getRequest = store.get(saveKey);
        getRequest.onsuccess = () => resolve(getRequest.result as Record<string, unknown>);
        getRequest.onerror = () => reject(getRequest.error);
      });

      type MemberState = {
        id: string;
        progression: { level: number; experience: number };
      };
      type ExpeditionStage = {
        routeNodeId?: string;
        routeNodeType?: "required" | "optional" | "rare";
        encounterId: string;
        probability: number;
        rawRatios: { tank: number; healing: number; damage: number };
        durationSeconds: number;
        successRoll: number;
        lootSeed: string;
        status: "pending" | "victory" | "defeat";
        mechanics?: unknown;
      };
      type ExpeditionActivity = {
        id: string;
        type: string;
        status: string;
        participantIds: string[];
        runPlans: Array<{
          stages: ExpeditionStage[];
          rareNodeSpawns?: Record<string, boolean>;
          rareNodeReveals: Record<string, "spawned" | "absent">;
        }>;
      };
      type ItemInstance = {
        id: string;
        definitionId: string;
        randomSuffixId?: string;
        bound: boolean;
        acquiredAt: number;
        source: {
          type: "encounter";
          activityId: string;
          dungeonId: string;
          encounterId: string;
        };
        enchantmentIds: string[];
      };
      type PendingLoot = {
        id: string;
        itemInstanceId: string;
        sourceActivityId: string;
        eligibleMemberIds: string[];
        acquiredAt: number;
      };

      const guild = state.guild as {
        funds: number;
        unlockedDungeonIds: string[];
      };
      const history = state.history as {
        dungeonClearCounts: Record<string, number>;
      };
      const members = state.members as Record<string, MemberState>;
      const activities = state.activities as Record<string, ExpeditionActivity>;
      const itemInstances = state.itemInstances as Record<string, ItemInstance>;
      const pendingLoot = state.pendingLoot as Record<string, PendingLoot>;
      const collection = state.collection as {
        items: Record<string, { acquisitionCount: number; seenRandomSuffixIds: string[] }>;
      };

      if (requestedAction === "prepare-stage") {
        guild.funds = 5_000;
        history.dungeonClearCounts.deadmines = 1;
        history.dungeonClearCounts.shadowfang_keep = 1;
        history.dungeonClearCounts.uldaman = 1;
        for (const dungeonId of [
          "wailing_caverns",
          "deadmines",
          "shadowfang_keep",
          "uldaman",
          "zulfarrak",
        ]) {
          if (!guild.unlockedDungeonIds.includes(dungeonId)) {
            guild.unlockedDungeonIds.push(dungeonId);
          }
        }
        Object.values(members)
          .slice(0, 5)
          .forEach((member) => {
            member.progression.level = 45;
            member.progression.experience = 0;
          });
      }

      if (requestedAction === "guarantee-stage-run") {
        const activity = Object.values(activities).find(
          (candidate) => candidate.type === "expedition" && candidate.status === "active",
        );
        if (!activity) throw new Error("Expected an active expedition");
        const run = activity.runPlans[0];
        if (!run) throw new Error("Expected an expedition run plan");
        let rareStage = run.stages.find((stage) => stage.encounterId === "zulfarrak_zerillis");
        if (!rareStage) {
          const template = run.stages[0];
          if (!template) throw new Error("Expected an expedition stage");
          rareStage = {
            ...structuredClone(template),
            routeNodeId: "zulfarrak_zerillis",
            routeNodeType: "rare",
            encounterId: "zulfarrak_zerillis",
            probability: 1,
            successRoll: 0,
            lootSeed: "e2e:zulfarrak:zerillis",
            status: "pending",
            mechanics: undefined,
          };
          run.stages.unshift(rareStage);
        }
        run.rareNodeSpawns = {
          ...run.rareNodeSpawns,
          zulfarrak_zerillis: true,
        };
        run.rareNodeReveals.zulfarrak_zerillis = "spawned";
        for (const stage of run.stages) stage.successRoll = 0;
      }

      if (requestedAction === "add-collection-loot") {
        const activity = Object.values(activities).find(
          (candidate) => candidate.type === "expedition" && candidate.status === "completed",
        );
        if (!activity) throw new Error("Expected a completed expedition");
        const acquiredAt = Date.now();
        const additions = [
          {
            instanceId: "e2e-random-suffix-item",
            pendingId: "e2e-random-suffix-loot",
            definitionId: "9389",
            randomSuffixId: "uldaman_9389_bear",
            dungeonId: "uldaman",
            encounterId: "uldaman_revelosh",
          },
          {
            instanceId: "e2e-set-item",
            pendingId: "e2e-set-loot",
            definitionId: "10412",
            dungeonId: "wailing_caverns",
            encounterId: "wailing_caverns_lord_cobrahn",
          },
        ];
        for (const addition of additions) {
          itemInstances[addition.instanceId] = {
            id: addition.instanceId,
            definitionId: addition.definitionId,
            ...(addition.randomSuffixId ? { randomSuffixId: addition.randomSuffixId } : {}),
            bound: false,
            acquiredAt,
            source: {
              type: "encounter",
              activityId: activity.id,
              dungeonId: addition.dungeonId,
              encounterId: addition.encounterId,
            },
            enchantmentIds: [],
          };
          pendingLoot[addition.pendingId] = {
            id: addition.pendingId,
            itemInstanceId: addition.instanceId,
            sourceActivityId: activity.id,
            eligibleMemberIds: [...activity.participantIds],
            acquiredAt,
          };
          const record = collection.items[addition.definitionId] ?? {
            acquisitionCount: 0,
            seenRandomSuffixIds: [],
          };
          record.acquisitionCount += 1;
          if (
            addition.randomSuffixId &&
            !record.seenRandomSuffixIds.includes(addition.randomSuffixId)
          ) {
            record.seenRandomSuffixIds.push(addition.randomSuffixId);
          }
          collection.items[addition.definitionId] = record;
        }
        collection.items["6460"] ??= { acquisitionCount: 1, seenRandomSuffixIds: [] };
      }

      store.put(state);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      database.close();
    },
    {
      databaseName: DATABASE_NAME,
      saveStore: SAVE_STORE,
      saveKey: SAVE_KEY,
      requestedAction: action,
    },
  );
}

test("completes the playable zulfarrak stage and keeps the guild running", async ({ page }) => {
  test.setTimeout(90_000);
  await test.step("start a new guild and recruit a sixth member", async () => {
    await openGame(page);
    await expect(page.getByRole("heading", { name: "测试远征团" })).toBeVisible();
    await page.getByRole("link", { name: "招募大厅" }).click();
    await expect(page.locator(".toolbar")).toContainText("成员 5 / 10");
    await page.getByRole("button", { name: "加入公会" }).first().click();
    await expect(page.locator(".toolbar")).toContainText("成员 6 / 10");
  });

  await test.step("prepare the stage milestone and expand the guild hall", async () => {
    await updateSave(page, "prepare-stage");
    await page.reload();
    await page.getByRole("link", { name: "公会总览" }).click();
    const capacityCard = page.getByRole("button", { name: /公会成员/ });
    await expect(capacityCard).toContainText("可扩建");
    await capacityCard.click();
    await page.getByRole("button", { name: "确认扩建 · 500 G" }).click();
    await expect(page.getByRole("dialog", { name: "成员容量扩建" })).toContainText(
      "当前名册6 / 15",
    );
    await page.getByRole("button", { name: "关闭扩建面板" }).click();
  });

  await test.step("plan the optional boss and start the stage run", async () => {
    await page.getByRole("link", { name: "副本组队" }).click();
    await page.getByPlaceholder("输入副本名称").fill("祖尔法拉克");
    await page
      .locator(".dungeon-option")
      .filter({ hasText: /^祖尔法拉克/ })
      .click();
    await page.getByText("连刷上限 3 次").click();
    await page.getByRole("button", { name: "升级至 5 次 · 1000 G" }).click();
    await expect(page.locator(".page-heading select option")).toHaveCount(5);

    await page.getByRole("button", { name: "调整成员" }).click();
    const coreMembers = page.locator('.party-builder label:has-text("LV 45") input');
    await expect(coreMembers).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) await coreMembers.nth(index).check();
    await page.getByText("路线配置").click();
    const optionalBoss = page.locator(".route-options label", { hasText: "布莱中士" });
    await optionalBoss.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: "出发：祖尔法拉克" }).click();
    await expect(page.getByText("祖尔法拉克队伍已经出发，可以继续组织另一支队伍。")).toBeVisible();
  });

  await test.step("settle offline with a deterministic rare boss encounter", async () => {
    await updateSave(page, "guarantee-stage-run");
    await page.reload();
    await page.getByRole("link", { name: "活动进度" }).click();
    await expect(page.getByText(/探索途中发现了稀有首领“泽雷利斯”/)).toBeVisible();
    await advanceTestClock(page, 24 * 60 * 60 * 1_000);
    const completed = page.locator('.expedition-card[data-status="completed"]', {
      hasText: "祖尔法拉克",
    });
    await expect(completed).toBeVisible({ timeout: 15_000 });
    await expect(completed).toContainText("已完成");
  });

  await test.step("review the greedy loot plan and execute all decisions", async () => {
    await updateSave(page, "add-collection-loot");
    await page.reload();
    await page.getByRole("link", { name: "装备分配" }).click();
    await expect(page.locator(".loot-detail h3")).toBeVisible();

    await expect(page.locator(".loot-queue")).toBeVisible();
    await expect(page.getByText("主职责提升", { exact: true })).toBeVisible();
    const alternative = page.locator(".candidate-row:not(.active):not(:disabled)").first();
    if (await alternative.isVisible()) {
      await alternative.click();
      const assignmentDialog = page.getByRole("dialog", { name: "确认立即分配" });
      await expect(assignmentDialog).toBeVisible();
      await assignmentDialog.getByRole("button", { name: "确认分配" }).click();
      await expect(page.getByText(/获得了/).first()).toBeVisible();
    }
    await page.getByRole("button", { name: "一键自动分配" }).click();
    const autoDialog = page.getByRole("dialog", { name: "一键自动分配本次活动？" });
    await expect(autoDialog).toBeVisible();
    await autoDialog.getByRole("button", { name: "确认自动分配" }).click();
    await expect(page.getByText(/自动分配完成/)).toBeVisible();
    await expect(page.locator(".queue-entry")).toHaveCount(0);
  });

  await test.step("verify collection progress, graduation, and post-clear persistence", async () => {
    await page.getByRole("link", { name: "装备图鉴" }).click();
    const randomItem = page.locator(".catalog-item", { hasText: "鲁恩乌的肩甲" });
    await expect(randomItem).toContainText("已获得");
    await randomItem.locator(".item-summary").click();
    await expect(randomItem.locator(".catalog-tooltip")).toContainText("野熊之");
    await expect(page.locator(".set-card")).toHaveCount(0);
    const graduation = page.locator(".reward-card", { hasText: "45 级时代毕业" });
    await expect(graduation).toContainText("已领取");

    await page.reload();
    await expect(page.locator(".reward-card", { hasText: "45 级时代毕业" })).toContainText(
      "已领取",
    );
    await page.getByRole("link", { name: "副本组队" }).click();
    const dungeonSelector = page.getByPlaceholder("输入副本名称");
    await dungeonSelector.fill("祖尔法拉克");
    await expect(page.locator(".dungeon-option").filter({ hasText: /^祖尔法拉克/ })).toBeVisible();
    await dungeonSelector.fill("玛拉顿");
    await expect(page.locator(".dungeon-option").filter({ hasText: /^玛拉顿/ })).toBeVisible();
    await expect(page.locator(".page-heading select option")).toHaveCount(5);
    await page.getByRole("link", { name: "招募大厅" }).click();
    await expect(page.getByRole("heading", { name: "今天谁在找公会？" })).toBeVisible();
  });
});
