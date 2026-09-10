import type { EquipmentSlot } from "../equipment/equipment-slot";
import type {
  ActivityId,
  CandidateId,
  ClassId,
  HiddenCharacterId,
  ItemDefinitionId,
  ItemInstanceId,
  MemberId,
  MemberProfessionId,
  MountId,
  PersonalityId,
  RaceId,
  RandomSuffixId,
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

export interface MemberWishlistEntry {
  itemDefinitionId: ItemDefinitionId;
  preferredRandomSuffixId?: RandomSuffixId;
  acceptableRandomSuffixIds: RandomSuffixId[];
}

export interface MemberWishlistState {
  entries: MemberWishlistEntry[];
}

export interface Member {
  id: MemberId;
  identity: MemberIdentity;
  progression: MemberProgression;
  equipment: Partial<Record<EquipmentSlot, ItemInstanceId>>;
  professionIds: MemberProfessionId[];
  riding: MemberRidingState;
  wishlist: MemberWishlistState;
  activeActivityId?: ActivityId;
  joinedAt: number;
}

export interface Candidate {
  id: CandidateId;
  identity: MemberIdentity;
  progression: MemberProgression;
  offeredAt: number;
}
