import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildV1DungeonBaselines } from "../scripts/capture-v1-baselines.mjs";

const fixture = JSON.parse(
  fs.readFileSync(new URL("./fixtures/v1-dungeon-baselines.json", import.meta.url), "utf8"),
);

test("四副本 V1 平衡结果与冻结基线一致", () => {
  assert.deepEqual(buildV1DungeonBaselines(), fixture);
});

test("冻结基线覆盖标准队、满级队和无坦阵容", () => {
  assert.equal(fixture.dungeons.length, 4);
  for (const dungeon of fixture.dungeons) {
    assert.deepEqual(Object.keys(dungeon.scenarios), [
      "recommendedStandard",
      "maxLevelStandard",
      "recommendedNoTank",
    ]);
    for (const scenario of Object.values(dungeon.scenarios)) {
      assert.equal(scenario.bosses.length > 0, true, dungeon.name);
      assert.equal(Number.isFinite(scenario.clearProbability), true, dungeon.name);
      assert.equal(Number.isInteger(scenario.durationSeconds), true, dungeon.name);
    }
  }
});
