import { describe, expect, it } from "vitest";
import { dungeonDefinitionSchema } from "../../src/content/schemas/dungeon";
import {
  brandedContentIdSchema,
  itemQualitySchema,
  levelSchema,
  localizedTextSchema,
  positiveWeightSchema,
} from "../../src/content/schemas/common";
import {
  contentAttributionSchema,
  contentGameVersionSchema,
  contentSourceSchema,
} from "../../src/content/schemas/content-source";
import type { DungeonId } from "../../src/domain/shared/ids";

describe("content schema foundation", () => {
  it("requires recommended role counts to match the recommended party size", () => {
    const base = {
      id: "ten_player_test",
      name: { zhCN: "十人职责测试" },
      minimumLevel: 58,
      recommendedLevel: 60,
      defaultUnlocked: false,
      members: {
        minimum: 1,
        maximum: 10,
        recommended: 10,
        recommendedRoles: { tank: 2, healer: 2, dps: 6 },
      },
      duration: { baseSeconds: 600, minimumRatio: 0.5, maximumRatio: 2 },
      probability: {
        minimum: 0.05,
        maximum: 0.99,
        base: 0.8,
        readinessMultiplier: 1,
        surplusEffect: 0.1,
        geometricWeight: 0.5,
        bottleneckWeight: 0.5,
        overpowerThreshold: 2,
      },
      combatTuning: {
        bossProbabilityMaximum: 0.99,
        requirementMultipliers: { tank: 1, healing: 1, damage: 1 },
      },
      route: [{ id: "boss", type: "required", encounterId: "boss" }],
    } as const;

    expect(dungeonDefinitionSchema.safeParse(base).success).toBe(true);
    expect(
      dungeonDefinitionSchema.safeParse({
        ...base,
        members: {
          ...base.members,
          recommendedRoles: { tank: 2, healer: 3, dps: 6 },
        },
      }).success,
    ).toBe(false);
  });
  it("parses a content ID into its domain-specific branded type", () => {
    const dungeonIdSchema = brandedContentIdSchema<"DungeonId">();
    const dungeonId: DungeonId = dungeonIdSchema.parse("ragefire_chasm");
    expect(dungeonId).toBe("ragefire_chasm");
    expect(() => dungeonIdSchema.parse("")).toThrow();
    expect(() => dungeonIdSchema.parse("Ragefire Chasm")).toThrow();
    expect(() => dungeonIdSchema.parse("dungeons/ragefire")).toThrow();
  });

  it("rejects invalid common balance and display values", () => {
    expect(levelSchema.parse(60)).toBe(60);
    expect(() => levelSchema.parse(0)).toThrow();
    expect(() => levelSchema.parse(10.5)).toThrow();
    expect(positiveWeightSchema.parse(0.25)).toBe(0.25);
    expect(() => positiveWeightSchema.parse(0)).toThrow();
    expect(itemQualitySchema.parse("epic")).toBe("epic");
    expect(() => itemQualitySchema.parse("legendary")).toThrow();
    expect(localizedTextSchema.parse({ zhCN: "怒焰裂谷", enUS: "Ragefire Chasm" })).toEqual({
      zhCN: "怒焰裂谷",
      enUS: "Ragefire Chasm",
    });
  });

  it("distinguishes sourced facts from manual design decisions", () => {
    expect(
      contentSourceSchema.parse({
        kind: "source-fact",
        provider: "wowhead-classic",
        gameVersion: "classic-2019-phase-6",
        externalId: "14145",
        url: "https://www.wowhead.com/classic/item=14145",
        verifiedAt: "2026-09-07",
      }),
    ).toMatchObject({ provider: "wowhead-classic" });
    expect(contentGameVersionSchema.parse("classic-2019-phase-6")).toBe("classic-2019-phase-6");
    expect(() => contentGameVersionSchema.parse("season-of-discovery")).toThrow();

    expect(() =>
      contentSourceSchema.parse({
        kind: "source-fact",
        provider: "manual",
        verifiedAt: "2026-09-07",
      }),
    ).toThrow();
    expect(() =>
      contentSourceSchema.parse({
        kind: "source-fact",
        provider: "warcraft-wiki",
        gameVersion: "classic-2019-phase-6",
        verifiedAt: "2026-09-07",
      }),
    ).toThrow();
    expect(() =>
      contentSourceSchema.parse({
        kind: "source-fact",
        provider: "warcraft-wiki",
        url: "https://warcraft.wiki.gg/wiki/Ragefire_Chasm_(Classic)",
        verifiedAt: "2026-09-07",
      }),
    ).toThrow(/版本/);
    expect(() =>
      contentSourceSchema.parse({
        kind: "design-decision",
        provider: "manual",
        verifiedAt: "2026-09-40",
      }),
    ).toThrow();
  });

  it("records field-level game balance overrides separately from sources", () => {
    const attribution = contentAttributionSchema.parse({
      sources: [
        {
          kind: "source-fact",
          provider: "warcraft-wiki",
          gameVersion: "classic-2019-phase-6",
          url: "https://warcraft.wiki.gg/wiki/Ragefire_Chasm_(Classic)",
          verifiedAt: "2026-09-07",
        },
      ],
      balanceOverrides: [
        {
          fields: ["duration.baseSeconds", "loot.guaranteedEquipmentDrops"],
          reason: "适配放置玩法节奏并保证每个 Boss 掉落装备。",
          decidedAt: "2026-09-07",
        },
      ],
    });

    expect(attribution.sources[0].kind).toBe("source-fact");
    expect(attribution.balanceOverrides).toHaveLength(1);
    expect(() =>
      contentAttributionSchema.parse({
        ...attribution,
        balanceOverrides: [
          { ...attribution.balanceOverrides[0], fields: ["duration", "duration"] },
        ],
      }),
    ).toThrow();
  });
});
