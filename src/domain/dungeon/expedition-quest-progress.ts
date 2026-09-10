import type { ExpeditionActivity } from "../activity/activity";
import type { GameState } from "../game-state";
import {
  completeMemberQuest,
  recordMemberQuestEncounterVictory,
} from "../member/member-quest-state";
import type { EncounterId, QuestId } from "../shared/ids";

export function progressExpeditionQuestsAfterEncounterVictory(
  state: GameState,
  activity: ExpeditionActivity,
  encounterId: EncounterId,
  completedAt: number,
): readonly QuestId[] {
  const completed: QuestId[] = [];
  for (const snapshot of activity.questSnapshots) {
    if (
      snapshot.completion.type !== "encounter-victories" ||
      !snapshot.completion.encounterIds.includes(encounterId)
    ) {
      continue;
    }
    const member = state.members[snapshot.memberId];
    const progress = member?.quests.entries[snapshot.questId];
    if (!member || !progress || progress.status !== "accepted") continue;
    recordMemberQuestEncounterVictory(member.quests, snapshot.questId, encounterId);
    if (
      snapshot.completion.encounterIds.every((requiredId) =>
        progress.encounterVictoryIds.includes(requiredId),
      )
    ) {
      completeMemberQuest(member.quests, snapshot.questId, completedAt);
      completed.push(snapshot.questId);
    }
  }
  return completed;
}

export function completeExpeditionDungeonClearQuests(
  state: GameState,
  activity: ExpeditionActivity,
  completedAt: number,
): readonly QuestId[] {
  const completed: QuestId[] = [];
  for (const snapshot of activity.questSnapshots) {
    if (snapshot.completion.type !== "dungeon-clear") continue;
    const member = state.members[snapshot.memberId];
    const progress = member?.quests.entries[snapshot.questId];
    if (!member || !progress || progress.status !== "accepted") continue;
    completeMemberQuest(member.quests, snapshot.questId, completedAt);
    completed.push(snapshot.questId);
  }
  return completed;
}
