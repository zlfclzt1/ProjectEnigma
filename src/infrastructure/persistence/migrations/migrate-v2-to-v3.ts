import type { ContentRegistry } from "../../../content/registry";
import {
  GAME_STATE_SAVE_VERSION,
  type GameState,
  type LegacyGameStateV2,
} from "../../../domain/game-state";

export function migrateV2ToV3(legacy: LegacyGameStateV2, content: ContentRegistry): GameState {
  const { memberCapacity, ...legacyGuild } = legacy.guild;
  const purchasedUpgradeIds = content.guildUpgrades
    .filter((upgrade) =>
      upgrade.effects.some(
        (effect) => effect.type === "member-capacity" && effect.value <= memberCapacity,
      ),
    )
    .sort((left, right) => left.order - right.order)
    .map((upgrade) => upgrade.id);

  const firstKills = new Set(legacy.guild.firstKillEncounterIds);
  const dungeonClearCounts = Object.fromEntries(
    content.dungeons
      .filter(
        (dungeon) =>
          dungeon.route.length > 0 &&
          dungeon.route.every((encounterId) => firstKills.has(encounterId)),
      )
      .map((dungeon) => [dungeon.id, 1]),
  );

  return {
    ...structuredClone(legacy),
    saveVersion: GAME_STATE_SAVE_VERSION,
    guild: {
      ...structuredClone(legacyGuild),
      purchasedUpgradeIds,
    },
    history: {
      ...structuredClone(legacy.history),
      dungeonClearCounts,
    },
  };
}
