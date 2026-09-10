import type { Activity, ExpeditionActivity, ExpeditionRunPlan } from "./activity/activity";
import type { CollectionState } from "./collection/item-collection";
import type { ItemInstance, PendingLoot } from "./equipment/item-instance";
import type { GuildState, HistorySummary, RecruitmentState } from "./guild/guild";
import type { GuildBank } from "./inventory/guild-bank";
import type { Candidate, Member } from "./member/member";
import type { RosterPresetState } from "./guild/roster-preset";
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

export const GAME_STATE_SAVE_VERSION = 12 as const;

export interface GameState {
  slotId: SaveSlotId;
  saveVersion: typeof GAME_STATE_SAVE_VERSION;
  revision: number;
  contentVersion: ContentVersion;
  guild: GuildState;
  recruitment: RecruitmentState;
  members: Record<MemberId, Member>;
  candidates: Record<CandidateId, Candidate>;
  itemInstances: Record<ItemInstanceId, ItemInstance>;
  activities: Record<ActivityId, Activity>;
  pendingLoot: Record<PendingLootId, PendingLoot>;
  collection: CollectionState;
  guildBank: GuildBank;
  rosterPresets: RosterPresetState;
  history: HistorySummary;
  random: RandomState;
  ids: IdGeneratorState;
  createdAt: number;
  updatedAt: number;
}

export interface LegacyGameStateV11 extends Omit<GameState, "saveVersion" | "rosterPresets"> {
  saveVersion: 11;
}

export type LegacyItemInstanceV3 = Omit<ItemInstance, "randomSuffixId">;

export type LegacyMemberV9 = Omit<Member, "quests">;

export type LegacyExpeditionActivityV10 = Omit<ExpeditionActivity, "questSnapshots">;

export type LegacyActivityV10 = Exclude<Activity, ExpeditionActivity> | LegacyExpeditionActivityV10;

export interface LegacyGameStateV10 extends Omit<LegacyGameStateV11, "saveVersion" | "activities"> {
  saveVersion: 10;
  activities: Record<ActivityId, LegacyActivityV10>;
}

export interface LegacyGameStateV9 extends Omit<LegacyGameStateV10, "saveVersion" | "members"> {
  saveVersion: 9;
  members: Record<MemberId, LegacyMemberV9>;
}

export type LegacyMemberV5 = Omit<LegacyMemberV9, "wishlist">;

export type LegacyExpeditionRunPlanV8 = Omit<ExpeditionRunPlan, "rareNodeReveals">;

export type LegacyExpeditionActivityV8 = Omit<ExpeditionActivity, "runPlans"> & {
  runPlans: LegacyExpeditionRunPlanV8[];
};

export type LegacyActivityV8 = Exclude<Activity, ExpeditionActivity> | LegacyExpeditionActivityV8;

export interface LegacyGameStateV8 extends Omit<LegacyGameStateV9, "saveVersion" | "activities"> {
  saveVersion: 8;
  activities: Record<ActivityId, LegacyActivityV8>;
}

export type LegacyExpeditionActivityV7 = Omit<
  LegacyExpeditionActivityV8,
  "selectedOptionalNodeIds"
>;

export type LegacyActivityV7 = Exclude<Activity, ExpeditionActivity> | LegacyExpeditionActivityV7;

export interface LegacyGameStateV7 extends Omit<LegacyGameStateV8, "saveVersion" | "activities"> {
  saveVersion: 7;
  activities: Record<ActivityId, LegacyActivityV7>;
}

export type LegacyExpeditionActivityV6 = Omit<LegacyExpeditionActivityV7, "partySnapshot"> & {
  partySnapshot: Omit<LegacyExpeditionActivityV7["partySnapshot"], "capabilities">;
};

export type LegacyActivityV6 = Exclude<Activity, ExpeditionActivity> | LegacyExpeditionActivityV6;

export interface LegacyGameStateV6 extends Omit<LegacyGameStateV7, "saveVersion" | "activities"> {
  saveVersion: 6;
  activities: Record<ActivityId, LegacyActivityV6>;
}

export interface LegacyGameStateV5 extends Omit<LegacyGameStateV6, "saveVersion" | "members"> {
  saveVersion: 5;
  members: Record<MemberId, LegacyMemberV5>;
}

export interface LegacyGameStateV4 extends Omit<LegacyGameStateV5, "saveVersion" | "collection"> {
  saveVersion: 4;
}

export interface LegacyGameStateV3 extends Omit<
  LegacyGameStateV4,
  "saveVersion" | "itemInstances"
> {
  saveVersion: 3;
  itemInstances: Record<ItemInstanceId, LegacyItemInstanceV3>;
}

export interface LegacyGuildStateV2 extends Omit<GuildState, "purchasedUpgradeIds"> {
  memberCapacity: number;
}

export type LegacyHistorySummaryV2 = Omit<HistorySummary, "dungeonClearCounts">;

export interface LegacyGameStateV2 extends Omit<
  LegacyGameStateV3,
  "saveVersion" | "guild" | "history"
> {
  saveVersion: 2;
  guild: LegacyGuildStateV2;
  history: LegacyHistorySummaryV2;
}

export type PersistedGameState =
  | GameState
  | LegacyGameStateV11
  | LegacyGameStateV10
  | LegacyGameStateV9
  | LegacyGameStateV8
  | LegacyGameStateV7
  | LegacyGameStateV6
  | LegacyGameStateV5
  | LegacyGameStateV4
  | LegacyGameStateV3
  | LegacyGameStateV2;
