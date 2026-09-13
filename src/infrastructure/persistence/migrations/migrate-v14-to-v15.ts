import {
  GAME_STATE_SAVE_VERSION,
  type GameState,
  type LegacyGameStateV14,
} from "../../../domain/game-state";
import type { ContentRegistry } from "../../../content/registry";

export const PROFESSION_SAVE_VERSION = 15 as const;

export function migrateV14ToV15(legacy: LegacyGameStateV14, content: ContentRegistry): GameState {
  const cloned = structuredClone(legacy) as unknown as GameState;
  for (const member of Object.values(cloned.members)) member.professionStates ??= {};
  cloned.guild.professionFacilities ??= Object.fromEntries(
    content.professionFacilities
      .filter((facility) => facility.status === "available")
      .map((facility) => [
        facility.id,
        { facilityId: facility.id, level: facility.levels[0]?.level ?? 0 },
      ]),
  );
  cloned.guild.supplyPlans ??= {};
  cloned.economyLedger ??= [];
  cloned.guildBank.reservedStackCounts ??= {};
  cloned.guildBank.reservedOutputStackCounts ??= {};
  cloned.guildBank.reservedEquipmentSlots ??= 0;
  cloned.guildBank.capacitySlots ??= 100;
  for (const activity of Object.values(cloned.activities)) {
    if (activity.type === "crafting") {
      activity.inputReservations ??= [];
      activity.outputSeed ??= `${activity.id}:outputs`;
    }
    if (activity.type === "gathering") {
      activity.quantity ??= 1;
      activity.skillAtStart ??= 1;
      activity.outputSeed ??= `${activity.id}:outputs`;
    }
    if (activity.type === "expedition") {
      for (const entry of activity.supplySnapshot?.entries ?? []) entry.releasedQuantity ??= 0;
      if (activity.supplySnapshot && activity.supplySnapshot.routeChoiceCredits === undefined) {
        activity.supplySnapshot.routeChoiceCredits = Math.floor(
          activity.supplySnapshot.channels.exploration / 0.2,
        );
      }
    }
  }
  cloned.saveVersion = PROFESSION_SAVE_VERSION as typeof GAME_STATE_SAVE_VERSION;
  return cloned;
}
