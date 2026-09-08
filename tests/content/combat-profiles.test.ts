import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { ContentRegistry } from "../../src/content/registry";
import type { ItemDefinition } from "../../src/content/schemas/item";
import { buildCombatProfile } from "../../src/domain/combat/formula-pipeline";
import type { CombatStatId } from "../../src/domain/combat/formula-context";
import type { ClassicItemStats } from "../../src/domain/equipment/stats";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createItemInstanceFixture, createMemberFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

function statsFor(statId: CombatStatId, amount: number): ClassicItemStats {
  if (
    [
      "strengthPoints",
      "agilityPoints",
      "staminaPoints",
      "intellectPoints",
      "spiritPoints",
    ].includes(statId)
  ) {
    return { primary: { [statId]: amount } };
  }
  if (statId === "attackPowerPoints" || statId === "rangedAttackPowerPoints") {
    return { physical: { [statId]: amount } };
  }
  if (statId === "spellPowerPoints" || statId === "healingPowerPoints") {
    return { spell: { [statId]: amount } };
  }
  throw new Error(`测试代表装备尚未支持属性 ${statId}`);
}

function representativeStat(profile: (typeof content.combatProfiles)[number]): CombatStatId {
  const capability =
    profile.role === "tank" ? "survivability" : profile.role === "healer" ? "healing" : "damage";
  const weighted = Object.entries(profile.linearWeights[capability]).filter(
    (entry): entry is [CombatStatId, number] => typeof entry[1] === "number" && entry[1] > 0,
  );
  weighted.sort((left, right) => right[1] - left[1]);
  if (!weighted[0]) throw new Error(`战斗配置 ${profile.id} 缺少主职责属性权重`);
  return weighted[0][0];
}

function syntheticItem(id: string, itemLevel: number, stats: ClassicItemStats): ItemDefinition {
  return {
    id: asBrandedId<"ItemDefinitionId">(id),
    name: { zhCN: id },
    itemLevel,
    quality: "common",
    slot: "chest",
    twoHanded: false,
    restrictions: { allowedClassIds: [], allowedRoles: [] },
    icon: { kind: "generic-slot" },
    description: { zhCN: "战斗公式测试装备" },
    isStarter: true,
    stats,
    statsSource: {
      kind: "design-decision",
      provider: "manual",
      verifiedAt: "2026-09-08",
    },
    statsBalanceOverride: {
      fields: ["stats"],
      reason: "隔离验证战斗属性方向。",
      decidedAt: "2026-09-08",
    },
  };
}

function registryWithItems(items: readonly ItemDefinition[]): ContentRegistry {
  return {
    ...content,
    itemById: new Map([...content.itemById, ...items.map((item) => [item.id, item] as const)]),
  } as unknown as ContentRegistry;
}

