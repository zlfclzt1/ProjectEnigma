import type { LegacyGameStateV10, LegacyGameStateV9 } from "../../../domain/game-state";
import { createEmptyMemberQuestState } from "../../../domain/member/member-quest-state";

export function migrateV9ToV10(legacy: LegacyGameStateV9): LegacyGameStateV10 {
  const members = Object.fromEntries(
    Object.entries(legacy.members).map(([memberId, member]) => [
      memberId,
      { ...structuredClone(member), quests: createEmptyMemberQuestState() },
    ]),
  ) as LegacyGameStateV10["members"];
  return {
    ...structuredClone(legacy),
    saveVersion: 10,
    members,
  };
}
