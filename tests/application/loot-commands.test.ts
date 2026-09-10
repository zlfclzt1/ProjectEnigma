import { describe, expect, it } from "vitest";
import { assignLootCommand } from "../../src/application/commands/assign-loot";
import { autoAssignLootCommand } from "../../src/application/commands/auto-assign-loot";
import { sellLootCommand } from "../../src/application/commands/sell-loot";
import { GameSession } from "../../src/application/services/game-session";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { ActivityStatus } from "../../src/domain/activity/activity";
import { recordAcquiredItem } from "../../src/domain/collection/item-collection";
import type { GameState } from "../../src/domain/game-state";
import { asBrandedId, type MemberId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import {
  createExpeditionActivityFixture,
  createGameStateFixture,
  createItemInstanceFixture,
  createMemberFixture,
} from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

async function createSession(state: GameState) {
  const saves = new MemorySaveRepository();
  await saves.create(state);
  return GameSession.fromState(saves, state);
}

function addPendingLoot(
  state: GameState,
  sequence: number,
  definitionId: string,
  eligibleMemberIds: readonly MemberId[],
  sourceStatus: ActivityStatus = "completed",
) {
  const activityId = asBrandedId<"ActivityId">(`loot_source_${sequence}`);
  const item = createItemInstanceFixture({
    id: asBrandedId<"ItemInstanceId">(`loot_item_${sequence}`),
    definitionId: asBrandedId<"ItemDefinitionId">(definitionId),
    ownerMemberId: undefined,
    bound: false,
    source: {
      type: "encounter",
      activityId,
      dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
      encounterId: asBrandedId<"EncounterId">("oggleflint"),
    },
  });
  const pendingId = asBrandedId<"PendingLootId">(`pending_${sequence}`);
  state.itemInstances[item.id] = item;
  recordAcquiredItem(state.collection, item, content);
  state.pendingLoot[pendingId] = {
    id: pendingId,
    itemInstanceId: item.id,
    sourceActivityId: activityId,
    eligibleMemberIds: [...eligibleMemberIds],
    acquiredAt: 2_000 + sequence,
  };
  state.activities[activityId] = createExpeditionActivityFixture({
    id: activityId,
    participantIds: [...eligibleMemberIds],
    status: sourceStatus,
    completedAt: sourceStatus === "active" ? undefined : 2_000,
  });
  return { activityId, item, pendingId };
}

function idleFixture(): GameState {
  const state = createGameStateFixture({ activities: {} });
  const member = Object.values(state.members)[0]!;
  delete member.activeActivityId;
  return state;
}

describe("manual loot commands", () => {
  it("locks loot until the source queue ends and limits assignment to recorded participants", async () => {
    const state = idleFixture();
    const eligible = Object.values(state.members)[0]!;
    const outsider = createMemberFixture({ id: asBrandedId<"MemberId">("member_2") });
    state.members[outsider.id] = outsider;
    const loot = addPendingLoot(state, 1, "14149", [eligible.id], "active");
    eligible.activeActivityId = loot.activityId;
    const session = await createSession(state);

    await expect(
      session.execute(assignLootCommand(content, loot.pendingId, eligible.id)),
    ).rejects.toThrow(/连续副本尚未结束/);
    const unlocked = session.snapshot();
    unlocked.activities[loot.activityId]!.status = "completed";
    unlocked.activities[loot.activityId]!.completedAt = 3_000;
    delete unlocked.members[eligible.id]!.activeActivityId;
    const unlockedSession = await createSession({
      ...unlocked,
      slotId: asBrandedId<"SaveSlotId">("slot_unlocked"),
      revision: 0,
    });
    await expect(
      unlockedSession.execute(assignLootCommand(content, loot.pendingId, outsider.id)),
    ).rejects.toThrow(/没有资格/);

    const result = await unlockedSession.execute(
      assignLootCommand(content, loot.pendingId, eligible.id),
    );
    expect(result.status).toBe("committed");
    if (result.status !== "committed") throw new Error("Expected assigned loot");
    const assigned = unlockedSession.snapshot();
    expect(result.result.equippedSlot).toBe("back");
    expect(assigned.pendingLoot[loot.pendingId]).toBeUndefined();
    expect(assigned.itemInstances[loot.item.id]).toMatchObject({
      ownerMemberId: eligible.id,
      bound: true,
    });
    expect(assigned.members[eligible.id]!.equipment.back).toBe(loot.item.id);
    expect(assigned.collection.items[loot.item.definitionId]?.acquisitionCount).toBe(1);
  });

  it("sells unlocked pending loot and removes its instance", async () => {
    const state = idleFixture();
    const member = Object.values(state.members)[0]!;
    const loot = addPendingLoot(state, 1, "14149", [member.id]);
    const session = await createSession(state);
    const fundsBefore = state.guild.funds;

    const result = await session.execute(sellLootCommand(content, loot.pendingId));

    expect(result.status).toBe("committed");
    if (result.status !== "committed") throw new Error("Expected sold loot");
    expect(result.result).toBe(9);
    expect(session.snapshot().guild.funds).toBe(fundsBefore + 9);
    expect(session.snapshot().pendingLoot[loot.pendingId]).toBeUndefined();
    expect(session.snapshot().itemInstances[loot.item.id]).toBeUndefined();
    expect(session.snapshot().collection.items[loot.item.definitionId]).toEqual({
      acquisitionCount: 1,
      seenRandomSuffixIds: [],
    });
  });
});

describe("automatic loot assignment", () => {
  it("equips a positive item-level upgrade and sells loot nobody can use", async () => {
    const state = idleFixture();
    const warrior = Object.values(state.members)[0]!;
    const upgrade = addPendingLoot(state, 1, "14149", [warrior.id]);
    const incompatible = addPendingLoot(state, 2, "14148", [warrior.id]);
    const session = await createSession(state);
    const fundsBefore = state.guild.funds;

    const result = await session.execute(autoAssignLootCommand(content));

    expect(result.status).toBe("committed");
    if (result.status !== "committed") throw new Error("Expected automatic assignment");
    expect(result.result).toMatchObject({
      assigned: 1,
      sold: 1,
      locked: 0,
      saleProceeds: 9,
      entries: [
        { pendingLootId: upgrade.pendingId, action: "assign", memberId: warrior.id },
        { pendingLootId: incompatible.pendingId, action: "sell", saleProceeds: 9 },
      ],
    });
    const assigned = session.snapshot();
    expect(assigned.members[warrior.id]!.equipment.back).toBe(upgrade.item.id);
    expect(assigned.itemInstances[upgrade.item.id]).toMatchObject({
      ownerMemberId: warrior.id,
      bound: true,
    });
    expect(assigned.itemInstances[incompatible.item.id]).toBeUndefined();
    expect(Object.values(assigned.pendingLoot)).toHaveLength(0);
    expect(assigned.guild.funds).toBe(fundsBefore + 9);
  });

  it("breaks equal upgrade ties in favor of the weaker member", async () => {
    const state = idleFixture();
    const stronger = Object.values(state.members)[0]!;
    const strongerBackId = asBrandedId<"ItemInstanceId">("stronger_back");
    const weakerBackId = asBrandedId<"ItemInstanceId">("weaker_back");
    const strongerRingId = asBrandedId<"ItemInstanceId">("stronger_ring");
    stronger.progression.specId = asBrandedId<"SpecId">("warrior_arms");
    stronger.equipment = {
      back: strongerBackId,
      ring1: strongerRingId,
    };
    const weaker = createMemberFixture({
      id: asBrandedId<"MemberId">("member_2"),
      progression: {
        level: stronger.progression.level,
        experience: 0,
        specId: asBrandedId<"SpecId">("warrior_arms"),
      },
      equipment: { back: weakerBackId },
    });
    state.members[weaker.id] = weaker;
    state.itemInstances[strongerBackId] = createItemInstanceFixture({
      id: strongerBackId,
      definitionId: asBrandedId<"ItemDefinitionId">("starter_back"),
      ownerMemberId: stronger.id,
    });
    state.itemInstances[weakerBackId] = createItemInstanceFixture({
      id: weakerBackId,
      definitionId: asBrandedId<"ItemDefinitionId">("starter_back"),
      ownerMemberId: weaker.id,
    });
    state.itemInstances[strongerRingId] = createItemInstanceFixture({
      id: strongerRingId,
      definitionId: asBrandedId<"ItemDefinitionId">("6321"),
      ownerMemberId: stronger.id,
    });
    const loot = addPendingLoot(state, 1, "14149", [stronger.id, weaker.id]);
    const session = await createSession(state);

    const result = await session.execute(autoAssignLootCommand(content));

    if (result.status !== "committed") throw new Error("Expected automatic assignment");
    expect(session.snapshot().members[weaker.id]!.equipment.back).toBe(loot.item.id);
    expect(session.snapshot().members[stronger.id]!.equipment.back).toBe(strongerBackId);
  });

  it("prioritizes an exact wishlist target before ordinary upgrade ties", async () => {
    const state = idleFixture();
    const first = Object.values(state.members)[0]!;
    first.progression.specId = asBrandedId<"SpecId">("warrior_arms");
    first.joinedAt = 1_000;
    const wished = createMemberFixture({
      id: asBrandedId<"MemberId">("member_2"),
      progression: {
        level: first.progression.level,
        experience: 0,
        specId: asBrandedId<"SpecId">("warrior_arms"),
      },
      joinedAt: 2_000,
      wishlist: {
        entries: [
          {
            itemDefinitionId: asBrandedId<"ItemDefinitionId">("14149"),
            acceptableRandomSuffixIds: [],
          },
        ],
      },
    });
    state.members[wished.id] = wished;
    const loot = addPendingLoot(state, 1, "14149", [first.id, wished.id]);
    const session = await createSession(state);

    await session.execute(autoAssignLootCommand(content));

    expect(session.snapshot().members[wished.id]!.equipment.back).toBe(loot.item.id);
  });

  it("leaves every item from an active continuous expedition untouched", async () => {
    const state = idleFixture();
    const member = Object.values(state.members)[0]!;
    const loot = addPendingLoot(state, 1, "14149", [member.id], "active");
    member.activeActivityId = loot.activityId;
    const session = await createSession(state);

    const result = await session.execute(autoAssignLootCommand(content));

    if (result.status !== "committed") throw new Error("Expected automatic assignment");
    expect(result.result).toMatchObject({
      assigned: 0,
      sold: 0,
      locked: 1,
      saleProceeds: 0,
      entries: [],
    });
    expect(session.snapshot().pendingLoot[loot.pendingId]).toBeDefined();
    expect(session.snapshot().itemInstances[loot.item.id]).toBeDefined();
  });

  it("rolls back the whole batch when a later loot entry is invalid", async () => {
    const state = idleFixture();
    const member = Object.values(state.members)[0]!;
    addPendingLoot(state, 1, "14149", [member.id]);
    const broken = addPendingLoot(state, 2, "14149", [member.id]);
    delete state.itemInstances[broken.item.id];
    const session = await createSession(state);
    const before = session.snapshot();

    await expect(session.execute(autoAssignLootCommand(content))).rejects.toThrow(
      "战利品装备实例不存在",
    );

    expect(session.snapshot()).toEqual(before);
  });
});
