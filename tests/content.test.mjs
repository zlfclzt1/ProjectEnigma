import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { loadContent } from "../src/content.js";

const fixturePaths = [
  "data/dungeons/ragefire_chasm.json",
  "data/dungeons/wailing_caverns.json",
  "data/dungeons/deadmines.json",
  "data/dungeons/shadowfang_keep.json",
  "data/loot/ragefire_chasm.json",
  "data/loot/wailing_caverns.json",
  "data/loot/deadmines.json",
  "data/loot/shadowfang_keep.json",
];
const fixtures = new Map(
  fixturePaths.map((path) => [
    `./${path}`,
    JSON.parse(fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8")),
  ]),
);

test("所有副本掉落都配置了数据库装备图标", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const fixture = fixtures.get(String(url));
    assert.ok(fixture, `缺少内容测试数据：${url}`);
    return { json: async () => structuredClone(fixture) };
  };

  try {
    const content = await loadContent();
    assert.deepEqual(
      content.dungeons.map((dungeon) => dungeon.id),
      ["ragefire_chasm", "wailing_caverns", "deadmines", "shadowfang_keep"],
    );
    for (const dungeon of content.dungeons) {
      assert.equal(
        dungeon.bosses.reduce((sum, boss) => sum + boss.stageSeconds, 0),
        dungeon.duration.baseSeconds,
        `${dungeon.name}的路线分段时间与基础时间不一致`,
      );
      for (const boss of dungeon.bosses) {
        assert.ok(content.lootPools.has(boss.lootPool), `${boss.name}缺少掉落池`);
      }
    }
    for (const pool of content.lootPools.values()) {
      for (const entry of pool.items) {
        const item = content.itemById.get(String(entry.itemId));
        assert.ok(item, `掉落池 ${pool.id} 缺少物品 ${entry.itemId}`);
        assert.ok(item.iconName, `物品 ${entry.itemId} 缺少数据库图标`);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
