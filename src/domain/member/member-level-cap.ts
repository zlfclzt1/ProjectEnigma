import type { ContentRegistry } from "../../content/registry";
import { hasManagementFeature } from "../collection/collection-reward-rules";
import type { GameState } from "../game-state";
import { asBrandedId } from "../shared/ids";
import type { Member } from "./member";

export const BASE_MEMBER_LEVEL_CAP = 45;
export const EXTENDED_MEMBER_LEVEL_CAP = 60;
export const LEVEL_CAP_60_FEATURE_ID = asBrandedId<"ManagementFeatureId">("level_cap_60");

export function getMemberLevelCap(state: GameState, content: ContentRegistry): number {
  return hasManagementFeature(state, content, LEVEL_CAP_60_FEATURE_ID)
    ? EXTENDED_MEMBER_LEVEL_CAP
    : BASE_MEMBER_LEVEL_CAP;
}

export function applyMemberExperience(member: Member, fraction: number, levelCap: number): number {
  if (member.progression.level >= levelCap || fraction <= 0) {
    if (member.progression.level >= levelCap) member.progression.experience = 0;
    return 0;
  }
  const before = member.progression.level + member.progression.experience;
  let experience = member.progression.experience + fraction;
  while (experience >= 1 && member.progression.level < levelCap) {
    member.progression.level += 1;
    experience -= 1;
  }
  member.progression.experience = member.progression.level >= levelCap ? 0 : experience;
  return member.progression.level + member.progression.experience - before;
}
