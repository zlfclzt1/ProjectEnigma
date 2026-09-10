import type { ContentRegistry } from "../../content/registry";
import type { LogTemplateGroup } from "../../content/schemas/log-template";
import type { CombatReport, MemberCombatReport } from "../../domain/combat/combat-report";
import type { GameState } from "../../domain/game-state";
import type { MemberId } from "../../domain/shared/ids";
import { SeededRandomSource } from "../../infrastructure/random/seeded-random-source";

export interface RenderedCombatLogEntry {
  readonly eventType: string;
  readonly text: string;
  readonly memberIds: readonly MemberId[];
}

export function renderCombatLog(
  report: CombatReport,
  state: Pick<GameState, "members">,
  content: ContentRegistry,
): readonly RenderedCombatLogEntry[] {
  const rareEntries: RenderedCombatLogEntry[] = report.events.flatMap((event) =>
    event.type === "rare-encounter-revealed"
      ? [
          {
            eventType: event.type,
            text: `探索途中发现了稀有首领“${content.encounterById.get(report.encounterId)?.name.zhCN ?? report.encounterId}”。`,
            memberIds: [],
          },
        ]
      : [],
  );
  const mechanicEntries: RenderedCombatLogEntry[] = (report.mechanics ?? []).map((result) => {
    const mechanic = content.mechanicById.get(result.mechanicId);
    const missing = result.requirements
      .filter((requirement) => !requirement.satisfied)
      .map((requirement) => content.capabilityById.get(requirement.capabilityId)?.name.zhCN)
      .filter((name): name is string => Boolean(name));
    const outcome = result.satisfied
      ? `队伍妥善处理了“${mechanic?.name.zhCN ?? result.mechanicId}”。`
      : result.type === "recommended"
        ? `队伍缺少${missing.join("、")}，未能完整处理“${mechanic?.name.zhCN ?? result.mechanicId}”，对应惩罚已生效。`
        : `队伍未满足“${mechanic?.name.zhCN ?? result.mechanicId}”的必需能力。`;
    return {
      eventType: `mechanic:${result.reportTag}`,
      text: outcome,
      memberIds: [],
    };
  });
  const byId = new Map(report.members.map((member) => [member.memberId, member]));
  const tank = best(
    report.members.filter((member) => member.role === "tank"),
    "damageTaken",
  );
  const healer = best(
    report.members.filter((member) => member.role === "healer"),
    "healing",
  );
  const topDamage = best(report.members, "damage");
  const topHealing = best(report.members, "healing");
  const slacker = [...report.members].sort(
    (left, right) =>
      left.contributionScore - right.contributionScore ||
      left.memberId.localeCompare(right.memberId),
  )[0];
  const entries: Array<{
    eventType: LogTemplateGroup["eventType"];
    members: readonly (MemberCombatReport | undefined)[];
  }> = [];
  entries.push({
    eventType: report.outcome === "victory" ? "encounter-victory" : "encounter-failure",
    members: [tank, healer, topDamage],
  });
  if (topDamage) entries.push({ eventType: "report-top-damage", members: [topDamage] });
  if (topHealing?.healing) {
    entries.push({ eventType: "report-top-healing", members: [topHealing] });
  }
  if (tank && tank.damageTaken >= report.totals.damageTaken * 0.35) {
    entries.push({ eventType: "report-tank-danger", members: [tank, healer] });
  }
  if (slacker && report.members.length > 1) {
    entries.push({ eventType: "report-slacker", members: [slacker] });
  }
  for (const event of report.events) {
    if (event.type !== "member-defeated") continue;
    entries.push({ eventType: "report-member-defeated", members: [byId.get(event.memberId)] });
  }

  const random = new SeededRandomSource(`${report.seed}:render`);
  const renderedEntries = entries.flatMap((entry, index) => {
    const group = selectGroup(content, report, entry.eventType);
    if (!group) return [];
    const templateIndex = Math.floor(random.next(`template:${index}`) * group.templates.length);
    const template = group.templates[Math.min(templateIndex, group.templates.length - 1)]!;
    const [first, , third] = entry.members;
    const parameters: Record<string, string> = {
      tank: name(state, tank?.memberId),
      healer: name(state, healer?.memberId),
      member: name(state, third?.memberId ?? first?.memberId),
      "top-damage": name(state, topDamage?.memberId),
      "top-healer": name(state, topHealing?.memberId),
      slacker: name(state, slacker?.memberId),
      defeated: name(state, first?.memberId),
    };
    return [
      {
        eventType: entry.eventType,
        text: template.replaceAll(
          /\{([a-z][a-z0-9_-]*)\}/g,
          (_, key: string) => parameters[key] ?? "成员",
        ),
        memberIds: entry.members.flatMap((member) => (member ? [member.memberId] : [])),
      },
    ];
  });
  return [...rareEntries, ...mechanicEntries, ...renderedEntries];
}

function best(
  members: readonly MemberCombatReport[],
  field: "damage" | "healing" | "damageTaken",
): MemberCombatReport | undefined {
  return [...members].sort(
    (left, right) => right[field] - left[field] || left.memberId.localeCompare(right.memberId),
  )[0];
}

function selectGroup(
  content: ContentRegistry,
  report: CombatReport,
  eventType: LogTemplateGroup["eventType"],
): LogTemplateGroup | undefined {
  const candidates = content.logTemplates.filter((group) => group.eventType === eventType);
  return (
    candidates.find(
      (group) => group.scope.type === "encounter" && group.scope.encounterId === report.encounterId,
    ) ??
    candidates.find(
      (group) => group.scope.type === "dungeon" && group.scope.dungeonId === report.dungeonId,
    ) ??
    candidates.find((group) => group.scope.type === "global") ??
    (eventType === "encounter-victory"
      ? content.logTemplates.find(
          (group) =>
            group.eventType === "dungeon-flavor" &&
            group.scope.type === "dungeon" &&
            group.scope.dungeonId === report.dungeonId,
        )
      : undefined)
  );
}

function name(state: Pick<GameState, "members">, memberId?: MemberId): string {
  return memberId ? (state.members[memberId]?.identity.name ?? "成员") : "成员";
}
