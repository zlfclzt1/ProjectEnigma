import { describe, expect, it } from "vitest";
import { getActivitiesView } from "../../src/application/queries/get-activities-view";
import { getDungeonPlanningView } from "../../src/application/queries/get-dungeons-view";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import { createExpeditionActivityHandler } from "../../src/domain/dungeon/expedition-activity";
import { ActivityRegistry } from "../../src/domain/activity/activity-registry";
import { ActivityScheduler } from "../../src/domain/activity/activity-scheduler";
import type { ExpeditionActivity } from "../../src/domain/activity/activity";
import type { StartExpeditionRequest } from "../../src/domain/dungeon/expedition-activity";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";
import { SettlementService } from "../../src/application/services/settlement-service";

const content = loadBrowserContentRegistry();

function state() {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("dungeon-query"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("dungeon-query"),
  });
}

function contentWithMechanic(mechanicId: string, minimumValue = 99) {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const encounterKey = Object.keys(modules).find((path) =>
    path.endsWith("/content/encounters/ragefire-chasm.json"),
  )!;
  const mechanicKey = Object.keys(modules).find((path) =>
    path.endsWith("/content/mechanics/classic.json"),
  )!;
  const encounters = (modules[encounterKey] as { encounters: Array<{ mechanicIds: string[] }> })
    .encounters;
  encounters[0]!.mechanicIds = [mechanicId];
  const mechanics = (
    modules[mechanicKey] as {
      mechanics: Array<{ id: string; requirements: Array<{ minimumValue: number }> }>;
    }
  ).mechanics;
  mechanics.find((mechanic) => mechanic.id === mechanicId)!.requirements[0]!.minimumValue =
    minimumValue;
  return loadContentRegistry(modules);
}

function contentWithRareBazzalan() {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const dungeonKey = Object.keys(modules).find((path) =>
    path.endsWith("/content/dungeons/ragefire-chasm.json"),
  )!;
  const route = (
    modules[dungeonKey] as {
      dungeons: Array<{
        route: Array<{
          id: string;
          type: string;
          encounterId: string;
          spawnProbability?: number;
        }>;
      }>;
    }
  ).dungeons[0]!.route;
  const bazzalan = route.find((node) => node.encounterId === "bazzalan")!;
  bazzalan.type = "rare";
  bazzalan.spawnProbability = 0.5;
  return loadContentRegistry(modules);
}

function contentWithRareTaragaman(spawnProbability: number) {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const dungeonKey = Object.keys(modules).find((path) =>
    path.endsWith("/content/dungeons/ragefire-chasm.json"),
  )!;
  const route = (
    modules[dungeonKey] as {
      dungeons: Array<{
        route: Array<{
          id: string;
          type: string;
          encounterId: string;
          spawnProbability?: number;
        }>;
      }>;
    }
  ).dungeons[0]!.route;
  const taragaman = route.find((node) => node.encounterId === "taragaman_the_hungerer")!;
  taragaman.type = "rare";
  taragaman.spawnProbability = spawnProbability;
  return loadContentRegistry(modules);
}

function contentWithConfigurableRoutes() {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const dungeonKey = Object.keys(modules).find((path) =>
    path.endsWith("/content/dungeons/ragefire-chasm.json"),
  )!;
  const route = (
    modules[dungeonKey] as {
      dungeons: Array<{
        route: Array<{
          id: string;
          type: string;
          encounterId: string;
          description?: { zhCN: string };
          spawnProbability?: number;
        }>;
      }>;
    }
  ).dungeons[0]!.route;
  const taragaman = route.find((node) => node.encounterId === "taragaman_the_hungerer")!;
  taragaman.id = "optional_taragaman";
  taragaman.type = "optional";
  taragaman.description = { zhCN: "绕行熔岩通道挑战饥饿者。" };
  const bazzalan = route.find((node) => node.encounterId === "bazzalan")!;
  bazzalan.id = "rare_bazzalan";
  bazzalan.type = "rare";
  bazzalan.spawnProbability = 0.35;
  return loadContentRegistry(modules);
}

function contentWithOptionalQuestBoss() {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const dungeonKey = Object.keys(modules).find((path) =>
    path.endsWith("/content/dungeons/ragefire-chasm.json"),
  )!;
  const route = (
    modules[dungeonKey] as {
      dungeons: Array<{
        route: Array<{
          id: string;
          type: string;
          encounterId: string;
          description?: { zhCN: string };
        }>;
      }>;
    }
  ).dungeons[0]!.route;
  const oggleflint = route.find((node) => node.encounterId === "oggleflint")!;
  oggleflint.type = "optional";
  oggleflint.description = { zhCN: "搜索守卫尸体附近的侧路。" };
  return loadContentRegistry(modules);
}

