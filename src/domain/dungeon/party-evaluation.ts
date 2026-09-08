import type { ContentRegistry } from "../../content/registry";
import type { DungeonDefinition, EncounterDefinition } from "../../content/schemas/dungeon";
import { averageEquippedItemLevel } from "../equipment/item-level";
import type { GameStateV2 } from "../game-state";
import type { Member } from "../member/member";
import type { DungeonId, EncounterId, MemberId } from "../shared/ids";

type Role = "tank" | "healer" | "dps";

export interface PartyEvaluationIssue {
  readonly code: string;
  readonly message: string;
  readonly memberId?: MemberId;
}

export interface PartyContribution {
  readonly tank: number;
  readonly healing: number;
  readonly damage: number;
}

export interface EncounterPreview {
  readonly encounterId: EncounterId;
  readonly probability: number;
  readonly rawRatios: PartyContribution;
  readonly readiness: number;
  readonly durationSeconds: number;
}

export interface PartyPreview {
  readonly dungeonId: DungeonId;
  readonly memberIds: readonly MemberId[];
  readonly contribution: PartyContribution;
  readonly encounters: readonly EncounterPreview[];
  readonly clearProbability: number;
  readonly durationSeconds: number;
}

export type PartyPreviewResult =
  | { readonly ok: true; readonly preview: PartyPreview }
  | { readonly ok: false; readonly issues: readonly PartyEvaluationIssue[] };

export function evaluateExpeditionParty(
  state: GameStateV2,
  content: ContentRegistry,
  dungeonId: DungeonId,
  memberIds: readonly MemberId[],
): PartyPreviewResult {
  const dungeon = content.dungeonById.get(dungeonId);
  if (!dungeon) {
    return { ok: false, issues: [{ code: "dungeon.not-found", message: "找不到该副本。" }] };
  }

  const issues: PartyEvaluationIssue[] = [];
  const members: Member[] = [];
  for (const memberId of memberIds) {
    const member = state.members[memberId];
    if (!member) {
      issues.push({ code: "member.not-found", message: "队伍中存在无效成员。", memberId });
      continue;
    }
    if (!content.specById.has(member.progression.specId)) {
      issues.push({ code: "member.spec-not-found", message: "成员专精不存在。", memberId });
    }
    for (const itemInstanceId of Object.values(member.equipment)) {
      const instance = state.itemInstances[itemInstanceId];
      if (!instance || !content.itemById.has(instance.definitionId)) {
        issues.push({
          code: "member.equipment-not-found",
          message: "成员装备数据不完整。",
          memberId,
        });
        break;
      }
    }
    members.push(member);
  }
  if (issues.length > 0) return { ok: false, issues };

  const contribution = partyContribution(state, content, dungeon, members);
  const encounters = dungeon.route.map((encounterId) => {
    const encounter = content.encounterById.get(encounterId)!;
    const probability = bossProbability(contribution, encounter, dungeon);
    return {
      encounterId,
      ...probability,
      durationSeconds: stageDurationSeconds(contribution, encounter, dungeon, members),
    };
  });
  return {
    ok: true,
    preview: {
      dungeonId,
      memberIds: [...memberIds],
      contribution,
      encounters,
      clearProbability: encounters.reduce((product, result) => product * result.probability, 1),
      durationSeconds: encounters.reduce((sum, result) => sum + result.durationSeconds, 0),
    },
  };
}

