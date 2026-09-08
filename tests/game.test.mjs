import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { GuildGame, SAVE_KEY } from "../src/game.js";

const baseDungeon = JSON.parse(
  fs.readFileSync(new URL("../data/dungeons/ragefire_chasm.json", import.meta.url), "utf8"),
);

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

function guaranteedContent() {
  const item = {
    id: "test_cloak",
    name: "测试披风",
    quality: "uncommon",
    itemLevel: 18,
    slot: "back",
    armorType: null,
    allowedClasses: [],
    allowedRoles: [],
  };
  const dungeon = structuredClone(baseDungeon);
  dungeon.probability.overpowerThreshold = 0;
  const pools = new Map();
  for (const boss of dungeon.bosses) {
    pools.set(boss.lootPool, {
      id: boss.lootPool,
      items: [{ itemId: item.id, weight: 1 }],
    });
  }
  return {
    dungeon,
    lootPools: pools,
    itemById: new Map([[item.id, item]]),
  };
}

test("新公会拥有完整五人队和三名候选人", () => {
  const game = new GuildGame(guaranteedContent(), new MemoryStorage(), 1_000_000);
  assert.equal(game.state.members.length, 5);
  assert.equal(game.state.candidates.length, 3);
  assert.deepEqual(
    game.state.members.map((member) => member.role).sort(),
    ["dps", "dps", "dps", "healer", "tank"],
  );
});

test("离线结算完整副本并生成四件待分配装备", () => {
  const start = 1_000_000;
  const game = new GuildGame(guaranteedContent(), new MemoryStorage(), start);
  const memberIds = game.state.members.map((member) => member.id);
  game.startExpedition(memberIds, 1, start);
  game.settle(start + 60 * 60 * 1000);

  const expedition = game.state.expeditions[0];
  assert.equal(expedition.status, "completed");
  assert.equal(expedition.runsCompleted, 1);
  assert.equal(game.state.pendingLoot.length, 4);
  assert.ok(game.state.members.every((member) => member.status === "idle"));
  assert.ok(game.state.guild.firstKills.length === 4);
});

test("连续副本结束前锁定战利品，结束后可以分配", () => {
  const start = 2_000_000;
  const game = new GuildGame(guaranteedContent(), new MemoryStorage(), start);
  const memberIds = game.state.members.map((member) => member.id);
  const expedition = game.startExpedition(memberIds, 2, start);
  game.forceCompleteNextStage(expedition.id, start + 1);

  const loot = game.state.pendingLoot[0];
  assert.equal(game.isLootLocked(loot), true);
  assert.throws(() => game.sellLoot(loot.id, start + 2), /尚未结束/);

  game.settle(start + 2 * 60 * 60 * 1000);
  assert.equal(game.isLootLocked(loot), false);
  const recipient = game.eligibleMembers(loot)[0];
  game.assignLoot(loot.id, recipient.id, start + 2 * 60 * 60 * 1000 + 1);
  assert.equal(game.state.pendingLoot.some((entry) => entry.id === loot.id), false);
});

test("同一成员不能同时参加两支队伍", () => {
  const start = 3_000_000;
  const game = new GuildGame(guaranteedContent(), new MemoryStorage(), start);
  const memberIds = game.state.members.map((member) => member.id);
  game.startExpedition(memberIds, 1, start);
  assert.throws(() => game.startExpedition([memberIds[0]], 1, start + 1), /其他副本/);
});

test("副本按公会等级永久解锁，解锁后可以带低级成员", () => {
  const start = 3_500_000;
  const content = guaranteedContent();
  const secondDungeon = structuredClone(baseDungeon);
  secondDungeon.id = "test_second_dungeon";
  secondDungeon.name = "测试矿井";
  secondDungeon.minimumLevel = 14;
  secondDungeon.defaultUnlocked = false;
  secondDungeon.bosses = secondDungeon.bosses.slice(0, 1);
  content.dungeons = [content.dungeon, secondDungeon];
  content.dungeonById = new Map(content.dungeons.map((dungeon) => [dungeon.id, dungeon]));

  const game = new GuildGame(content, new MemoryStorage(), start);
  const highLevelMember = game.state.members[0];
  assert.throws(
    () => game.startExpedition([highLevelMember.id], 1, start, secondDungeon.id),
    /尚未解锁/,
  );

  highLevelMember.level = 14;
  game.settle(start + 1);
  assert.equal(game.isDungeonUnlocked(secondDungeon.id), true);

  const lowLevelMember = game.state.members[1];
  assert.equal(lowLevelMember.level, 10);
  const expedition = game.startExpedition([lowLevelMember.id], 1, start + 2, secondDungeon.id);
  assert.equal(expedition.dungeonId, secondDungeon.id);
  assert.equal(expedition.dungeonName, secondDungeon.name);
  assert.equal(expedition.currentRun.stages.length, 1);
});