describe("dungeon and activity queries", () => {
  it("previews each member's boosted experience and projected level before departure", () => {
    const game = state();
    const members = Object.values(game.members);
    const newcomer = members[0]!;
    newcomer.progression.level = 10;
    newcomer.progression.experience = 0.25;
    for (const veteran of members.slice(1)) veteran.progression.level = 45;

    const view = getDungeonPlanningView(
      game,
      content,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      members.map((member) => member.id),
      2,
    );

    const newcomerExperience = view.preview?.experience.find(
      (entry) => entry.memberId === newcomer.id,
    );
    expect(newcomerExperience).toMatchObject({
      memberName: newcomer.identity.name,
      currentLevel: 10,
      boostMultiplier: 0.7,
      projectedLevel: 11,
    });
    expect(newcomerExperience!.experienceFraction).toBeGreaterThan(0);
    expect(view.preview?.experience.filter((entry) => entry.experienceFraction === 0)).toHaveLength(
      4,
    );
  });

  it("previews post-graduation experience against the unlocked level-60 cap", () => {
    const game = state();
    const members = Object.values(game.members);
    for (const member of members) {
      member.progression.level = 45;
      member.progression.experience = 0;
    }
    game.guild.unlockedDungeonIds.push(asBrandedId<"DungeonId">("zulfarrak"));
    game.collection.claimedRewardIds.push(
      asBrandedId<"CollectionRewardId">("zulfarrak_level_45_graduation"),
    );

    const view = getDungeonPlanningView(
      game,
      content,
      asBrandedId<"DungeonId">("zulfarrak"),
      members.map((member) => member.id),
      3,
    );

    expect(view.preview?.levelCap).toBe(60);
    expect(view.preview?.experience).toHaveLength(5);
    expect(
      view.preview?.experience.every(
        (member) => member.experienceFraction > 0 && member.projectedLevel > 45,
      ),
    ).toBe(true);
  });

  it("projects all dungeons, filter metadata, and exact party probabilities", () => {
    const game = state();
    const memberIds = Object.values(game.members).map((member) => member.id);
    const view = getDungeonPlanningView(
      game,
      content,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      memberIds,
      2,
    );

    expect(view.dungeons).toHaveLength(17);
    expect(view.classOptions).toHaveLength(9);
    expect(view.roleOptions.map((role) => role.id)).toEqual(["tank", "healer", "dps"]);
    expect(view.selectedDungeon).toMatchObject({
      id: "ragefire_chasm",
      unlocked: true,
      maximumMembers: 5,
      encounterCount: 4,
      clearCount: 0,
    });
    expect(view.preview?.encounters).toHaveLength(4);
    expect(view.preview?.clearProbability).toBeGreaterThan(0);
    expect(view.preview?.clearProbability).toBeLessThanOrEqual(1);
    expect(view.preview?.encounters.every((boss) => boss.probability > 0)).toBe(true);
    expect(view.canStart).toBe(true);
    expect(view.maximumRuns).toBe(3);
    expect(view.runCapacityUpgrade).toMatchObject({
      id: "expedition_queue_5",
      targetCapacity: 5,
      canPurchase: false,
      requirements: [{ label: "影牙城堡完整通关", current: 0, target: 1, met: false }],
    });
  });

  it("projects a purchased five-run queue and validates the expanded selection", () => {
    const game = state();
    game.guild.purchasedUpgradeIds.push(asBrandedId<"GuildUpgradeId">("expedition_queue_5"));
    const view = getDungeonPlanningView(
      game,
      content,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      Object.values(game.members).map((member) => member.id),
      5,
    );

    expect(view.maximumRuns).toBe(5);
    expect(view.runCapacityUpgrade).toBeNull();
    expect(view.canStart).toBe(true);
    expect(view.issues).not.toContain("连续副本次数必须为 1–3 次。");
  });

  it("projects route progress without exposing the mutable activity", () => {
    const game = state();
    const memberIds = Object.values(game.members).map((member) => member.id);
    const registry = new ActivityRegistry();
    registry.register(createExpeditionActivityHandler(content));
    const scheduler = new ActivityScheduler(registry);
    const started = scheduler.start<StartExpeditionRequest, ExpeditionActivity>(
      game,
      {
        type: "expedition",
        dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
        participantIds: memberIds,
        requestedRuns: 1,
      },
      1_000,
      { ids: new LocalIdGenerator(game.ids), random: new SeededRandomSource("activity-view") },
    );
    expect(started.status).toBe("started");
    if (started.status !== "started") throw new Error("Expected expedition to start");

    const halfway =
      started.activity.nextSettlementAt -
      started.activity.runPlans[0]!.stages[0]!.durationSeconds * 500;
    const view = getActivitiesView(game, content, halfway);

    expect(view.active).toHaveLength(1);
    expect(view.active[0]).toMatchObject({
      dungeonName: "怒焰裂谷",
      participantCount: 5,
      currentRunNumber: 1,
      statusLabel: "进行中",
    });
    expect(view.active[0]!.route[0]?.status).toBe("active");
    expect(view.active[0]!.progressPercent).toBeGreaterThan(0);
    expect(view.active[0]).not.toHaveProperty("partySnapshot");
    expect(view.active[0]).not.toHaveProperty("runPlans");
  });

  it("explains soft mechanic penalties and hard Boss blockers", () => {
    const softContent = contentWithMechanic("test_recommended_magic_dispel");
    const softState = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("soft-mechanic-query"),
      content: softContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("soft-mechanic-query"),
    });
    const softView = getDungeonPlanningView(
      softState,
      softContent,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      Object.values(softState.members).map((member) => member.id),
      1,
    );
    expect(softView.canStart).toBe(true);
    expect(softView.mechanicReadiness[0]).toMatchObject({
      encounterName: "奥格弗林特",
      name: "建议驱散魔法",
      type: "recommended",
      status: "missing",
      impactLabels: ["治疗压力 +15%", "胜率 -5 个百分点", "耗时 +5%"],
    });

    const hardContent = contentWithMechanic("test_required_interrupt");
    const hardState = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("hard-mechanic-query"),
      content: hardContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("hard-mechanic-query"),
    });
    const hardView = getDungeonPlanningView(
      hardState,
      hardContent,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      Object.values(hardState.members).map((member) => member.id),
      1,
    );
    expect(hardView.canStart).toBe(false);
    expect(hardView.preview).toBeNull();
    expect(hardView.mechanicReadiness[0]).toMatchObject({
      encounterName: "奥格弗林特",
      name: "必须打断",
      type: "required",
      status: "missing",
    });
  });

  it("does not expose a locked rare spawn through the activity query before reveal", () => {
    const rareContent = contentWithRareBazzalan();
    const game = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("rare-hidden-query"),
      content: rareContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("rare-hidden-query"),
    });
    const registry = new ActivityRegistry();
    registry.register(createExpeditionActivityHandler(rareContent));
    const scheduler = new ActivityScheduler(registry);
    const started = scheduler.start<StartExpeditionRequest, ExpeditionActivity>(
      game,
      {
        type: "expedition",
        dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
        participantIds: Object.values(game.members).map((member) => member.id),
        requestedRuns: 1,
      },
      1_000,
      { ids: new LocalIdGenerator(), random: new SeededRandomSource("rare-hidden-runtime") },
    );
    if (started.status !== "started") throw new Error("Expected expedition to start");

    expect(Object.keys(started.activity.runPlans[0]!.rareNodeSpawns ?? {})).toEqual(["bazzalan"]);
    const view = getActivitiesView(game, rareContent, 1_000);
    expect(view.active[0]!.route.map((stage) => stage.id)).not.toContain("bazzalan");
    expect(view.active[0]!.totalEncounterCount).toBe(3);
    expect(view.active[0]).not.toHaveProperty("rareNodeSpawns");
  });

  it.each([
    { spawnProbability: 1, outcome: "spawned", status: "active", message: "发现了稀有首领" },
    { spawnProbability: 0, outcome: "absent", status: "absent", message: "没有发现" },
  ] as const)(
    "reveals and persists a $outcome rare route result only after reaching its position",
    ({ spawnProbability, outcome, status, message }) => {
      const rareContent = contentWithRareTaragaman(spawnProbability);
      const game = createNewGame({
        slotId: asBrandedId<"SaveSlotId">(`rare-reveal-${outcome}`),
        content: rareContent,
        contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
        clock: new FakeClock(1_000),
        ids: new LocalIdGenerator(),
        random: new SeededRandomSource(`rare-reveal-${outcome}`),
      });
      const registry = new ActivityRegistry();
      registry.register(createExpeditionActivityHandler(rareContent));
      const scheduler = new ActivityScheduler(registry);
      const started = scheduler.start<StartExpeditionRequest, ExpeditionActivity>(
        game,
        {
          type: "expedition",
          dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
          participantIds: Object.values(game.members).map((member) => member.id),
          requestedRuns: 1,
        },
        1_000,
        { ids: new LocalIdGenerator(), random: new SeededRandomSource(`runtime-${outcome}`) },
      );
      if (started.status !== "started") throw new Error("Expected expedition to start");
      const activity = game.activities[started.activity.id] as ExpeditionActivity;
      for (const stage of activity.runPlans[0]!.stages) stage.successRoll = 0;

      expect(getActivitiesView(game, rareContent, 1_000).active[0]!.rareEvents).toEqual([]);

      new SettlementService(rareContent).settleDueActivities(game, activity.nextSettlementAt);

      const revealed = getActivitiesView(game, rareContent, activity.nextSettlementAt).active[0]!;
      expect(revealed.route.find((stage) => stage.id === "taragaman_the_hungerer")).toMatchObject({
        routeNodeType: "rare",
        status,
      });
      expect(revealed.rareEvents[0]).toMatchObject({ outcome });
      expect(revealed.rareEvents[0]!.text).toContain(message);
      expect(
        getActivitiesView(structuredClone(game), rareContent, activity.nextSettlementAt).active[0]!
          .rareEvents,
      ).toEqual(revealed.rareEvents);
    },
  );

  it("projects optional choices and rare probability without exposing a spawn lock", () => {
    const routeContent = contentWithConfigurableRoutes();
    const game = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("route-planning-query"),
      content: routeContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("route-planning-query"),
    });
    const memberIds = Object.values(game.members).map((member) => member.id);
    const unselected = getDungeonPlanningView(
      game,
      routeContent,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      memberIds,
      1,
    );
    expect(unselected.optionalRoutes[0]).toMatchObject({
      id: "optional_taragaman",
      name: "饥饿者塔拉加曼",
      selected: false,
      lootItemCount: 3,
    });
    expect(unselected.optionalRoutes[0]!.probability).toBeGreaterThan(0);
    expect(unselected.rareRoutes[0]).toMatchObject({
      id: "rare_bazzalan",
      name: "巴扎兰",
      spawnProbability: 0.35,
      lootItemCount: 0,
    });
    expect(unselected.rareRoutes[0]).not.toHaveProperty("spawned");
    expect(unselected.preview!.durationRange.maximumSeconds).toBeGreaterThan(
      unselected.preview!.durationRange.minimumSeconds,
    );

    const selected = getDungeonPlanningView(
      game,
      routeContent,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      memberIds,
      1,
      [asBrandedId<"DungeonRouteNodeId">("optional_taragaman")],
    );
    expect(selected.optionalRoutes[0]!.selected).toBe(true);
    expect(selected.preview!.encounters.map((encounter) => encounter.id)).toContain(
      "taragaman_the_hungerer",
    );
    expect(selected.preview!.durationSeconds).toBeGreaterThan(unselected.preview!.durationSeconds);
  });

  it("warns about an accepted quest's unselected optional Boss without selecting it", () => {
    const questContent = contentWithOptionalQuestBoss();
    const game = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("quest-route-warning"),
      content: questContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("quest-route-warning"),
    });
    const member = Object.values(game.members)[0]!;
    const questId = asBrandedId<"QuestId">("rfc_returning_lost_satchel");
    member.quests.entries[questId] = {
      questId,
      status: "accepted",
      acceptedAt: 1_000,
      encounterVictoryIds: [],
    };

    const unselected = getDungeonPlanningView(
      game,
      questContent,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      [member.id],
      1,
    );
    expect(unselected.optionalRoutes[0]!.selected).toBe(false);
    expect(unselected.questRouteWarnings[0]).toMatchObject({
      memberId: member.id,
      questId,
      optionalNodeIds: ["oggleflint"],
      bossNames: ["奥格弗林特"],
    });

    const selected = getDungeonPlanningView(
      game,
      questContent,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      [member.id],
      1,
      [asBrandedId<"DungeonRouteNodeId">("oggleflint")],
    );
    expect(selected.questRouteWarnings).toEqual([]);
  });
});
