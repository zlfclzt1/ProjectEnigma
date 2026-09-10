import { describe, expect, it } from "vitest";
import type {
  Activity,
  CraftingActivity,
  GatheringActivity,
  TrainingActivity,
} from "../../src/domain/activity/activity";
import type { GameState } from "../../src/domain/game-state";
import { asBrandedId } from "../../src/domain/shared/ids";
import {
  createExpeditionActivityFixture,
  createGameStateFixture,
} from "../helpers/game-state-v2-factory";

describe("normalized GameState", () => {
  it("stores runtime entities in ID-indexed records", () => {
    const state = createGameStateFixture();
    const member = state.members[asBrandedId<"MemberId">("member_1")];
    const item = state.itemInstances[asBrandedId<"ItemInstanceId">("item_1")];
    const activity = state.activities[asBrandedId<"ActivityId">("activity_1")];

    expect(state.saveVersion).toBe(9);
    expect(state.collection).toEqual({ items: {}, claimedRewardIds: [] });
    expect(state.guild.purchasedUpgradeIds).toEqual([]);
    expect(state.history.dungeonClearCounts).toEqual({});
    expect(state.revision).toBe(0);
    expect(state.contentVersion).toBe("classic-v1");
    expect(member.id).toBe("member_1");
    expect(member.equipment.head).toBe(item.id);
    expect(member.activeActivityId).toBe(activity.id);
    expect(member.wishlist).toEqual({ entries: [] });
    expect(activity.participantIds).toContain(member.id);
  });

  it("keeps static display and balance data out of the save", () => {
    const state = createGameStateFixture();
    const member = state.members[asBrandedId<"MemberId">("member_1")] as unknown as Record<
      string,
      unknown
    >;
    const item = state.itemInstances[asBrandedId<"ItemInstanceId">("item_1")] as unknown as Record<
      string,
      unknown
    >;
    const activity = state.activities[asBrandedId<"ActivityId">("activity_1")] as unknown as Record<
      string,
      unknown
    >;

    expect(member).not.toHaveProperty("status");
    expect(member).not.toHaveProperty("className");
    expect(member).not.toHaveProperty("specName");
    expect(member).not.toHaveProperty("personalityName");
    expect(item).not.toHaveProperty("name");
    expect(item).not.toHaveProperty("icon");
    expect(item).not.toHaveProperty("stats");
    expect(activity).not.toHaveProperty("dungeonName");
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("reserves discriminated activity records for future parallel systems", () => {
    const base = createExpeditionActivityFixture();
    const common = {
      id: base.id,
      participantIds: base.participantIds,
      status: base.status,
      createdAt: base.createdAt,
      startedAt: base.startedAt,
      nextSettlementAt: base.nextSettlementAt,
      seed: base.seed,
      contentVersion: base.contentVersion,
    };
    const gathering: GatheringActivity = {
      ...common,
      type: "gathering",
      professionDefinitionId: asBrandedId<"ProfessionDefinitionId">("mining"),
      siteId: asBrandedId<"GatheringSiteId">("elwynn_copper"),
    };
    const crafting: CraftingActivity = {
      ...common,
      type: "crafting",
      professionDefinitionId: asBrandedId<"ProfessionDefinitionId">("blacksmithing"),
      recipeId: asBrandedId<"RecipeId">("copper_bar"),
      quantity: 1,
    };
    const training: TrainingActivity = {
      ...common,
      type: "training",
      trainingDefinitionId: asBrandedId<"TrainingDefinitionId">("apprentice_riding"),
    };
    const activities: Activity[] = [base, gathering, crafting, training];

    expect(activities.map((activity) => activity.type)).toEqual([
      "expedition",
      "gathering",
      "crafting",
      "training",
    ]);
  });

  it("allows empty records for a newly reset save", () => {
    const emptyState: GameState = createGameStateFixture({
      members: {},
      candidates: {},
      itemInstances: {},
      activities: {},
      pendingLoot: {},
    });

    expect(Object.keys(emptyState.members)).toHaveLength(0);
    expect(Object.keys(emptyState.activities)).toHaveLength(0);
  });
});
