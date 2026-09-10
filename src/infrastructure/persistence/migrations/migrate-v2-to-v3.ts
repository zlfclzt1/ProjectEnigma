import type { ContentRegistry } from "../../../content/registry";
import { type LegacyGameStateV2, type LegacyGameStateV3 } from "../../../domain/game-state";

export function migrateV2ToV3(
  legacy: LegacyGameStateV2,
  content: ContentRegistry,
): LegacyGameStateV3 {
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
    saveVersion: 3,
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
