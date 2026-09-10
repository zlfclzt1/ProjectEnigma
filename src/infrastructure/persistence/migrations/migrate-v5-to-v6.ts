import type { LegacyGameStateV5, LegacyGameStateV6 } from "../../../domain/game-state";
import type { Member } from "../../../domain/member/member";

export function migrateV5ToV6(legacy: LegacyGameStateV5): LegacyGameStateV6 {
  const members = Object.fromEntries(
    Object.entries(legacy.members).map(([memberId, member]) => [
      memberId,
      { ...structuredClone(member), wishlist: { entries: [] } } satisfies Member,
    ]),
  ) as LegacyGameStateV6["members"];
  return {
    ...structuredClone(legacy),
    saveVersion: 6,
    members,
  };
}
