import type { Activity } from "./activity/activity";
import type { ItemInstance, PendingLoot } from "./equipment/item-instance";
import type { GuildState, HistorySummary, RecruitmentState } from "./guild/guild";
import type { GuildBank } from "./inventory/guild-bank";
import type { Candidate, Member } from "./member/member";
import type {
  ActivityId,
  CandidateId,
  ContentVersion,
  ItemInstanceId,
  MemberId,
  PendingLootId,
  SaveSlotId,
} from "./shared/ids";
import type { IdGeneratorState, RandomState } from "./shared/runtime-state";

export const GAME_STATE_V2_SAVE_VERSION = 2 as const;

export interface GameStateV2 {
  slotId: SaveSlotId;
  saveVersion: typeof GAME_STATE_V2_SAVE_VERSION;
  revision: number;
  contentVersion: ContentVersion;
  guild: GuildState;
  recruitment: RecruitmentState;
  members: Record<MemberId, Member>;
  candidates: Record<CandidateId, Candidate>;
  itemInstances: Record<ItemInstanceId, ItemInstance>;
  activities: Record<ActivityId, Activity>;
  pendingLoot: Record<PendingLootId, PendingLoot>;
  guildBank: GuildBank;
  history: HistorySummary;
  random: RandomState;
  ids: IdGeneratorState;
  createdAt: number;
  updatedAt: number;
}
