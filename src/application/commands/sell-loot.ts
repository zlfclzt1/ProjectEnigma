import type { GameCommand } from "../services/game-session";
import type { ContentRegistry } from "../../content/registry";
import { equipmentSellValue } from "../../domain/equipment/item-value";
import type { GameState } from "../../domain/game-state";
import type { PendingLootId } from "../../domain/shared/ids";
import { resolveItemInstance } from "../../domain/equipment/resolve-item-instance";
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
  state: GameState,
  content: ContentRegistry,
  pendingLootId: PendingLootId,
): number {
  const pending = state.pendingLoot[pendingLootId];
  if (!pending) return 0;
  assertLootUnlocked(state, pending.sourceActivityId);
  const instance = state.itemInstances[pending.itemInstanceId];
  if (!instance) throw new Error("战利品装备数据不完整。");
  const definition = resolveItemInstance(instance, content).definition;
  const value = equipmentSellValue(definition);
  delete state.pendingLoot[pendingLootId];
  delete state.itemInstances[instance.id];
  state.guild.funds += value;
  return value;
}
