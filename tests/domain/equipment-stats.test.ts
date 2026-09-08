import { describe, expect, it } from "vitest";
import { itemDefinitionSchema } from "../../src/content/schemas/item";
import { classicItemStatsSchema } from "../../src/content/schemas/item-stats";
import type { ClassicItemStats } from "../../src/domain/equipment/stats";

const representativeStats: ClassicItemStats = {
  primary: {
    strengthPoints: 5,
    staminaPoints: 7,
    intellectPoints: 3,
  },
  defense: {
    armorPoints: 120,
    defenseSkillPoints: 2,
    dodgePercent: 1.5,
  },
  physical: {
    attackPowerPoints: 14,
    hitPercent: 1,
    criticalStrikePercent: 0.5,
  },
  spell: {
    spellPowerPoints: 18,
    healingPowerPoints: 24,
    hitPercent: 1,
    criticalStrikePercent: 2,
  },
  weapon: {
    damage: { minimumPoints: 16, maximumPoints: 30 },
    speedSeconds: 2.4,
  },
  resistances: {
    arcanePoints: 5,
    firePoints: 10,
    frostPoints: 3,
    naturePoints: 4,
    shadowPoints: 8,
  },
};

describe("typed Classic item stats", () => {
  it("keeps point, percentage, second, and damage-range units explicit", () => {
    expect(classicItemStatsSchema.parse(representativeStats)).toEqual(representativeStats);
    expect(representativeStats.physical?.hitPercent).toBe(1);
    expect(representativeStats.weapon?.speedSeconds).toBe(2.4);
    expect(representativeStats.weapon?.damage).toEqual({
      minimumPoints: 16,
      maximumPoints: 30,
    });
  });

  it("rejects ambiguous fields, invalid percentages, and reversed weapon ranges", () => {
    expect(() => classicItemStatsSchema.parse({ physical: { crit: 1 } })).toThrow();
    expect(() =>
      classicItemStatsSchema.parse({ physical: { criticalStrikePercent: 101 } }),
    ).toThrow();
    expect(() =>
      classicItemStatsSchema.parse({
        weapon: {
          damage: { minimumPoints: 30, maximumPoints: 16 },
          speedSeconds: 2.4,
        },
      }),
    ).toThrow(/最低伤害/);
    expect(() =>
      classicItemStatsSchema.parse({
        weapon: {
          damage: { minimumPoints: 16, maximumPoints: 30 },
          speedSeconds: 0,
        },
      }),
    ).toThrow();
  });

  it("allows resistance display data while keeping the payload serializable", () => {
    const stats = classicItemStatsSchema.parse({
      resistances: { firePoints: 10, shadowPoints: 5 },
    });
    expect(JSON.parse(JSON.stringify(stats))).toEqual(stats);
  });

  it("only permits weapon data on weapon equipment slots", () => {
    const base = {
      id: "typed_test_item",
      name: { zhCN: "属性测试物品" },
      itemLevel: 20,
      quality: "uncommon",
      restrictions: { allowedClassIds: [], allowedRoles: [] },
      icon: { kind: "generic-slot" },
      description: { zhCN: "测试" },
      stats: { weapon: representativeStats.weapon },
      statsSource: {
        kind: "source-fact",
        provider: "wowhead-classic",
        externalId: "typed_test_item",
        url: "https://www.wowhead.com/classic/cn/item=typed_test_item&xml",
        verifiedAt: "2026-09-08",
      },
    } as const;
    expect(
      itemDefinitionSchema.parse({
        ...base,
        slot: "mainHand",
      }).stats.weapon,
    ).toEqual(representativeStats.weapon);
    expect(() => itemDefinitionSchema.parse({ ...base, slot: "chest" })).toThrow(/武器栏位/);
  });

  it("keeps an empty stat payload valid during staged content migration", () => {
    expect(classicItemStatsSchema.parse({})).toEqual({});
  });
});
