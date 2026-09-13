import type { ProfessionDefinitionId, ProfessionFacilityId, RecipeId } from "../shared/ids";

export interface MemberProfessionState {
  professionId: ProfessionDefinitionId;
  skill: number;
  trainingRank: number;
  learnedRecipeIds: RecipeId[];
}

export type MemberProfessionStates = Partial<Record<ProfessionDefinitionId, MemberProfessionState>>;

export interface GuildProfessionFacilityState {
  facilityId: ProfessionFacilityId;
  level: number;
}

export type GuildProfessionFacilities = Partial<
  Record<ProfessionFacilityId, GuildProfessionFacilityState>
>;

export function emptyMemberProfessionStates(): MemberProfessionStates {
  return {};
}

export function emptyGuildProfessionFacilities(): GuildProfessionFacilities {
  return {};
}
