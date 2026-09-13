import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import {
  startCraftingCommand,
  startGatheringCommand,
} from "../../src/application/commands/start-profession-activities";
import { learnProfessionCommand } from "../../src/application/commands/learn-profession";
import { learnRecipeCommand } from "../../src/application/commands/learn-recipe";
import { trainProfessionCommand } from "../../src/application/commands/train-profession";
import { upgradeProfessionFacilityCommand } from "../../src/application/commands/upgrade-profession-facility";
import { startExpeditionCommand } from "../../src/application/commands/start-expedition";
import { assignGuildBankEquipmentCommand } from "../../src/application/commands/assign-guild-bank-equipment";
import {
  createSupplyPlanCommand,
  duplicateSupplyPlanCommand,
  updateSupplyPlanCommand,
  deleteSupplyPlanCommand,
} from "../../src/application/commands/manage-supply-plans";
import { SettlementService } from "../../src/application/services/settlement-service";
import { createNewGame } from "../../src/domain/guild/new-game";
import type { ContentRegistry } from "../../src/content/registry";
import { asBrandedId } from "../../src/domain/shared/ids";
import type { MemberId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();
const copperOre = asBrandedId<"ItemDefinitionId">("profession_copper_ore");
const miningProfession = asBrandedId<"ProfessionDefinitionId">("mining");
const copperBar = asBrandedId<"ItemDefinitionId">("profession_copper_bar");
const sharpeningStone = asBrandedId<"ItemDefinitionId">("profession_coarse_sharpening_stone");
const roughStone = asBrandedId<"ItemDefinitionId">("profession_rough_stone");
const routeChart = asBrandedId<"ItemDefinitionId">("profession_expedition_route_chart");
const copperBracers = asBrandedId<"ItemDefinitionId">("profession_copper_bracers");

function newState(registry: ContentRegistry = content) {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("profession-integration"),
    content: registry,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("profession-integration"),
  });
}

async function execute<T>(
  state: ReturnType<typeof newState>,
  command: { execute(state: ReturnType<typeof newState>): T },
): Promise<T> {
  return command.execute(state);
}

