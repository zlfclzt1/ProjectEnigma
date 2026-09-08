import type { GameCommand } from "../services/game-session";
import type { ContentRegistry } from "../../content/registry";
import { equipmentSellValue } from "../../domain/equipment/item-value";
import type { GameStateV2 } from "../../domain/game-state";
import type { PendingLootId } from "../../domain/shared/ids";
import { assertLootUnlocked } from "./assign-loot";

export function sellLootCommand(
  content: ContentRegistry,
  pendingLootId: PendingLootId,
): GameCommand<number> {
  return {
    type: "sell-loot",
    execute(draft) {
      return sellLoot(draft, content, pendingLootId);
    },
  };
}

export function sellLoot(
  state: GameStateV2,
  content: ContentRegistry,
  pendingLootId: PendingLootId,
): number {
  const pending = state.pendingLoot[pendingLootId];
  if (!pending) return 0;
  assertLootUnlocked(state, pending.sourceActivityId);
  const instance = state.itemInstances[pending.itemInstanceId];
  const definition = instance ? content.itemById.get(instance.definitionId) : undefined;
  if (!instance || !definition) throw new Error("战利品装备数据不完整。");
  const value = equipmentSellValue(definition);
  delete state.pendingLoot[pendingLootId];
  delete state.itemInstances[instance.id];
  state.guild.funds += value;
  return value;
}
