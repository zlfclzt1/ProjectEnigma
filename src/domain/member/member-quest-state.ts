import type { EncounterId, QuestId } from "../shared/ids";
import type { MemberQuestProgress, MemberQuestState } from "./member";

export function createEmptyMemberQuestState(): MemberQuestState {
  return { entries: {} };
}

export function acceptMemberQuest(
  state: MemberQuestState,
  questId: QuestId,
  acceptedAt: number,
): MemberQuestProgress {
  if (state.entries[questId]) throw new Error("这名成员已经接取或完成过该任务。");
  const progress: MemberQuestProgress = {
    questId,
    status: "accepted",
    acceptedAt,
    encounterVictoryIds: [],
  };
  state.entries[questId] = progress;
  return progress;
}

export function recordMemberQuestEncounterVictory(
  state: MemberQuestState,
  questId: QuestId,
  encounterId: EncounterId,
): MemberQuestProgress {
  const progress = requiredProgress(state, questId);
  if (progress.status !== "accepted") return progress;
  if (!progress.encounterVictoryIds.includes(encounterId)) {
    progress.encounterVictoryIds.push(encounterId);
  }
  return progress;
}

export function completeMemberQuest(
  state: MemberQuestState,
  questId: QuestId,
  completedAt: number,
): MemberQuestProgress {
  const progress = requiredProgress(state, questId);
  if (progress.status !== "accepted") throw new Error("这名成员的任务已经完成，不能重复完成。");
  progress.status = "completed";
  progress.completedAt = completedAt;
  return progress;
}

export function claimMemberQuest(
  state: MemberQuestState,
  questId: QuestId,
  claimedAt: number,
): MemberQuestProgress {
  const progress = requiredProgress(state, questId);
  if (progress.status === "accepted") throw new Error("任务尚未完成，不能领取奖励。");
  if (progress.status === "claimed") throw new Error("这名成员已经领取过该任务奖励。");
  progress.status = "claimed";
  progress.claimedAt = claimedAt;
  return progress;
}

function requiredProgress(state: MemberQuestState, questId: QuestId): MemberQuestProgress {
  const progress = state.entries[questId];
  if (!progress) throw new Error("这名成员尚未接取该任务。");
  return progress;
}
