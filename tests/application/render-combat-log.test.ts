import { describe, expect, it } from "vitest";
import { renderCombatLog } from "../../src/application/queries/render-combat-log";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { ContentRegistry } from "../../src/content/registry";
import type { CombatReport } from "../../src/domain/combat/combat-report";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createMemberFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();
const tankId = asBrandedId<"MemberId">("tank_member");
const healerId = asBrandedId<"MemberId">("healer_member");
const damageId = asBrandedId<"MemberId">("damage_member");

function fixture() {
  const members = {
    [tankId]: createMemberFixture({
      id: tankId,
      identity: { ...createMemberFixture().identity, name: "铁墙" },
    }),
    [healerId]: createMemberFixture({
      id: healerId,
      identity: { ...createMemberFixture().identity, name: "奶瓶" },
    }),
    [damageId]: createMemberFixture({
      id: damageId,
      identity: { ...createMemberFixture().identity, name: "火花" },
    }),
  };
  const report: CombatReport = {
    id: asBrandedId<"CombatReportId">("report_1"),
    formulaVersion: asBrandedId<"FormulaVersion">("classic-light-v1"),
    activityId: asBrandedId<"ActivityId">("activity_1"),
    dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
    encounterId: asBrandedId<"EncounterId">("oggleflint"),
    runNumber: 1,
    outcome: "defeat",
    startedProbability: 0.8,
    actualDurationSeconds: 120,
    settledAt: 121_000,
    seed: "render-report-seed",
    parameters: { equivalentHealth: 10_000, incomingDamageBudget: 7_000 },
    totals: { damage: 7_000, healing: 4_000, damageTaken: 7_000 },
    members: [
      {
        memberId: tankId,
        role: "tank",
        damage: 1_000,
        healing: 0,
        damageTaken: 4_000,
        defeated: false,
        contributionScore: 35,
      },
      {
        memberId: healerId,
        role: "healer",
        damage: 500,
        healing: 4_000,
        damageTaken: 1_500,
        defeated: false,
        contributionScore: 40,
      },
      {
        memberId: damageId,
        role: "dps",
        damage: 5_500,
        healing: 0,
        damageTaken: 1_500,
        defeated: true,
        contributionScore: 20,
      },
    ],
    events: [
      { type: "encounter-outcome", outcome: "defeat" },
      { type: "top-damage", memberId: damageId, damage: 5_500 },
      { type: "top-healing", memberId: healerId, healing: 4_000 },
      { type: "member-defeated", memberId: damageId },
    ],
    rewards: {
      experienceFractionByMember: {},
      funds: 0,
      firstKillBonus: 0,
      itemInstanceIds: [],
    },
    mechanics: [
      {
        mechanicId: asBrandedId<"MechanicId">("test_recommended_magic_dispel"),
        reportTag: "recommended_magic_dispel",
        type: "recommended",
        satisfied: false,
        requirements: [
          {
            capabilityId: asBrandedId<"CapabilityId">("magic_dispel"),
            currentValue: 0,
            minimumValue: 1,
            satisfied: false,
          },
        ],
        appliedEffects: { healingMultiplier: 1.15 },
      },
    ],
  };
  return { members, report };
}

describe("playful combat log rendering", () => {
  it("renders only facts supported by the structured report", () => {
    const { members, report } = fixture();
    const logs = renderCombatLog(report, { members }, content);

    expect(logs.map((entry) => entry.eventType)).toEqual(
      expect.arrayContaining([
        "encounter-failure",
        "report-top-damage",
        "report-top-healing",
        "report-tank-danger",
        "report-slacker",
        "report-member-defeated",
      ]),
    );
    expect(logs[0]).toMatchObject({
      eventType: "mechanic:recommended_magic_dispel",
      text: expect.stringContaining("建议驱散魔法"),
    });
    expect(logs[0]!.text).toContain("对应惩罚已生效");
    expect(logs.find((entry) => entry.eventType === "report-top-damage")?.text).toContain("火花");
    expect(logs.find((entry) => entry.eventType === "report-top-healing")?.text).toContain("奶瓶");
    expect(logs.find((entry) => entry.eventType === "report-tank-danger")?.text).toContain("铁墙");
    expect(logs.find((entry) => entry.eventType === "report-slacker")?.text).toContain("火花");
    expect(logs.find((entry) => entry.eventType === "report-member-defeated")?.text).toContain(
      "火花",
    );
    expect(renderCombatLog(report, { members }, content)).toEqual(logs);
  });

  it("allows template changes without mutating combat outcomes or rewards", () => {
    const { members, report } = fixture();
    const before = structuredClone(report);
    const modified = {
      ...content,
      logTemplates: content.logTemplates.map((group) =>
        group.eventType === "report-top-damage"
          ? { ...group, templates: ["{top-damage} 获得了自定义最高输出播报。"] }
          : group,
      ),
    } as unknown as ContentRegistry;

    const logs = renderCombatLog(report, { members }, modified);

    expect(logs.find((entry) => entry.eventType === "report-top-damage")?.text).toBe(
      "火花 获得了自定义最高输出播报。",
    );
    expect(report).toEqual(before);
  });

  it("renders a factual rare encounter reveal before the combat flavor", () => {
    const { members, report } = fixture();
    const rareReport: CombatReport = {
      ...report,
      events: [
        ...report.events,
        {
          type: "rare-encounter-revealed",
          routeNodeId: asBrandedId<"DungeonRouteNodeId">("rare_oggleflint"),
        },
      ],
    };

    const logs = renderCombatLog(rareReport, { members }, content);

    expect(logs[0]).toEqual({
      eventType: "rare-encounter-revealed",
      text: "探索途中发现了稀有首领“奥格弗林特”。",
      memberIds: [],
    });
  });
});
