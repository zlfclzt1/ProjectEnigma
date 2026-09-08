import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { CLASS_DEFINITIONS, NAME_PARTS, PERSONALITIES, ROLE_LABELS } from "../../src/content.js";
import {
  classDefinitionFileSchema,
  hiddenCharacterDefinitionFileSchema,
  namePartsFileSchema,
  personalityDefinitionFileSchema,
  roleDefinitionFileSchema,
  specDefinitionFileSchema,
} from "../../src/content/schemas/member-definitions";

function readJson(relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8"));
}

const roleFile = roleDefinitionFileSchema.parse(readJson("content/classes/roles.json"));
const classFile = classDefinitionFileSchema.parse(readJson("content/classes/classic.json"));
const specFile = specDefinitionFileSchema.parse(readJson("content/specs/classic.json"));
const personalityFile = personalityDefinitionFileSchema.parse(
  readJson("content/personalities/classic.json"),
);
const nameFile = namePartsFileSchema.parse(readJson("content/names/zh-cn.json"));
const hiddenFile = hiddenCharacterDefinitionFileSchema.parse(
  readJson("content/hidden-characters/classic.json"),
);

describe("migrated member content", () => {
  it("preserves all legacy role labels", () => {
    expect(Object.fromEntries(roleFile.roles.map((role) => [role.id, role.name.zhCN]))).toEqual(
      ROLE_LABELS,
    );
  });

  it("preserves all legacy classes and specs", () => {
    type ParsedSpec = (typeof specFile.specs)[number];
    const specsByClass = new Map<string, ParsedSpec[]>();
    for (const spec of specFile.specs) {
      const specs = specsByClass.get(spec.classId) ?? [];
      specs.push(spec);
      specsByClass.set(spec.classId, specs);
    }
    const migrated = classFile.classes.map((classDefinition) => ({
      id: classDefinition.id,
      name: classDefinition.name.zhCN,
      armorType: classDefinition.armorType,
      races: classDefinition.races,
      specs: (specsByClass.get(classDefinition.id) ?? []).map((spec) => ({
        id: spec.id,
        name: spec.name.zhCN,
        role: spec.role,
      })),
    }));

    expect(migrated).toEqual(CLASS_DEFINITIONS);
    expect(classFile.classes).toHaveLength(9);
    expect(specFile.specs).toHaveLength(28);
    expect(specFile.specs.every((spec) => spec.combatProfileId.startsWith("legacy_"))).toBe(true);
  });

  it("preserves legacy personalities and their display copy", () => {
    expect(
      personalityFile.personalities.map((personality) => ({
        id: personality.id,
        name: personality.name.zhCN,
        benefit: personality.benefit.zhCN,
        drawback: personality.drawback.zhCN,
      })),
    ).toEqual(PERSONALITIES);
  });

  it("preserves the current Chinese random name fragments", () => {
    expect({ first: nameFile.first, second: nameFile.second }).toEqual(NAME_PARTS);
  });

  it("moves the hidden recruit rule into an independent content definition", () => {
    expect(hiddenFile.hiddenCharacters).toEqual([
      {
        id: "fairbanks",
        name: { zhCN: "费厄泼赖" },
        classId: "warlock",
        specId: "warlock_affliction",
        personalityId: "clever",
        appearance: { chance: 0.01, uniquePerSave: true },
      },
    ]);
  });

  it("keeps member content references valid and IDs unique", () => {
    const classIds = new Set(classFile.classes.map((entry) => entry.id));
    const specIds = new Set(specFile.specs.map((entry) => entry.id));
    const personalityIds = new Set(personalityFile.personalities.map((entry) => entry.id));

    expect(classIds.size).toBe(classFile.classes.length);
    expect(specIds.size).toBe(specFile.specs.length);
    expect(personalityIds.size).toBe(personalityFile.personalities.length);
    for (const spec of specFile.specs) expect(classIds.has(spec.classId)).toBe(true);
    for (const hidden of hiddenFile.hiddenCharacters) {
      expect(classIds.has(hidden.classId)).toBe(true);
      expect(specIds.has(hidden.specId)).toBe(true);
      expect(personalityIds.has(hidden.personalityId)).toBe(true);
    }
  });
});
