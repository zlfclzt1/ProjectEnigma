import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LOG_TEMPLATES } from "../../src/content.js";
import {
  logTemplateFileSchema,
  logTemplateGroupSchema,
} from "../../src/content/schemas/log-template";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const files = [
  "content/logs/common.json",
  "content/logs/dungeons/early-dungeons.json",
  "content/logs/dungeons/ragefire-chasm.json",
];
const groups = files.flatMap(
  (file) =>
    logTemplateFileSchema.parse(JSON.parse(fs.readFileSync(path.join(projectRoot, file), "utf8")))
      .groups,
);

function legacyKey(group: (typeof groups)[number]): string {
  if (group.scope.type === "dungeon") return group.scope.dungeonId;
  if (group.scope.type === "encounter") return group.scope.encounterId;
  return group.eventType === "expedition-start" ? "start" : "failure";
}

describe("migrated log templates", () => {
  it("preserves every V1 template under an explicit event scope", () => {
    expect(Object.fromEntries(groups.map((group) => [legacyKey(group), group.templates]))).toEqual(
      LOG_TEMPLATES,
    );
    expect(groups).toHaveLength(9);
  });

  it("rejects template variables that are not declared by the group", () => {
    expect(() =>
      logTemplateGroupSchema.parse({
        id: "invalid_template",
        eventType: "encounter-victory",
        scope: { type: "global" },
        availableParameters: ["member"],
        templates: ["{tank} 抢先开怪。"],
      }),
    ).toThrow(/未在 availableParameters 中声明/);
  });

  it("keeps group IDs unique", () => {
    const ids = groups.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
