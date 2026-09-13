import type { LegacyGameStateV13, LegacyGameStateV14 } from "../../../domain/game-state";
import type { ContentRegistry } from "../../../content/registry";

export function migrateV13ToV14(
  legacy: LegacyGameStateV13,
  content: ContentRegistry,
): LegacyGameStateV14 {
  const cloned = structuredClone(legacy);
  const members = Object.fromEntries(
    Object.entries(cloned.members).map(([memberId, member]) => {
      const { wishlist: _wishlist, ...current } = member;
      void _wishlist;
      return [memberId, current];
    }),
  ) as LegacyGameStateV14["members"];
  for (const member of Object.values(members)) member.professionStates ??= {};
  return {
    ...cloned,
    saveVersion: 14,
    members,
    guild: {
      ...cloned.guild,
      professionFacilities: Object.fromEntries(
        content.professionFacilities
          .filter((facility) => facility.status === "available")
          .map((facility) => [
            facility.id,
            { facilityId: facility.id, level: facility.levels[0]?.level ?? 0 },
          ]),
      ),
    },
    guildBank: { ...cloned.guildBank, capacitySlots: cloned.guildBank.capacitySlots ?? 100 },
  } as LegacyGameStateV14;
}
