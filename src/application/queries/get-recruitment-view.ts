import type { ContentRegistry } from "../../content/registry";
import { EQUIPMENT_SLOTS } from "../../domain/equipment/equipment-slot";
import { EQUIPMENT_SLOT_WEIGHTS } from "../../domain/equipment/item-level";
import type { GameStateV2 } from "../../domain/game-state";
import { PAID_CANDIDATE_COST } from "../../domain/guild/recruitment";
import type { CandidateId, ClassId } from "../../domain/shared/ids";

export interface RecruitCandidateView {
  readonly id: CandidateId;
  readonly name: string;
  readonly level: number;
  readonly itemLevel: number;
  readonly className: string;
  readonly specName: string;
  readonly role: "tank" | "healer" | "dps";
  readonly roleName: string;
  readonly personalityName: string;
  readonly personalityBenefit: string;
  readonly personalityDrawback: string;
  readonly isHidden: boolean;
}

export interface RecruitmentView {
  readonly candidates: readonly RecruitCandidateView[];
  readonly candidateCount: number;
  readonly candidateCapacity: number;
  readonly memberCount: number;
  readonly memberCapacity: number;
  readonly funds: number;
  readonly paidRefreshCost: number;
  readonly canPaidRefresh: boolean;
  readonly paidRefreshReason?: string;
  readonly canRecruit: boolean;
  readonly recruitmentFull: boolean;
  readonly nextCandidateAt?: number;
  readonly remainingMilliseconds?: number;
}

function starterItemLevel(content: ContentRegistry, classId: ClassId): number {
  const armorType = content.classById.get(classId)?.armorType;
  let weightedLevels = 0;
  let totalWeight = 0;
  for (const slot of EQUIPMENT_SLOTS) {
    const weight = EQUIPMENT_SLOT_WEIGHTS[slot];
    const item = content.items.find(
      (definition) =>
        definition.isStarter &&
        definition.slot === slot &&
        (definition.armorType === undefined || definition.armorType === armorType),
    );
    if (!item) continue;
    weightedLevels += item.itemLevel * weight;
    totalWeight += weight;
  }
  return totalWeight === 0 ? 0 : Math.round((weightedLevels / totalWeight) * 100) / 100;
}

export function getRecruitmentView(
  state: GameStateV2,
  content: ContentRegistry,
  now: number,
): RecruitmentView {
  const candidates = Object.values(state.candidates).map((candidate): RecruitCandidateView => {
    const spec = content.specById.get(candidate.progression.specId)!;
    const personality = content.personalityById.get(candidate.identity.personalityId)!;
    return {
      id: candidate.id,
      name: candidate.identity.name,
      level: candidate.progression.level,
      itemLevel: starterItemLevel(content, candidate.identity.classId),
      className: content.classById.get(candidate.identity.classId)?.name.zhCN ?? "未知职业",
      specName: spec.name.zhCN,
      role: spec.role,
      roleName: content.roleById.get(spec.role)?.name.zhCN ?? spec.role,
      personalityName: personality.name.zhCN,
      personalityBenefit: personality.benefit.zhCN,
      personalityDrawback: personality.drawback.zhCN,
      isHidden: candidate.identity.hiddenCharacterId !== undefined,
    };
  });
  const recruitmentFull = candidates.length >= state.guild.candidateCapacity;
  const memberCount = Object.keys(state.members).length;
  const canRecruit = memberCount < state.guild.memberCapacity;
  let paidRefreshReason: string | undefined;
  if (recruitmentFull) paidRefreshReason = "候选区已经满员。";
  else if (state.guild.funds < PAID_CANDIDATE_COST) paidRefreshReason = "公会资金不足。";
  const nextCandidateAt = state.recruitment.nextCandidateAt;
  return {
    candidates,
    candidateCount: candidates.length,
    candidateCapacity: state.guild.candidateCapacity,
    memberCount,
    memberCapacity: state.guild.memberCapacity,
    funds: state.guild.funds,
    paidRefreshCost: PAID_CANDIDATE_COST,
    canPaidRefresh: paidRefreshReason === undefined,
    ...(paidRefreshReason ? { paidRefreshReason } : {}),
    canRecruit,
    recruitmentFull,
    ...(nextCandidateAt === undefined
      ? {}
      : {
          nextCandidateAt,
          remainingMilliseconds: Math.max(0, nextCandidateAt - now),
        }),
  };
}
