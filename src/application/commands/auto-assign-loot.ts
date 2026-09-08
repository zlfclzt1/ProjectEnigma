import type { GameCommand } from "../services/game-session";
import type { ContentRegistry } from "../../content/registry";
import { evaluateUpgrade } from "../../domain/equipment/upgrade-evaluation";
import type { GameStateV2 } from "../../domain/game-state";
import { assignLoot, assertLootUnlocked } from "./assign-loot";
import { sellLoot } from "./sell-loot";

export interface AutoAssignLootResult {
  readonly assigned: number;
  readonly sold: number;
  readonly locked: number;
}

export function autoAssignLootCommand(content: ContentRegistry): GameCommand<AutoAssignLootResult> {
  return {
    type: "auto-assign-loot",
    execute(draft) {
      return autoAssignLoot(draft, content);
    },
  };
}

export function autoAssignLoot(state: GameStateV2, content: ContentRegistry): AutoAssignLootResult {
  let assigned = 0;
  let sold = 0;
  let locked = 0;
  const pendingLoot = Object.values(state.pendingLoot).sort(
    (left, right) => left.acquiredAt - right.acquiredAt || left.id.localeCompare(right.id),
  );
  for (const pending of pendingLoot) {
    try {
      assertLootUnlocked(state, pending.sourceActivityId);
    } catch {
      locked += 1;
      continue;
    }
    const instance = state.itemInstances[pending.itemInstanceId];
    if (!instance) throw new Error("战利品装备实例不存在。");
    const eligible = pending.eligibleMemberIds
      .map((memberId) => state.members[memberId])
      .filter((member) => member !== undefined)
      .map((member) => ({
        member,
        upgrade: evaluateUpgrade(member, instance, state, content),
      }))
      .filter(
        (
          entry,
        ): entry is typeof entry & {
          upgrade: Extract<typeof entry.upgrade, { equippable: true }>;
        } =>
          entry.upgrade.equippable &&
          entry.upgrade.primaryResponsibilityDelta > 1e-9 &&
          entry.upgrade.recommendationScore > 1e-9,
      )
      .sort(
        (left, right) =>
          right.upgrade.recommendationScore - left.upgrade.recommendationScore ||
          left.upgrade.primaryResponsibilityBefore - right.upgrade.primaryResponsibilityBefore ||
          left.member.id.localeCompare(right.member.id),
      );
    if (eligible.length > 0) {
      assignLoot(
        state,
        content,
        pending.id,
        eligible[0]!.member.id,
        eligible[0]!.upgrade.replacementSlot,
      );
      assigned += 1;
    } else {
      sellLoot(state, content, pending.id);
      sold += 1;
    }
  }
  return { assigned, sold, locked };
}
