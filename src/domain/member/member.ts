import type { EquipmentSlot } from "../equipment/equipment-slot";
import type {
  ActivityId,
  CandidateId,
  ClassId,
  EncounterId,
  HiddenCharacterId,
  ItemInstanceId,
  MemberId,
  MemberProfessionId,
  MountId,
  PersonalityId,
  QuestId,
  RaceId,
  SpecId,
} from "../shared/ids";

export interface MemberIdentity {
  name: string;
  raceId: RaceId;
  classId: ClassId;
  personalityId: PersonalityId;
  hiddenCharacterId?: HiddenCharacterId;
}

export interface MemberProgression {
  level: number;
  experience: number;
  specId: SpecId;
}

export interface MemberRidingState {
  skillRank: number;
  learnedMountIds: MountId[];
  equippedMountId?: MountId;
}

export type MemberQuestStatus = "accepted" | "completed" | "claimed";

export interface MemberQuestProgress {
  questId: QuestId;
  status: MemberQuestStatus;
  acceptedAt: number;
  completedAt?: number;
  claimedAt?: number;
  trackingPausedAt?: number;
  encounterVictoryIds: EncounterId[];
}

export interface MemberQuestState {
  entries: Partial<Record<QuestId, MemberQuestProgress>>;
}

export interface Member {
  id: MemberId;
  identity: MemberIdentity;
  progression: MemberProgression;
  equipment: Partial<Record<EquipmentSlot, ItemInstanceId>>;
  professionIds: MemberProfessionId[];
  riding: MemberRidingState;
  quests: MemberQuestState;
  activeActivityId?: ActivityId;
  joinedAt: number;
}

export interface Candidate {
  id: CandidateId;
  identity: MemberIdentity;
  progression: MemberProgression;
  offeredAt: number;
}
