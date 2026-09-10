import { describe, expect, it } from "vitest";
import { getAutoLootPreview } from "../../src/application/queries/get-auto-loot-preview";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { GameState } from "../../src/domain/game-state";
import { asBrandedId } from "../../src/domain/shared/ids";
import {
  createExpeditionActivityFixture,
  createGameStateFixture,
  createItemInstanceFixture,
} from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

function addLoot(state: GameState, sequence: number): void {
  const member = Object.values(state.members)[0]!;
  const activityId = asBrandedId<"ActivityId">(`preview_activity_${sequence}`);
  const item = createItemInstanceFixture({
    id: asBrandedId<"ItemInstanceId">(`preview_item_${sequence}`),
    definitionId: asBrandedId<"ItemDefinitionId">("14149"),
    ownerMemberId: undefined,
    bound: false,
    source: {
      type: "encounter",
      activityId,
      dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
      encounterId: asBrandedId<"EncounterId">("taragaman_the_hungerer"),
    },
  });
  const pendingId = asBrandedId<"PendingLootId">(`preview_pending_${sequence}`);
  state.activities[activityId] = createExpeditionActivityFixture({
    id: activityId,
    status: "completed",
    participantIds: [member.id],
    completedAt: 2_000,
  });
  state.itemInstances[item.id] = item;
  state.pendingLoot[pendingId] = {
    id: pendingId,
    itemInstanceId: item.id,
    sourceActivityId: activityId,
    eligibleMemberIds: [member.id],
    acquiredAt: 2_000 + sequence,
  };
}

describe("automatic loot preview", () => {
  it("simulates earlier assignments before evaluating later loot", () => {
    const state = createGameStateFixture({ activities: {} });
    const member = Object.values(state.members)[0]!;
    delete member.activeActivityId;
    const oldBack = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("preview_old_back"),
      definitionId: asBrandedId<"ItemDefinitionId">("starter_back"),
      ownerMemberId: member.id,
    });
    state.itemInstances[oldBack.id] = oldBack;
    member.equipment.back = oldBack.id;
    addLoot(state, 1);
    addLoot(state, 2);

    const preview = getAutoLootPreview(state, content);

    expect(preview.entries.map((entry) => entry.action)).toEqual(["assign", "sell"]);
    expect(preview.entries[0]).toMatchObject({
      itemName: "地下斗篷",
      memberName: member.identity.name,
      replacedItemNames: ["入门披风"],
    });
    expect(preview.entries[1]).toMatchObject({
      itemName: "地下斗篷",
      action: "sell",
    });
    expect(state.pendingLoot).toHaveProperty("preview_pending_1");
    expect(state.pendingLoot).toHaveProperty("preview_pending_2");
  });
});
