import type { EncounterDefinition } from "../../content/schemas/dungeon";
import { SeededRandomSource } from "../../infrastructure/random/seeded-random-source";
import type { ExpeditionActivity, ExpeditionEncounterPlan } from "../activity/activity";
import { asBrandedId, type MemberId } from "../shared/ids";
import type { CombatEvent } from "./combat-event";
import type { CombatReport, CombatRewardReport, MemberCombatReport } from "./combat-report";

export interface GenerateCombatReportRequest {
  readonly activity: ExpeditionActivity;
  readonly stage: ExpeditionEncounterPlan;
  readonly encounter: EncounterDefinition;
  readonly runNumber: number;
  readonly outcome: "victory" | "defeat";
  readonly settledAt: number;
  readonly rewards: CombatRewardReport;
}

export function generateCombatReport(request: GenerateCombatReportRequest): CombatReport {
  const { activity, stage, encounter, runNumber, outcome, settledAt, rewards } = request;
  const seed = `${activity.seed}:report:${runNumber}:${encounter.id}:${stage.successRoll}`;
  const random = new SeededRandomSource(seed);
  const equivalentHealth = Math.max(
    1,
    Math.round(encounter.requirements.damage * stage.durationSeconds * 10),
  );
  const totalDamage =
    outcome === "victory"
      ? equivalentHealth
      : Math.max(0, Math.round(equivalentHealth * (0.35 + random.next("wipe-progress") * 0.5)));
  const incomingDamageBudget = Math.max(
    1,
    Math.round(
      encounter.requirements.tank * stage.durationSeconds * 8 * (outcome === "victory" ? 1 : 1.25),
    ),
  );
  const totalHealing = Math.min(
    incomingDamageBudget,
    Math.round(
      incomingDamageBudget *
        (outcome === "victory"
          ? 0.72 + random.next("healing-success") * 0.18
          : 0.42 + random.next("healing-wipe") * 0.24),
    ),
  );
  const members = activity.partySnapshot.members;
  const damage = allocateTotal(
    totalDamage,
    members.map((member) => ({
      memberId: member.memberId,
      weight: member.combat.capabilities.damage * jitter(random, `damage:${member.memberId}`),
    })),
  );
  const healing = allocateTotal(
    totalHealing,
    members.map((member) => ({
      memberId: member.memberId,
      weight:
        member.combat.capabilities.healing *
        (member.combat.role === "healer" ? 1 : 0.08) *
        jitter(random, `healing:${member.memberId}`),
    })),
  );
  const damageTaken = allocateTotal(
    incomingDamageBudget,
    members.map((member) => ({
      memberId: member.memberId,
      weight:
        Math.max(0.01, member.combat.capabilities.survivability) *
        (member.combat.role === "tank" ? 4 : 1) *
        jitter(random, `damage-taken:${member.memberId}`),
    })),
  );
  const defeatedIds = defeatedMembers(activity, outcome, random);
  const memberReports: MemberCombatReport[] = members.map((member) => {
    const memberDamage = damage[member.memberId] ?? 0;
    const memberHealing = healing[member.memberId] ?? 0;
    const memberDamageTaken = damageTaken[member.memberId] ?? 0;
    const contributionScore =
      (totalDamage > 0 ? memberDamage / totalDamage : 0) * 55 +
      (totalHealing > 0 ? memberHealing / totalHealing : 0) * 25 +
      (incomingDamageBudget > 0 ? memberDamageTaken / incomingDamageBudget : 0) * 20;
    return {
      memberId: member.memberId,
      role: member.combat.role,
      damage: memberDamage,
      healing: memberHealing,
      damageTaken: memberDamageTaken,
      defeated: defeatedIds.has(member.memberId),
      contributionScore: Math.round(contributionScore * 100) / 100,
    };
  });

  return {
    id: asBrandedId<"CombatReportId">(`${activity.id}_run_${runNumber}_${encounter.id}`),
    formulaVersion: activity.partySnapshot.formulaVersion,
    activityId: activity.id,
    dungeonId: activity.dungeonId,
    encounterId: encounter.id,
    runNumber,
    outcome,
    startedProbability: stage.probability,
    actualDurationSeconds: stage.durationSeconds,
    settledAt,
    seed,
    parameters: { equivalentHealth, incomingDamageBudget },
    totals: { damage: totalDamage, healing: totalHealing, damageTaken: incomingDamageBudget },
    members: memberReports,
    events: combatEvents(memberReports, outcome),
    rewards,
  };
}

function jitter(random: SeededRandomSource, tag: string): number {
  return 0.9 + random.next(tag) * 0.2;
}

function allocateTotal(
  total: number,
  entries: readonly { readonly memberId: MemberId; readonly weight: number }[],
): Partial<Record<MemberId, number>> {
  if (entries.length === 0 || total <= 0) return {};
  const positive = entries.map((entry) => ({ ...entry, weight: Math.max(0, entry.weight) }));
  const weightTotal = positive.reduce((sum, entry) => sum + entry.weight, 0);
  const normalized =
    weightTotal > 0 ? positive : positive.map((entry) => ({ ...entry, weight: 1 }));
  const denominator = normalized.reduce((sum, entry) => sum + entry.weight, 0);
  const allocations = normalized.map((entry) => {
    const exact = (total * entry.weight) / denominator;
    return { memberId: entry.memberId, value: Math.floor(exact), remainder: exact % 1 };
  });
  let remaining = total - allocations.reduce((sum, entry) => sum + entry.value, 0);
  allocations.sort(
    (left, right) =>
      right.remainder - left.remainder || left.memberId.localeCompare(right.memberId),
  );
  for (let index = 0; remaining > 0; index = (index + 1) % allocations.length) {
    allocations[index]!.value += 1;
    remaining -= 1;
  }
  return Object.fromEntries(allocations.map((entry) => [entry.memberId, entry.value]));
}

function defeatedMembers(
  activity: ExpeditionActivity,
  outcome: "victory" | "defeat",
  random: SeededRandomSource,
): ReadonlySet<MemberId> {
  if (outcome === "victory") return new Set();
  const ranked = activity.partySnapshot.members
    .map((member) => ({
      memberId: member.memberId,
      score:
        member.combat.capabilities.survivability *
        (0.85 + random.next(`defeated:${member.memberId}`) * 0.3),
    }))
    .sort((left, right) => left.score - right.score || left.memberId.localeCompare(right.memberId));
  const count = Math.max(
    1,
    Math.ceil(ranked.length * (0.25 + random.next("defeated-count") * 0.35)),
  );
  return new Set(ranked.slice(0, count).map((entry) => entry.memberId));
}

function combatEvents(
  members: readonly MemberCombatReport[],
  outcome: "victory" | "defeat",
): readonly CombatEvent[] {
  const events: CombatEvent[] = [{ type: "encounter-outcome", outcome }];
  const topDamage = [...members].sort(
    (left, right) => right.damage - left.damage || left.memberId.localeCompare(right.memberId),
  )[0];
  const topHealing = [...members].sort(
    (left, right) => right.healing - left.healing || left.memberId.localeCompare(right.memberId),
  )[0];
  if (topDamage)
    events.push({ type: "top-damage", memberId: topDamage.memberId, damage: topDamage.damage });
  if (topHealing && topHealing.healing > 0) {
    events.push({
      type: "top-healing",
      memberId: topHealing.memberId,
      healing: topHealing.healing,
    });
  }
  for (const member of members.filter((entry) => entry.defeated)) {
    events.push({ type: "member-defeated", memberId: member.memberId });
  }
  return events;
}
