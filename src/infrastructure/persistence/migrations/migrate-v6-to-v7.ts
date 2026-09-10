import type { ContentRegistry } from "../../../content/registry";
import { aggregatePartyCapabilities } from "../../../domain/combat/party-capabilities";
import { type LegacyGameStateV6, type LegacyGameStateV7 } from "../../../domain/game-state";

export function migrateV6ToV7(
  legacy: LegacyGameStateV6,
  content: ContentRegistry,
): LegacyGameStateV7 {
  const activities = Object.fromEntries(
    Object.entries(legacy.activities).map(([activityId, activity]) => {
      if (activity.type !== "expedition") return [activityId, structuredClone(activity)];
      const members = activity.partySnapshot.members.map((member) => ({
        memberId: member.memberId,
        specId: member.specId,
        level: member.level,
      }));
      const profiles = activity.partySnapshot.members.map((member) => ({
        formulaVersion: member.combat.formulaVersion,
        memberId: member.memberId,
        role: member.combat.role,
        capabilities: { ...member.combat.capabilities },
        utility: { ...member.combat.utility },
        diagnostics: [],
      }));
      return [
        activityId,
        {
          ...structuredClone(activity),
          partySnapshot: {
            ...structuredClone(activity.partySnapshot),
            capabilities: aggregatePartyCapabilities(content, members, profiles),
          },
        },
      ];
    }),
  ) as LegacyGameStateV7["activities"];
  return {
    ...structuredClone(legacy),
    saveVersion: 7,
    activities,
  };
}