test("装备双手武器时会清空副手栏位", () => {
  const start = 3_750_000;
  const content = guaranteedContent();
  const game = new GuildGame(content, new MemoryStorage(), start);
  const member = game.state.members[0];
  const twoHandedItem = {
    id: "test_two_handed",
    name: "测试双手武器",
    quality: "rare",
    itemLevel: 24,
    slot: "mainHand",
    twoHanded: true,
    armorType: null,
    allowedClasses: [],
    allowedRoles: [],
  };
  game.state.pendingLoot.push({
    id: "two_handed_loot",
    itemId: twoHandedItem.id,
    item: twoHandedItem,
    sourceBossName: "测试首领",
    expeditionId: "finished_expedition",
    eligibleMemberIds: [member.id],
  });

  game.assignLoot("two_handed_loot", member.id, start + 1);
  assert.equal(member.equipment.mainHand.id, twoHandedItem.id);
  assert.equal(member.equipment.offHand, null);
});

test("旧存档中的测试装备名称和待分配物品会被迁移", () => {
  const start = 4_000_000;
  const content = guaranteedContent();
  const replacement = {
    id: 15451,
    name: "石像鬼护腿",
    quality: "uncommon",
    itemLevel: 18,
    slot: "legs",
    armorType: "mail",
    allowedClasses: ["warrior", "paladin"],
    allowedRoles: ["tank", "dps"],
  };
  content.itemById.set(String(replacement.id), replacement);

  const storage = new MemoryStorage();
  const original = new GuildGame(content, storage, start);
  const member = original.state.members[0];
  const legacyItems = [
    ["feet", "prototype_rfc_mail_feet", "测试装备·火痕重靴", "inv_boots_plate_05"],
    ["waist", "prototype_rfc_cloth_waist", "测试装备·灰烬布带", "inv_belt_04"],
    ["hands", "prototype_rfc_leather_hands", "测试装备·熔洞皮手套", "inv_gauntlets_05"],
    ["back", "prototype_rfc_back", "测试装备·焦黑披风", "inv_misc_cape_10"],
  ];
  for (const [slot, id, name] of legacyItems) {
    member.equipment[slot] = { id, name, slot, itemLevel: 16 };
  }
  original.state.pendingLoot.push({
    id: "legacy_loot",
    itemId: "prototype_rfc_mail_feet",
    item: { ...member.equipment.feet },
    eligibleMemberIds: [member.id],
  });
  storage.setItem(SAVE_KEY, JSON.stringify(original.state));

  const migrated = new GuildGame(content, storage, start + 1);
  assert.equal(migrated.state.pendingLoot.at(-1).item.name, "石像鬼护腿");
  const migratedEquipment = migrated.state.members.find((entry) => entry.id === member.id).equipment;
  assert.equal(migratedEquipment.feet.name, "火痕重靴");
  for (const [slot, , , iconName] of legacyItems) {
    assert.equal(migratedEquipment[slot].iconName, iconName);
  }
  assert.doesNotMatch(JSON.stringify(migrated.state), /测试装备/);
});

test("旧存档中的真实装备会按物品 ID 回填数据库图标", () => {
  const start = 5_000_000;
  const content = guaranteedContent();
  const knownItem = {
    id: 14148,
    name: "水晶腕轮",
    iconName: "inv_bracer_13",
    quality: "uncommon",
    itemLevel: 18,
    slot: "wrist",
    armorType: "cloth",
    allowedClasses: ["mage", "priest", "warlock"],
    allowedRoles: ["healer", "dps"],
  };
  content.itemById.set(String(knownItem.id), knownItem);

  const storage = new MemoryStorage();
  const original = new GuildGame(content, storage, start);
  const member = original.state.members[0];
  member.equipment.wrist = { ...knownItem };
  delete member.equipment.wrist.iconName;
  original.save(start);

  const migrated = new GuildGame(content, storage, start + 1);
  const migratedMember = migrated.state.members.find((entry) => entry.id === member.id);
  assert.equal(migratedMember.equipment.wrist.iconName, "inv_bracer_13");
});