describe("versioned combat profile content", () => {
  it("provides one valid role-matched configuration for every current spec", () => {
    expect(content.combatProfiles).toHaveLength(28);
    expect(new Set(content.combatProfiles.map((profile) => profile.specId)).size).toBe(28);
    expect(new Set(content.combatProfiles.map((profile) => profile.formulaVersion))).toEqual(
      new Set(["classic-light-v1"]),
    );
    for (const spec of content.specs) {
      const profile = content.combatProfileById.get(spec.combatProfileId);
      expect(profile?.specId).toBe(spec.id);
      expect(profile?.role).toBe(spec.role);
    }
  });

  it("builds finite non-negative combat capabilities for all 28 specs", () => {
    for (const spec of content.specs) {
      const profile = content.combatProfileById.get(spec.combatProfileId)!;
      const member = createMemberFixture({
        identity: {
          ...createMemberFixture().identity,
          classId: spec.classId,
        },
        progression: {
          level: 40,
          experience: 0,
          specId: spec.id,
        },
      });
      const result = buildCombatProfile({ member, content, itemInstances: {} }, profile);
      expect(result.formulaVersion).toBe("classic-light-v1");
      expect(Object.values(result.capabilities).every(Number.isFinite)).toBe(true);
      expect(Object.values(result.capabilities).every((value) => value >= 0)).toBe(true);
    }
  });

  it("rewards each spec's representative primary stat while ignoring an unrelated resistance", () => {
    for (const spec of content.specs) {
      const profile = content.combatProfileById.get(spec.combatProfileId)!;
      const statId = representativeStat(profile);
      const useful = syntheticItem(`useful_${spec.id}`, 10, statsFor(statId, 40));
      const wrong = syntheticItem(`wrong_${spec.id}`, 60, {
        resistances: { firePoints: 40 },
      });
      const testContent = registryWithItems([useful, wrong]);
      const baseMember = createMemberFixture({
        identity: { ...createMemberFixture().identity, classId: spec.classId },
        progression: { level: 40, experience: 0, specId: spec.id },
      });
      const usefulInstance = createItemInstanceFixture({
        id: asBrandedId<"ItemInstanceId">(`useful_instance_${spec.id}`),
        definitionId: useful.id,
        ownerMemberId: baseMember.id,
      });
      const wrongInstance = createItemInstanceFixture({
        id: asBrandedId<"ItemInstanceId">(`wrong_instance_${spec.id}`),
        definitionId: wrong.id,
        ownerMemberId: baseMember.id,
      });
      const baseline = buildCombatProfile(
        { member: baseMember, content: testContent, itemInstances: {} },
        profile,
      );
      const withUseful = buildCombatProfile(
        {
          member: { ...baseMember, equipment: { chest: usefulInstance.id } },
          content: testContent,
          itemInstances: { [usefulInstance.id]: usefulInstance },
        },
        profile,
      );
      const withWrong = buildCombatProfile(
        {
          member: { ...baseMember, equipment: { chest: wrongInstance.id } },
          content: testContent,
          itemInstances: { [wrongInstance.id]: wrongInstance },
        },
        profile,
      );
      const capability =
        profile.role === "tank"
          ? "survivability"
          : profile.role === "healer"
            ? "healing"
            : "damage";
      expect(withUseful.capabilities[capability], spec.id).toBeGreaterThan(
        baseline.capabilities[capability],
      );
      expect(withWrong.capabilities[capability], spec.id).toBe(baseline.capabilities[capability]);
    }
  });

  it("rates stronger real stats above item level for every spec", () => {
    for (const spec of content.specs) {
      const profile = content.combatProfileById.get(spec.combatProfileId)!;
      const statId = representativeStat(profile);
      const lowerItemLevel = syntheticItem(`strong_${spec.id}`, 10, statsFor(statId, 40));
      const higherItemLevel = syntheticItem(`weak_${spec.id}`, 60, statsFor(statId, 5));
      const testContent = registryWithItems([lowerItemLevel, higherItemLevel]);
      const member = createMemberFixture({
        identity: { ...createMemberFixture().identity, classId: spec.classId },
        progression: { level: 40, experience: 0, specId: spec.id },
      });
      const strongInstance = createItemInstanceFixture({
        id: asBrandedId<"ItemInstanceId">(`strong_instance_${spec.id}`),
        definitionId: lowerItemLevel.id,
        ownerMemberId: member.id,
      });
      const weakInstance = createItemInstanceFixture({
        id: asBrandedId<"ItemInstanceId">(`weak_instance_${spec.id}`),
        definitionId: higherItemLevel.id,
        ownerMemberId: member.id,
      });
      const strong = buildCombatProfile(
        {
          member: { ...member, equipment: { chest: strongInstance.id } },
          content: testContent,
          itemInstances: { [strongInstance.id]: strongInstance },
        },
        profile,
      );
      const weak = buildCombatProfile(
        {
          member: { ...member, equipment: { chest: weakInstance.id } },
          content: testContent,
          itemInstances: { [weakInstance.id]: weakInstance },
        },
        profile,
      );
      const capability =
        profile.role === "tank"
          ? "survivability"
          : profile.role === "healer"
            ? "healing"
            : "damage";
      expect(strong.capabilities[capability], spec.id).toBeGreaterThan(
        weak.capabilities[capability],
      );
    }
  });

  it("uses every named nonlinear strategy in the current profile set", () => {
    const ids = new Set(
      content.combatProfiles.flatMap((profile) =>
        profile.strategies.map((strategy) => strategy.strategyId),
      ),
    );
    expect(ids).toEqual(new Set(["hit-threshold", "shield-tank", "weapon-damage", "mana-sustain"]));
  });
});
