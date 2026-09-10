import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadContentModules } from "../../src/content/loader";
import { browserContentModules } from "../../src/content/manifest";
import {
  itemSuffixDefinitionFileSchema,
  itemSuffixDefinitionSchema,
} from "../../src/content/schemas/item-suffix";
import type { RandomSuffixId } from "../../src/domain/shared/ids";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const prototype = itemSuffixDefinitionFileSchema.parse(
  JSON.parse(
    fs.readFileSync(path.join(projectRoot, "content/item-suffixes/prototype.json"), "utf8"),
  ),
);

describe("random item suffix definitions", () => {
  it("loads the minimal prototype with a branded ID, localized template, tiers, and source", () => {
    expect(prototype.itemSuffixes).toHaveLength(1);
    const suffix = prototype.itemSuffixes[0]!;
    const suffixId: RandomSuffixId = suffix.id;

    expect(suffixId).toBe("prototype_of_readiness");
    expect(suffix.nameTemplate).toEqual({
      zhCN: "整备之{base}",
      enUS: "{base} of Readiness",
    });
    expect(suffix.tiers).toEqual([
      {
        minimumItemLevel: 1,
        maximumItemLevel: 20,
        stats: { primary: { staminaPoints: 1 } },
      },
      {
        minimumItemLevel: 21,
        maximumItemLevel: 45,
        stats: { primary: { staminaPoints: 2 } },
      },
    ]);
    expect(suffix.relativeWeight).toBe(1);
    expect(suffix.source).toMatchObject({
      kind: "design-decision",
      provider: "manual",
      verifiedAt: "2026-09-08",
    });
  });

  it("discovers prototype and formal dungeon suffix files through the content loader", () => {
    const loaded = loadContentModules(browserContentModules);
    expect(loaded.itemSuffixes.map((entry) => entry.value.id)).toHaveLength(91);
    expect(loaded.itemSuffixes.map((entry) => entry.value.id)).toEqual(
      expect.arrayContaining([
        "prototype_of_readiness",
        "uldaman_9389_monkey",
        "uldaman_11118_regeneration",
      ]),
    );
  });

  it("rejects invalid templates, weights, empty stats, and overlapping tiers", () => {
    const valid = prototype.itemSuffixes[0]!;
    expect(() =>
      itemSuffixDefinitionSchema.parse({
        ...valid,
        nameTemplate: { zhCN: "没有基础装备占位符" },
      }),
    ).toThrow(/\{base\}/);
    expect(() => itemSuffixDefinitionSchema.parse({ ...valid, relativeWeight: 0 })).toThrow();
    expect(() =>
      itemSuffixDefinitionSchema.parse({
        ...valid,
        tiers: [{ minimumItemLevel: 1, maximumItemLevel: 20, stats: {} }],
      }),
    ).toThrow(/正数属性增量/);
    expect(() =>
      itemSuffixDefinitionSchema.parse({
        ...valid,
        tiers: [valid.tiers[0], { ...valid.tiers[1], minimumItemLevel: 20 }],
      }),
    ).toThrow(/不能重叠/);
  });
});
