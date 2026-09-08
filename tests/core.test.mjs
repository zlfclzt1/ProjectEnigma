import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  SLOT_WEIGHTS,
  averageItemLevel,
  evaluateParty,
  filterMembers,
  formatPercent,
  seededUnit,
} from "../src/core.js";

const dungeon = JSON.parse(
  fs.readFileSync(new URL("../data/dungeons/ragefire_chasm.json", import.meta.url), "utf8"),
);
const additionalDungeons = ["wailing_caverns", "deadmines", "shadowfang_keep"].map((id) =>
  JSON.parse(fs.readFileSync(new URL(`../data/dungeons/${id}.json`, import.meta.url), "utf8")),
);

function equipment(itemLevel) {
  return Object.fromEntries(
    Object.keys(SLOT_WEIGHTS).map((slot) => [slot, { slot, itemLevel }]),
  );
}

function member(id, role, level = 10, itemLevel = 10) {
  return {
    id,
    name: id,
    classId: id,
    role,
    level,
    personalityId: "neutral",
    equipment: equipment(itemLevel),
  };
}

test("全套同等级装备的综合装等保持不变", () => {
  assert.ok(Math.abs(averageItemLevel(equipment(17)) - 17) < 1e-9);
});

test("随机结果由种子稳定决定", () => {
  assert.equal(seededUnit("same-seed"), seededUnit("same-seed"));
  assert.notEqual(seededUnit("same-seed"), seededUnit("other-seed"));
});

test("标准十级五人队达到目标全通率和时长", () => {
  const party = [
    member("tank", "tank"),
    member("healer", "healer"),
    member("dps1", "dps"),
    member("dps2", "dps"),
    member("dps3", "dps"),
  ];
  const result = evaluateParty(party, dungeon);
  assert.ok(result.clearProbability >= 0.75 && result.clearProbability <= 0.85);
  assert.ok(result.durationSeconds >= 590 && result.durationSeconds <= 610);
});

test("四十五级标准队形成百分百碾压并压缩到五分钟", () => {
  const party = [
    member("tank", "tank", 45, 45),
    member("healer", "healer", 45, 45),
    member("dps1", "dps", 45, 45),
    member("dps2", "dps", 45, 45),
    member("dps3", "dps", 45, 45),
  ];
  const result = evaluateParty(party, dungeon);
  assert.equal(result.clearProbability, 1);
  assert.equal(result.durationSeconds, 300);
});

test("新增副本的推荐等级标准队保持目标全通率和基础耗时", () => {
  for (const entry of additionalDungeons) {
    const party = [
      member("tank", "tank", entry.recommendedLevel, entry.recommendedLevel),
      member("healer", "healer", entry.recommendedLevel, entry.recommendedLevel),
      member("dps1", "dps", entry.recommendedLevel, entry.recommendedLevel),
      member("dps2", "dps", entry.recommendedLevel, entry.recommendedLevel),
      member("dps3", "dps", entry.recommendedLevel, entry.recommendedLevel),
    ];
    const result = evaluateParty(party, entry);
    assert.ok(result.clearProbability >= 0.75 && result.clearProbability <= 0.9, entry.name);
    assert.ok(
      result.durationSeconds >= entry.duration.baseSeconds * 0.9 &&
        result.durationSeconds <= entry.duration.baseSeconds * 1.1,
      entry.name,
    );
  }
});

test("极低概率仍显示精确数值", () => {
  assert.equal(formatPercent(0.00000625), "0.0006%");
});

test("成员可以同时按职业和定位筛选", () => {
  const members = [
    { id: "a", classId: "warrior", role: "tank" },
    { id: "b", classId: "warrior", role: "dps" },
    { id: "c", classId: "priest", role: "healer" },
  ];
  assert.deepEqual(
    filterMembers(members, { classId: "warrior", role: "tank" }).map((entry) => entry.id),
    ["a"],
  );
  assert.deepEqual(
    filterMembers(members, { classId: "all", role: "healer" }).map((entry) => entry.id),
    ["c"],
  );
});
