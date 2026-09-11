import type { ContentRegistry } from "../../content/registry";
import { rankLootAssignment } from "../../domain/equipment/loot-assignment-ranking";
import type { GameCommand } from "../services/game-session";
import { assertLootUnlocked } from "./assign-loot";
import { sellLoot } from "./sell-loot";
import type { ActivityId } from "../../domain/shared/ids";

export interface SellNoUpgradeLootResult {
  readonly sold: number;
  readonly saleProceeds: number;
}

export function sellNoUpgradeLootCommand(
  content: ContentRegistry,
  activityId?: ActivityId,
): GameCommand<SellNoUpgradeLootResult> {
  return {
    type: "sell-no-upgrade-loot",
    execute(draft) {
      const pending = Object.values(draft.pendingLoot)
        .filter((entry) => {
          if (activityId && entry.sourceActivityId !== activityId) return false;
          const source = draft.activities[entry.sourceActivityId];
          if (source?.status === "active" || source?.status === "scheduled") return false;
          assertLootUnlocked(draft, entry.sourceActivityId);
          return rankLootAssignment(draft, content, entry).type === "sell";
        })
        .sort(
          (left, right) => left.acquiredAt - right.acquiredAt || left.id.localeCompare(right.id),
        );
      let saleProceeds = 0;
      for (const entry of pending) saleProceeds += sellLoot(draft, content, entry.id);
      return { sold: pending.length, saleProceeds };
    },
  };
}