function clamp(minimum: number, maximum: number, value: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function personalityPowerMultiplier(
  member: Member,
  dungeon: DungeonDefinition,
  party: readonly Member[],
): number {
  switch (member.identity.personalityId) {
    case "steady":
      return 1.08;
    case "impatient":
      return 0.92;
    case "competitive":
      if (member.progression.level < dungeon.recommendedLevel) return 1.1;
      if (member.progression.level >= dungeon.recommendedLevel + 5) return 0.95;
      return 1;
    case "sociable": {
      const uniqueClasses = new Set(party.map((candidate) => candidate.identity.classId)).size;
      if (uniqueClasses === party.length) return 1.08;
      if (uniqueClasses <= Math.ceil(party.length / 2)) return 0.95;
      return 1.03;
    }
    case "clever":
      return member.progression.level < dungeon.recommendedLevel
        ? 1 + Math.min(0.1, (dungeon.recommendedLevel - member.progression.level) * 0.015)
        : 1;
    default:
      return 1;
  }
}

function memberPower(
  state: GameStateV2,
  content: ContentRegistry,
  member: Member,
  dungeon: DungeonDefinition,
  party: readonly Member[],
): number {
  const itemLevel = averageEquippedItemLevel(member, state.itemInstances, content);
  const equipmentFactor = clamp(
    0.5,
    1.75,
    0.5 + itemLevel / (2 * Math.max(1, member.progression.level)),
  );
  return (
    member.progression.level * equipmentFactor * personalityPowerMultiplier(member, dungeon, party)
  );
}

function partyContribution(
  state: GameStateV2,
  content: ContentRegistry,
  dungeon: DungeonDefinition,
  party: readonly Member[],
): PartyContribution {
  return party.reduce<PartyContribution>(
    (total, member) => {
      const power = memberPower(state, content, member, dungeon, party);
      const role = content.specById.get(member.progression.specId)!.role as Role;
      if (role === "tank") {
        return { ...total, tank: total.tank + power, damage: total.damage + power * 0.35 };
      }
      if (role === "healer") {
        return { ...total, healing: total.healing + power, damage: total.damage + power * 0.2 };
      }
      return { ...total, damage: total.damage + power };
    },
    { tank: 0, healing: 0, damage: 0 },
  );
}

function effectiveRatio(ratio: number, surplusEffect: number): number {
  const limited = clamp(0, 2.5, ratio);
  return limited <= 1 ? limited : 1 + (limited - 1) * surplusEffect;
}

function bossProbability(
  contribution: PartyContribution,
  encounter: EncounterDefinition,
  dungeon: DungeonDefinition,
): { probability: number; rawRatios: PartyContribution; readiness: number } {
  const rawRatios = {
    tank: contribution.tank / encounter.requirements.tank,
    healing: contribution.healing / encounter.requirements.healing,
    damage: contribution.damage / encounter.requirements.damage,
  };
  const settings = dungeon.probability;
  if (Object.values(rawRatios).every((ratio) => ratio >= settings.overpowerThreshold)) {
    return { probability: 1, rawRatios, readiness: 1.5 };
  }
  const geometricReadiness = (["tank", "healing", "damage"] as const).reduce(
    (product, role) =>
      product * effectiveRatio(rawRatios[role], settings.surplusEffect) ** encounter.weights[role],
    1,
  );
  const bottleneck = Math.min(rawRatios.tank, rawRatios.healing, rawRatios.damage);
  const readiness =
    geometricReadiness * settings.geometricWeight + bottleneck * settings.bottleneckWeight;
  return {
    probability: clamp(
      settings.minimum,
      settings.maximum,
      settings.base + settings.readinessMultiplier * readiness,
    ),
    rawRatios,
    readiness,
  };
}

function partyDurationModifier(party: readonly Member[]): number {
  if (party.length === 0) return 1;
  return (
    party.reduce((sum, member) => {
      if (member.identity.personalityId === "steady") return sum + 1.08;
      if (member.identity.personalityId === "impatient") return sum + 0.92;
      if (member.identity.personalityId === "diligent") return sum + 1.05;
      return sum + 1;
    }, 0) / party.length
  );
}

function stageDurationSeconds(
  contribution: PartyContribution,
  encounter: EncounterDefinition,
  dungeon: DungeonDefinition,
  party: readonly Member[],
): number {
  const damageRatio = encounter.requirements.damage / Math.max(0.01, contribution.damage);
  const outputFactor = clamp(0.5, 1.5, damageRatio ** 0.6);
  const tankRatio = contribution.tank / encounter.requirements.tank;
  const healingRatio = contribution.healing / encounter.requirements.healing;
  const survivalFactor =
    1 + Math.max(0, 1 - tankRatio) * 0.25 + Math.max(0, 1 - healingRatio) * 0.25;
  const ratio = clamp(
    dungeon.duration.minimumRatio,
    dungeon.duration.maximumRatio,
    outputFactor * survivalFactor * partyDurationModifier(party),
  );
  return Math.round(encounter.stageSeconds * ratio);
}
