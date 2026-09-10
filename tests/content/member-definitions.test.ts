import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classDefinitionFileSchema,
  hiddenCharacterDefinitionFileSchema,
  namePoolFileSchema,
  personalityDefinitionFileSchema,
  raceDefinitionFileSchema,
  roleDefinitionFileSchema,
  specDefinitionFileSchema,
} from "../../src/content/schemas/member-definitions";

function readJson(relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8"));
}

const roleFile = roleDefinitionFileSchema.parse(readJson("content/classes/roles.json"));
const classFile = classDefinitionFileSchema.parse(readJson("content/classes/classic.json"));
const raceFile = raceDefinitionFileSchema.parse(readJson("content/races/classic.json"));
const specFile = specDefinitionFileSchema.parse(readJson("content/specs/classic.json"));
const personalityFile = personalityDefinitionFileSchema.parse(
  readJson("content/personalities/classic.json"),
);
const nameFile = namePoolFileSchema.parse(readJson("content/names/zh-cn.json"));
const hiddenFile = hiddenCharacterDefinitionFileSchema.parse(
  readJson("content/hidden-characters/classic.json"),
);

describe("member content", () => {
  it("defines all supported role labels", () => {
    expect(Object.fromEntries(roleFile.roles.map((role) => [role.id, role.name.zhCN]))).toEqual({
      tank: "坦克",
      healer: "治疗",
      dps: "输出",
    });
  });

  it("defines all classic classes, races, and fixed specs", () => {
    expect(classFile.classes).toHaveLength(9);
    expect(raceFile.races).toHaveLength(8);
    expect(specFile.specs).toHaveLength(28);
    expect(classFile.classes.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "warrior",
        "paladin",
        "hunter",
        "rogue",
        "priest",
        "shaman",
        "mage",
        "warlock",
        "druid",
      ]),
    );
    expect(specFile.specs.every((spec) => String(spec.combatProfileId) === String(spec.id))).toBe(
      true,
    );
  });

  it("defines six personalities with visible benefits and drawbacks", () => {
    expect(personalityFile.personalities).toHaveLength(6);
    expect(
      personalityFile.personalities.every(
        (personality) =>
          personality.benefit.zhCN.length > 0 && personality.drawback.zhCN.length > 0,
      ),
    ).toBe(true);
  });

  it("provides a unique pool of standalone Chinese character names", () => {
    expect(nameFile.names).toHaveLength(377);
    expect(new Set(nameFile.names).size).toBe(nameFile.names.length);
    expect(nameFile.names.every((name) => !name.includes("·"))).toBe(true);
    expect(
      hiddenFile.hiddenCharacters.every(
        (character) => !nameFile.names.includes(character.name.zhCN),
      ),
    ).toBe(true);
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
    const raceIds = new Set(raceFile.races.map((entry) => entry.id));
    const specIds = new Set(specFile.specs.map((entry) => entry.id));
    const personalityIds = new Set(personalityFile.personalities.map((entry) => entry.id));

    expect(classIds.size).toBe(classFile.classes.length);
    expect(specIds.size).toBe(specFile.specs.length);
    expect(personalityIds.size).toBe(personalityFile.personalities.length);
    for (const classDefinition of classFile.classes) {
      expect(classDefinition.raceIds.every((raceId) => raceIds.has(raceId))).toBe(true);
    }
    for (const spec of specFile.specs) expect(classIds.has(spec.classId)).toBe(true);
    for (const hidden of hiddenFile.hiddenCharacters) {
      expect(classIds.has(hidden.classId)).toBe(true);
      expect(specIds.has(hidden.specId)).toBe(true);
      expect(personalityIds.has(hidden.personalityId)).toBe(true);
    }
  });
});
