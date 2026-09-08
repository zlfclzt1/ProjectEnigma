import type {
  ActivityId,
  ClassId,
  ContentVersion,
  DungeonId,
  EncounterId,
  GatheringSiteId,
  ItemDefinitionId,
  ItemInstanceId,
  MemberId,
  PersonalityId,
  ProfessionDefinitionId,
  RecipeId,
  SpecId,
  TrainingDefinitionId,
} from "../shared/ids";
import type { EquipmentSlot } from "../equipment/equipment-slot";

export type ActivityType = "expedition" | "gathering" | "crafting" | "training";
export type ActivityStatus = "scheduled" | "active" | "completed" | "failed" | "cancelled";

export interface ActivityBase<Type extends ActivityType> {
  id: ActivityId;
  type: Type;
  participantIds: MemberId[];
  status: ActivityStatus;
  createdAt: number;
  startedAt: number;
  nextSettlementAt: number;
  completedAt?: number;
  seed: string;
  contentVersion: ContentVersion;
}

export interface ExpeditionActivity extends ActivityBase<"expedition"> {
  dungeonId: DungeonId;
  requestedRuns: number;
  completedRuns: number;
  activeRunIndex: number;
  activeEncounterIndex: number;
  partySnapshot: ExpeditionPartySnapshot;
  runPlans: ExpeditionRunPlan[];
}

export interface ExpeditionEquipmentSnapshot {
  itemInstanceId: ItemInstanceId;
  itemDefinitionId: ItemDefinitionId;
}

export interface ExpeditionMemberSnapshot {
  memberId: MemberId;
  classId: ClassId;
  specId: SpecId;
  personalityId: PersonalityId;
  level: number;
  equipment: Partial<Record<EquipmentSlot, ExpeditionEquipmentSnapshot>>;
}

export interface ExpeditionPartySnapshot {
  members: ExpeditionMemberSnapshot[];
  contribution: { tank: number; healing: number; damage: number };
  clearProbability: number;
  durationSeconds: number;
}

export interface ExpeditionEncounterPlan {
  encounterId: EncounterId;
  probability: number;
  rawRatios: { tank: number; healing: number; damage: number };
  durationSeconds: number;
  successRoll: number;
  lootSeed: string;
  status: "pending" | "victory" | "defeat";
  settledAt?: number;
}

export interface ExpeditionRunPlan {
  runNumber: number;
  seed: string;
  experienceFractionByMember: Partial<Record<MemberId, number>>;
  stages: ExpeditionEncounterPlan[];
}

export interface GatheringActivity extends ActivityBase<"gathering"> {
  professionDefinitionId: ProfessionDefinitionId;
  siteId: GatheringSiteId;
}

export interface CraftingActivity extends ActivityBase<"crafting"> {
  professionDefinitionId: ProfessionDefinitionId;
  recipeId: RecipeId;
  quantity: number;
}

export interface TrainingActivity extends ActivityBase<"training"> {
  trainingDefinitionId: TrainingDefinitionId;
}

export type Activity = ExpeditionActivity | GatheringActivity | CraftingActivity | TrainingActivity;
