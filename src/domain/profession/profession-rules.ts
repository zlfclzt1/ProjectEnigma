import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../game-state";
import type { Member } from "../member/member";
import {
  asBrandedId,
  type ProfessionDefinitionId,
  type ProfessionFacilityId,
  type RecipeId,
} from "../shared/ids";
import type { GuildProfessionFacilityState, MemberProfessionState } from "./profession-state";

export function getMemberProfessionState(
  member: Member,
  professionId: ProfessionDefinitionId,
): MemberProfessionState | undefined {
  return member.professionStates?.[professionId];
}

export function ensureMemberProfessionState(
  member: Member,
  professionId: ProfessionDefinitionId,
): MemberProfessionState {
  const state = member.professionStates?.[professionId];
  if (!state) throw new Error("成员尚未学习该专业。");
  return state;
}

export function ensureFacilityLevel(
  state: GameState,
  content: ContentRegistry,
  facilityId: ProfessionFacilityId,
  requiredLevel = 1,
): GuildProfessionFacilityState {
  const facility = content.professionFacilityById.get(facilityId);
  if (!facility || facility.status !== "available") throw new Error("专业设施尚未开放。");
  const current = state.guild.professionFacilities?.[facilityId];
  if (!current || current.level < requiredLevel) throw new Error("公会专业设施等级不足。");
  return current;
}

export function hasLearnedRecipe(
  member: Member,
  professionId: ProfessionDefinitionId,
  recipeId: RecipeId,
): boolean {
  return ensureMemberProfessionState(member, professionId).learnedRecipeIds.includes(recipeId);
}

export function ensureTrainingRank(
  member: Member,
  professionId: ProfessionDefinitionId,
  requiredRank = 1,
): MemberProfessionState {
  const state = ensureMemberProfessionState(member, professionId);
  if (state.trainingRank < requiredRank) throw new Error("专业训练等级不足。");
  return state;
}

export function addProfessionToMember(
  member: Member,
  professionId: ProfessionDefinitionId,
  skill = 1,
  trainingRank = 1,
  primaryProfessionLimit = 2,
  isPrimary = true,
  primaryProfessionIds?: readonly ProfessionDefinitionId[],
): void {
  member.professionStates ??= {};
  if (member.professionStates[professionId]) throw new Error("成员已经学习该专业。");
  if (isPrimary) {
    const primaryCount = primaryProfessionIds
      ? primaryProfessionIds.filter((id) => id !== professionId && member.professionStates?.[id])
          .length
      : Object.values(member.professionStates).filter((entry) => entry !== undefined).length;
    if (primaryCount >= primaryProfessionLimit) throw new Error("成员最多只能学习两个主专业。");
  }
  member.professionStates[professionId] = {
    professionId,
    skill,
    trainingRank,
    learnedRecipeIds: [],
  };
  if (!member.professionIds.includes(asBrandedId<"MemberProfessionId">(professionId))) {
    member.professionIds.push(asBrandedId<"MemberProfessionId">(professionId));
  }
}

export function removeProfessionFromMember(
  member: Member,
  professionId: ProfessionDefinitionId,
): void {
  if (!member.professionStates?.[professionId]) throw new Error("成员尚未学习该专业。");
  delete member.professionStates[professionId];
  member.professionIds = member.professionIds.filter(
    (id) => id !== asBrandedId<"MemberProfessionId">(professionId),
  );
}
