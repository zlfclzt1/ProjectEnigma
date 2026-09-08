import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { buildCombatProfile } from "../../src/domain/combat/formula-pipeline";
import type { CombatFormulaConfig } from "../../src/domain/combat/formula-context";
import { CombatStrategyNotFoundError } from "../../src/domain/combat/strategies/strategy-registry";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createItemInstanceFixture, createMemberFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

function config(): CombatFormulaConfig {
  return {
    formulaVersion: asBrandedId<"FormulaVersion">("classic-light-v1"),
    role: "tank",
    baseCapabilityPerLevel: {
      survivability: 1,
      threat: 0.8,
      healing: 0.1,
      damage: 0.35,
    },
    minimumFactors: {
      survivability: 0.25,
      threat: 0.25,
      healing: 0.1,
      damage: 0.25,
    },
    classBaseStats: {
      strengthPoints: { base: 0, perLevel: 1 },
      staminaPoints: { base: 0, perLevel: 1.2 },
      armorPoints: { base: 20, perLevel: 8 },
    },
    expectedStatsAtLevel: {
      staminaPoints: { base: 0, perLevel: 2 },
      armorPoints: { base: 0, perLevel: 20 },
      attackPowerPoints: { base: 0, perLevel: 4 },
    },
    derivedStatRules: [
      { sourceStatId: "strengthPoints", targetStatId: "attackPowerPoints", multiplier: 2 },
    ],
    linearWeights: {
      survivability: { staminaPoints: 0.3, armorPoints: 0.2 },
      threat: { attackPowerPoints: 0.25 },
      healing: {},
      damage: { attackPowerPoints: 0.2 },
    },
    strategies: [
      {
        strategyId: "shield-tank",
        armorExpected: 200,
        blockValueExpected: 10,
        survivabilityBonus: 0.2,
        threatBonus: 0.08,
      },
      {
        strategyId: "weapon-damage",
        capability: "damage",
        weaponType: "melee",
        expectedDamagePerSecond: 10,
        bonusWeight: 0.25,
      },
    ],
  };
}

function tankWithEquipment() {
  const member = createMemberFixture({
    equipment: {
      mainHand: asBrandedId<"ItemInstanceId">("main_hand"),
      offHand: asBrandedId<"ItemInstanceId">("shield"),
      ring1: asBrandedId<"ItemInstanceId">("ring"),
    },
  });
  const itemInstances = {
    main_hand: createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("main_hand"),
      definitionId: asBrandedId<"ItemDefinitionId">("14145"),
      ownerMemberId: member.id,
    }),
    shield: createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("shield"),
      definitionId: asBrandedId<"ItemDefinitionId">("13245"),
      ownerMemberId: member.id,
    }),
    ring: createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("ring"),
      definitionId: asBrandedId<"ItemDefinitionId">("6321"),
      ownerMemberId: member.id,
    }),
  };
  return { member, itemInstances };
}

describe("extensible combat formula pipeline", () => {
  it("runs the fixed stages and emits explainable stat contributions", () => {
    const { member, itemInstances } = tankWithEquipment();
    const profile = buildCombatProfile(
      {
        member,
        content,
        itemInstances,
        modifiers: [
          {
            id: "encounter-pressure",
            capability: "survivability",
            multiplier: 0.9,
            description: "测试遭遇压力",
          },
        ],
      },
      config(),
    );

    expect(profile.formulaVersion).toBe("classic-light-v1");
    expect(profile.role).toBe("tank");
    expect(Object.values(profile.capabilities).every(Number.isFinite)).toBe(true);
    expect(Object.values(profile.capabilities).every((value) => value >= 0)).toBe(true);
    expect(profile.diagnostics.map((entry) => entry.stage)).toEqual(
      expect.arrayContaining([
        "class-base",
        "equipment",
        "derived-stat",
        "linear-weight",
        "strategy",
        "modifier",
      ]),
    );
    expect(profile.diagnostics).toContainEqual(
      expect.objectContaining({
        stage: "equipment",
        statId: "blockValuePoints",
        sourceId: "item:13245",
        amount: 9,
      }),
    );
    expect(profile.diagnostics).toContainEqual(
      expect.objectContaining({
        stage: "derived-stat",
        statId: "attackPowerPoints",
        weight: 2,
      }),
    );
  });

  it("uses named nonlinear strategies for shields, weapons, hit, and mana sustain", () => {
    const { member, itemInstances } = tankWithEquipment();
    const baseConfig = config();
    const fullConfig: CombatFormulaConfig = {
      ...baseConfig,
      strategies: [
        ...baseConfig.strategies,
        {
          strategyId: "hit-threshold",
          capability: "threat",
          statId: "physicalHitPercent",
          capPercent: 5,
          bonusAtCap: 0.2,
        },
        {
          strategyId: "mana-sustain",
          capability: "healing",
          intellectExpected: 20,
          spiritExpected: 20,
          bonusWeight: 0.2,
        },
      ],
    };
    const profile = buildCombatProfile({ member, content, itemInstances }, fullConfig);
    const strategyIds = profile.diagnostics
      .filter((entry) => entry.stage === "strategy")
      .map((entry) => entry.sourceId);
    expect(strategyIds).toEqual(
      expect.arrayContaining(["shield-tank", "weapon-damage", "hit-threshold", "mana-sustain"]),
    );
  });

  it("keeps resistance data visible in diagnostics without changing capabilities by itself", () => {
    const member = createMemberFixture({
      equipment: { mainHand: asBrandedId<"ItemInstanceId">("nature_staff") },
    });
    const itemInstances = {
      nature_staff: createItemInstanceFixture({
        id: asBrandedId<"ItemInstanceId">("nature_staff"),
        definitionId: asBrandedId<"ItemDefinitionId">("6631"),
        ownerMemberId: member.id,
      }),
    };
    const withEquipment = buildCombatProfile({ member, content, itemInstances }, config());
    const noEquipment = buildCombatProfile(
      { member: { ...member, equipment: {} }, content, itemInstances: {} },
      config(),
    );
    const resistanceConfig: CombatFormulaConfig = {
      ...config(),
      linearWeights: { survivability: {}, threat: {}, healing: {}, damage: {} },
      strategies: [],
    };
    const resistanceOnly = buildCombatProfile({ member, content, itemInstances }, resistanceConfig);
    const neutralNoEquipment = buildCombatProfile(
      { member: { ...member, equipment: {} }, content, itemInstances: {} },
      resistanceConfig,
    );

    expect(resistanceOnly.diagnostics).toContainEqual(
      expect.objectContaining({
        stage: "equipment",
        statId: "natureResistancePoints",
        amount: 5,
      }),
    );
    expect(resistanceOnly.capabilities).toEqual(neutralNoEquipment.capabilities);
    expect(withEquipment.capabilities.damage).toBeGreaterThan(noEquipment.capabilities.damage);
  });

  it("rejects role mismatches and unknown strategy IDs instead of evaluating expressions", () => {
    const { member, itemInstances } = tankWithEquipment();
    expect(() =>
      buildCombatProfile({ member, content, itemInstances }, { ...config(), role: "dps" }),
    ).toThrow(/定位与专精/);
    expect(() =>
      buildCombatProfile(
        { member, content, itemInstances },
        {
          ...config(),
          strategies: [{ strategyId: "eval(userCode)" } as never],
        },
      ),
    ).toThrow(CombatStrategyNotFoundError);
  });
});
