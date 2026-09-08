import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SLOT_WEIGHTS, evaluateParty } from "../src/core.js";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const fixturePath = path.join(projectRoot, "tests/fixtures/v1-dungeon-baselines.json");
const dungeonIds = [
  "ragefire_chasm",
  "wailing_caverns",
  "deadmines",
  "shadowfang_keep",
];

function loadDungeon(id) {
  return JSON.parse(
    fs.readFileSync(path.join(projectRoot, `data/dungeons/${id}.json`), "utf8"),
  );
}

function equipment(itemLevel) {
  return Object.fromEntries(
    Object.keys(SLOT_WEIGHTS).map((slot) => [slot, { slot, itemLevel }]),
  );
}

function createParty(roles, level, itemLevel) {
  return roles.map((role, index) => ({
    id: `${role}-${index + 1}`,
    name: `${role}-${index + 1}`,
    classId: `${role}-${index + 1}`,
    role,
    level,
    personalityId: "neutral",
    equipment: equipment(itemLevel),
  }));
}

function rounded(value) {
  return Number(value.toFixed(12));
}

function captureScenario(dungeon, definition) {
  const party = createParty(definition.roles, definition.level, definition.itemLevel);
  const result = evaluateParty(party, dungeon);
  return {
    party: definition,
    contribution: Object.fromEntries(
      Object.entries(result.contribution).map(([key, value]) => [key, rounded(value)]),
    ),
    bosses: result.bosses.map((entry) => ({
      id: entry.boss.id,
      probability: rounded(entry.probability),
      durationSeconds: entry.durationSeconds,
    })),
    clearProbability: rounded(result.clearProbability),
    durationSeconds: result.durationSeconds,
  };
}

export function buildV1DungeonBaselines() {
  return {
    schemaVersion: 1,
    formula: "v1-item-level",
    dungeons: dungeonIds.map((id) => {
      const dungeon = loadDungeon(id);
      const standardRoles = ["tank", "healer", "dps", "dps", "dps"];
      return {
        id: dungeon.id,
        name: dungeon.name,
        recommendedLevel: dungeon.recommendedLevel,
        baseSeconds: dungeon.duration.baseSeconds,
        scenarios: {
          recommendedStandard: captureScenario(dungeon, {
            roles: standardRoles,
            level: dungeon.recommendedLevel,
            itemLevel: dungeon.recommendedLevel,
          }),
          maxLevelStandard: captureScenario(dungeon, {
            roles: standardRoles,
            level: 45,
            itemLevel: 45,
          }),
          recommendedNoTank: captureScenario(dungeon, {
            roles: ["healer", "dps", "dps", "dps", "dps"],
            level: dungeon.recommendedLevel,
            itemLevel: dungeon.recommendedLevel,
          }),
        },
      };
    }),
  };
}

function serializedBaselines() {
  return `${JSON.stringify(buildV1DungeonBaselines(), null, 2)}\n`;
}

function runCli() {
  const mode = process.argv[2] ?? "--check";
  if (mode === "--write") {
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, serializedBaselines());
    console.log(`已更新 ${path.relative(projectRoot, fixturePath)}`);
    return;
  }
  if (mode === "--check") {
    assert.equal(
      fs.readFileSync(fixturePath, "utf8"),
      serializedBaselines(),
      "V1 副本平衡基线已变化。如属预期，请显式运行 npm run baseline:write。",
    );
    console.log("V1 四副本平衡基线一致。注意：检查模式不会修改 fixture。");
    return;
  }
  throw new Error(`未知参数：${mode}。仅支持 --check 或 --write。`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runCli();
}