describe("profession vertical integration", () => {
  it("runs mining -> smelting -> blacksmithing and reserves equipment slots", async () => {
    const state = newState();
    const [miner, smith] = Object.values(state.members);
    await execute(state, learnProfessionCommand(content, miner!.id, asBrandedId("mining")));
    await execute(state, learnProfessionCommand(content, smith!.id, asBrandedId("blacksmithing")));
    await execute(state, learnRecipeCommand(content, miner!.id, asBrandedId("smelt_copper_bar")));
    await execute(
      state,
      learnRecipeCommand(content, smith!.id, asBrandedId("forge_copper_bracers")),
    );

    const gathering = await execute(
      state,
      startGatheringCommand(
        { content, clock: new FakeClock(1_000) },
        { participantIds: [miner!.id], siteId: asBrandedId("copper-vein-zone"), quantity: 1 },
      ),
    );
    expect(state.members[miner!.id]!.activeActivityId).toBe(gathering.id);
    new SettlementService(content).settleDueActivities(state, Number.MAX_SAFE_INTEGER);
    expect(state.guildBank.stackCounts[copperOre]).toBeGreaterThanOrEqual(3);

    await execute(
      state,
      startCraftingCommand(
        { content, clock: new FakeClock(2_000) },
        { participantIds: [miner!.id], recipeId: asBrandedId("smelt_copper_bar"), quantity: 2 },
      ),
    );
    expect(state.guildBank.reservedStackCounts?.[copperOre]).toBe(2);
    new SettlementService(content).settleDueActivities(state, Number.MAX_SAFE_INTEGER);
    expect(state.guildBank.stackCounts[copperBar]).toBe(2);
    expect(state.guildBank.reservedStackCounts?.[copperOre]).toBeUndefined();

    const forging = await execute(
      state,
      startCraftingCommand(
        { content, clock: new FakeClock(3_000) },
        { participantIds: [smith!.id], recipeId: asBrandedId("forge_copper_bracers"), quantity: 1 },
      ),
    );
    expect(forging.outputEquipmentReservations).toBe(1);
    expect(state.guildBank.reservedEquipmentSlots).toBe(1);
    new SettlementService(content).settleDueActivities(state, Number.MAX_SAFE_INTEGER);
    expect(state.guildBank.reservedEquipmentSlots ?? 0).toBe(0);
    expect(state.guildBank.equipmentInstanceIds).toHaveLength(1);
    expect(Object.values(state.itemInstances).some((item) => item.source.type === "crafting")).toBe(
      true,
    );
    expect(state.collection.items[copperBracers]?.acquisitionCount).toBe(1);
    const craftedId = state.guildBank.equipmentInstanceIds[0]!;
    let assignedMemberId: MemberId | undefined;
    for (const member of Object.values(state.members)) {
      try {
        await execute(state, assignGuildBankEquipmentCommand(content, craftedId, member.id));
        assignedMemberId = member.id;
        break;
      } catch {
        // 铜质护腕遵循职业护甲熟练度，寻找当前可装备的成员。
      }
    }
    expect(assignedMemberId).toBeDefined();
    expect(state.guildBank.equipmentInstanceIds).toHaveLength(0);
    expect(state.members[assignedMemberId!]!.equipment.wrist).toBe(craftedId);
  });

  it("allocates only available supply per run and consumes each successful run once", async () => {
    const state = newState();
    const members = Object.values(state.members);
    state.guildBank.stackCounts[sharpeningStone] = 2;
    const activity = await execute(
      state,
      startExpeditionCommand(
        { content, clock: new FakeClock(2_000) },
        {
          dungeonId: asBrandedId("ragefire_chasm"),
          participantIds: members.map((member) => member.id),
          requestedRuns: 3,
          supplyPlanId: asBrandedId("standard-blacksmithing-supply"),
        },
      ),
    );
    expect(activity.supplySnapshot?.entries[0]).toMatchObject({
      requiredQuantity: 3,
      allocatedQuantity: 2,
      consumedQuantity: 0,
    });
    expect(state.guildBank.reservedStackCounts?.[sharpeningStone]).toBe(2);
    const live = state.activities[activity.id];
    if (!live || live.type !== "expedition") throw new Error("Expected expedition activity");
    for (const stage of live.runPlans.flatMap((run) => run.stages)) {
      stage.successRoll = 0;
    }
    const service = new SettlementService(content);
    service.settleDueActivities(state, Number.MAX_SAFE_INTEGER);
    expect(live.status).toBe("completed");
    expect(live.supplySnapshot?.entries[0]?.consumedQuantity).toBe(2);
    expect(state.guildBank.stackCounts[sharpeningStone]).toBeUndefined();
    expect(state.guildBank.reservedStackCounts?.[sharpeningStone]).toBeUndefined();
    expect(live.runPlans[0]!.stages[0]!.report?.supply?.channels.stability).toBe(0.06);
    expect(live.runPlans[0]!.stages[0]!.report?.supply?.entries[0]?.consumedQuantity).toBe(1);
    const snapshot = structuredClone(state.guildBank);
    service.settleDueActivities(state, Number.MAX_SAFE_INTEGER);
    expect(state.guildBank).toEqual(snapshot);
  });

  it("persists, validates, duplicates, edits and deletes custom supply plans", async () => {
    const state = newState();
    const plan = await execute(
      state,
      createSupplyPlanCommand(content, new FakeClock(2_000), "公会稳健方案", [
        {
          itemId: sharpeningStone,
          quantityPerRun: 1,
          effectId: asBrandedId("coarse-sharpening-stability"),
        },
      ]),
    );
    expect(state.guild.supplyPlans?.[plan.id]?.name).toBe("公会稳健方案");
    expect(state.economyLedger).toEqual([]);
    state.guildBank.stackCounts[sharpeningStone] = 3;
    const activity = await execute(
      state,
      startExpeditionCommand(
        { content, clock: new FakeClock(3_000) },
        {
          dungeonId: asBrandedId("ragefire_chasm"),
          participantIds: Object.values(state.members).map((member) => member.id),
          requestedRuns: 2,
          supplyPlanId: plan.id,
        },
      ),
    );
    expect(activity.supplySnapshot?.planId).toBe(plan.id);
    expect(state.economyLedger?.some((entry) => entry.kind === "supply-allocated")).toBe(true);
    const copy = await execute(
      state,
      duplicateSupplyPlanCommand(content, new FakeClock(4_000), plan.id, "公会稳健方案 2"),
    );
    expect(copy.id).not.toBe(plan.id);
    const updated = await execute(
      state,
      updateSupplyPlanCommand(content, new FakeClock(5_000), copy.id, "公会轻装方案", [
        { itemId: sharpeningStone, quantityPerRun: 2 },
      ]),
    );
    expect(updated.name).toBe("公会轻装方案");
    await execute(state, deleteSupplyPlanCommand(plan.id));
    expect(state.guild.supplyPlans?.[plan.id]).toBeUndefined();
    await expect(
      execute(
        state,
        createSupplyPlanCommand(content, new FakeClock(6_000), "坏方案", [
          { itemId: copperBracers, quantityPerRun: 1 },
        ]),
      ),
    ).rejects.toThrow("只有材料或消耗品");
  });

  it("turns blacksmithing materials into a route-exploration supply item", async () => {
    const state = newState();
    const smith = Object.values(state.members)[0]!;
    await execute(state, learnProfessionCommand(content, smith.id, asBrandedId("blacksmithing")));
    await execute(
      state,
      learnRecipeCommand(content, smith.id, asBrandedId("forge_expedition_route_chart")),
    );
    state.guildBank.stackCounts[copperBar] = 2;
    state.guildBank.stackCounts[roughStone] = 1;
    await execute(
      state,
      startCraftingCommand(
        { content, clock: new FakeClock(2_000) },
        {
          participantIds: [smith.id],
          recipeId: asBrandedId("forge_expedition_route_chart"),
          quantity: 1,
        },
      ),
    );
    new SettlementService(content).settleDueActivities(state, Number.MAX_SAFE_INTEGER);
    expect(state.guildBank.stackCounts[routeChart]).toBe(1);
  });

  it("gates advanced mining and blacksmithing content behind training and facilities", async () => {
    const state = newState();
    const member = Object.values(state.members)[0]!;
    member.progression.level = 35;
    state.guild.funds = 10_000;
    await execute(state, learnProfessionCommand(content, member.id, miningProfession));
    await expect(
      execute(state, learnRecipeCommand(content, member.id, asBrandedId("smelt_thorium_bar"))),
    ).rejects.toThrow("训练等级不足");
    for (let index = 0; index < 3; index += 1) {
      await execute(state, trainProfessionCommand(content, member.id, miningProfession));
      await execute(state, upgradeProfessionFacilityCommand(content, asBrandedId("mining-camp")));
    }
    state.members[member.id]!.professionStates![miningProfession]!.skill = 250;
    await execute(state, learnRecipeCommand(content, member.id, asBrandedId("smelt_thorium_bar")));
    expect(state.members[member.id]!.professionStates?.[miningProfession]?.trainingRank).toBe(4);
  });

  it("reserves future stack slots so concurrent production cannot overbook capacity", async () => {
    const state = newState();
    state.guildBank.capacitySlots = 3;
    state.guildBank.stackCounts[copperOre] = 40;
    const [first, second] = Object.values(state.members);
    for (const member of [first!, second!]) {
      await execute(state, learnProfessionCommand(content, member.id, asBrandedId("mining")));
      await execute(state, learnRecipeCommand(content, member.id, asBrandedId("smelt_copper_bar")));
    }
    await execute(
      state,
      startCraftingCommand(
        { content, clock: new FakeClock(2_000) },
        { participantIds: [first!.id], recipeId: asBrandedId("smelt_copper_bar"), quantity: 20 },
      ),
    );
    expect(state.guildBank.reservedOutputStackCounts?.[copperBar]).toBe(20);
    await expect(
      execute(
        state,
        startCraftingCommand(
          { content, clock: new FakeClock(2_000) },
          {
            participantIds: [second!.id],
            recipeId: asBrandedId("smelt_copper_bar"),
            quantity: 20,
          },
        ),
      ),
    ).rejects.toThrow("活动产物");
  });

  it("charges gold for profession training tiers and raises the skill cap tier", async () => {
    const state = newState();
    const miner = Object.values(state.members)[0]!;
    miner.progression.level = 10;
    state.guild.funds = 300;
    await execute(state, learnProfessionCommand(content, miner.id, asBrandedId("mining")));
    const before = state.guild.funds;
    await execute(state, trainProfessionCommand(content, miner.id, asBrandedId("mining")));
    expect(state.guild.funds).toBe(before - 250);
    expect(state.members[miner.id]!.professionStates?.[miningProfession]?.trainingRank).toBe(2);
  });

  it("consumes the failed round and releases unexecuted supply rounds", async () => {
    const state = newState();
    const members = Object.values(state.members);
    state.guildBank.stackCounts[sharpeningStone] = 5;
    const activity = await execute(
      state,
      startExpeditionCommand(
        { content, clock: new FakeClock(2_000) },
        {
          dungeonId: asBrandedId("ragefire_chasm"),
          participantIds: members.map((member) => member.id),
          requestedRuns: 3,
          supplyPlanId: asBrandedId("standard-blacksmithing-supply"),
        },
      ),
    );
    const live = state.activities[activity.id];
    if (!live || live.type !== "expedition") throw new Error("Expected expedition activity");
    live.runPlans[0]!.stages[0]!.probability = 0.5;
    live.runPlans[0]!.stages[0]!.successRoll = 0.99;
    new SettlementService(content).settleDueActivities(state, Number.MAX_SAFE_INTEGER);
    expect(live.status).toBe("failed");
    expect(live.supplySnapshot?.entries[0]?.consumedQuantity).toBe(1);
    expect(live.supplySnapshot?.entries[0]?.releasedQuantity).toBe(2);
    expect(state.guildBank.stackCounts[sharpeningStone]).toBe(4);
    expect(state.guildBank.reservedStackCounts?.[sharpeningStone]).toBeUndefined();
  });
});
