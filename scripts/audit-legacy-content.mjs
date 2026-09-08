import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLASS_DEFINITIONS,
  LOG_TEMPLATES,
  PERSONALITIES,
  loadContent,
} from "../src/content.js";
import { SLOT_LABELS } from "../src/core.js";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputPath = path.join(projectRoot, "docs/generated/legacy-content-inventory.md");

function loadJsonDirectory(relativeDirectory) {
  const directory = path.join(projectRoot, relativeDirectory);
  return new Map(
    fs
      .readdirSync(directory)
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map((name) => {
        const relativePath = `./${relativeDirectory}/${name}`;
        return [relativePath, JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"))];
      }),
  );
}

async function loadLegacyContent() {
  const fixtures = new Map([
    ...loadJsonDirectory("data/dungeons"),
    ...loadJsonDirectory("data/loot"),
  ]);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const value = fixtures.get(String(url));
    if (!value) throw new Error(`旧内容加载器请求了未登记文件：${url}`);
    return { json: async () => structuredClone(value) };
  };
  try {
    return await loadContent();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function duplicateValues(entries) {
  const counts = new Map();
  for (const entry of entries) counts.set(String(entry), (counts.get(String(entry)) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function escapeCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function table(headers, rows) {
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `|${headers.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n");
}

export async function buildLegacyContentAudit() {
  const content = await loadLegacyContent();
  const issues = [];
  const specs = CLASS_DEFINITIONS.flatMap((classDefinition) =>
    classDefinition.specs.map((spec) => ({ ...spec, classId: classDefinition.id })),
  );
  const bosses = content.dungeons.flatMap((dungeon) =>
    dungeon.bosses.map((boss) => ({ ...boss, dungeonId: dungeon.id })),
  );
  const lootPools = [...content.lootPools.values()];

  const idGroups = [
    ["职业", CLASS_DEFINITIONS.map((entry) => entry.id)],
    ["专精", specs.map((entry) => entry.id)],
    ["性格", PERSONALITIES.map((entry) => entry.id)],
    ["副本", content.dungeons.map((entry) => entry.id)],
    ["Boss", bosses.map((entry) => entry.id)],
    ["掉落池", lootPools.map((entry) => entry.id)],
    ["物品", content.items.map((entry) => entry.id)],
  ];
  for (const [label, ids] of idGroups) {
    for (const duplicate of duplicateValues(ids)) issues.push(`${label} ID 重复：${duplicate}`);
  }

  for (const dungeon of content.dungeons) {
    const stageSeconds = dungeon.bosses.reduce((sum, boss) => sum + boss.stageSeconds, 0);
    if (stageSeconds !== dungeon.duration.baseSeconds) {
      issues.push(
        `${dungeon.name}阶段时间 ${stageSeconds} 与基础时间 ${dungeon.duration.baseSeconds} 不一致`,
      );
    }
    for (const boss of dungeon.bosses) {
      if (!content.lootPools.has(boss.lootPool)) {
        issues.push(`${dungeon.name}/${boss.name} 引用了缺失掉落池 ${boss.lootPool}`);
      }
    }
  }

  const itemPoolIds = new Map();
  for (const pool of lootPools) {
    if (!pool.items?.length) issues.push(`掉落池 ${pool.id} 没有物品`);
    for (const entry of pool.items ?? []) {
      const itemId = String(entry.itemId);
      if (!content.itemById.has(itemId)) issues.push(`掉落池 ${pool.id} 引用了缺失物品 ${itemId}`);
      if (!(entry.weight > 0)) issues.push(`掉落池 ${pool.id} 的物品 ${itemId} 权重无效`);
      const pools = itemPoolIds.get(itemId) ?? [];
      pools.push(pool.id);
      itemPoolIds.set(itemId, pools);
    }
  }
  for (const item of content.items) {
    if (!item.iconName) issues.push(`物品 ${item.id} ${item.name} 缺少图标`);
    if (!SLOT_LABELS[item.slot]) issues.push(`物品 ${item.id} ${item.name} 使用未知栏位 ${item.slot}`);
  }

  const hiddenCharacters = [
    {
      name: "费厄泼赖",
      classId: "warlock",
      specId: "warlock_affliction",
      personalityId: "clever",
      appearance: "每次随机生成候选人时 1%，同一存档唯一",
      implementation: "src/game.js:createMember",
    },
  ];

  const lines = [
    "# V1 旧内容资产清单",
    "",
    "> 本文件由 `scripts/audit-legacy-content.mjs` 生成，请勿手工修改。",
    "",
    "## 汇总",
    "",
    table(
      ["内容", "数量"],
      [
        ["职业", CLASS_DEFINITIONS.length],
        ["专精", specs.length],
        ["性格", PERSONALITIES.length],
        ["隐藏角色", hiddenCharacters.length],
        ["装备栏位", Object.keys(SLOT_LABELS).length],
        ["物品定义", content.items.length],
        ["副本", content.dungeons.length],
        ["Boss 路线节点", bosses.length],
        ["掉落池", lootPools.length],
        ["日志模板键", Object.keys(LOG_TEMPLATES).length],
      ],
    ),
    "",
    "## 职业与专精",
    "",
    table(
      ["职业 ID", "职业", "护甲", "专精"],
      CLASS_DEFINITIONS.map((entry) => [
        entry.id,
        entry.name,
        entry.armorType,
        entry.specs.map((spec) => `${spec.id}（${spec.name}/${spec.role}）`).join("、"),
      ]),
    ),
    "",
    "## 性格",
    "",
    table(
      ["ID", "名称", "优点", "缺点"],
      PERSONALITIES.map((entry) => [entry.id, entry.name, entry.benefit, entry.drawback]),
    ),
    "",
    "## 隐藏角色",
    "",
    table(
      ["名称", "职业", "专精", "性格", "出现规则", "当前实现"],
      hiddenCharacters.map((entry) => [
        entry.name,
        entry.classId,
        entry.specId,
        entry.personalityId,
        entry.appearance,
        entry.implementation,
      ]),
    ),
    "",
    "## 初始装备",
    "",
    "当前初始装备由 `src/game.js:createStarterItem` 在运行时生成，每名成员拥有完整装备栏，物品等级固定为 10，护甲栏位使用成员护甲类型。V2 迁移时需要将这些动态定义改为稳定内容 ID。",
    "",
    table(
      ["栏位 ID", "显示名称"],
      Object.entries(SLOT_LABELS).map(([id, label]) => [id, label]),
    ),
    "",
    "## 副本与 Boss",
    "",
  ];

  for (const dungeon of content.dungeons) {
    lines.push(
      `### ${dungeon.name}（${dungeon.id}）`,
      "",
      `推荐等级：${dungeon.recommendedLevel}；基础时间：${dungeon.duration.baseSeconds} 秒；Boss：${dungeon.bosses.length}。`,
      "",
      table(
        ["顺序", "Boss ID", "名称", "阶段秒数", "掉落池"],
        dungeon.bosses.map((boss, index) => [
          index + 1,
          boss.id,
          boss.name,
          boss.stageSeconds,
          boss.lootPool,
        ]),
      ),
      "",
    );
  }

  lines.push("## 掉落池", "");
  lines.push(
    table(
      ["掉落池 ID", "保证装备数", "物品 ID（权重）"],
      lootPools.map((pool) => [
        pool.id,
        pool.guaranteedEquipmentDrops ?? 1,
        (pool.items ?? []).map((entry) => `${entry.itemId}（${entry.weight}）`).join("、"),
      ]),
    ),
    "",
    "## 物品定义",
    "",
    table(
      ["ID", "中文名", "物品等级", "品质", "栏位", "图标", "被掉落池引用"],
      content.items.map((item) => [
        item.id,
        item.name,
        item.itemLevel,
        item.quality,
        item.slot,
        item.iconName,
        itemPoolIds.get(String(item.id))?.join("、") ?? "未引用",
      ]),
    ),
    "",
    "## 日志模板",
    "",
    table(
      ["模板键", "条数"],
      Object.entries(LOG_TEMPLATES).map(([key, templates]) => [key, templates.length]),
    ),
    "",
    "## 校验结果",
    "",
  );
  if (issues.length) {
    lines.push(...issues.map((issue) => `- ${issue}`));
  } else {
    lines.push("- 未发现重复 ID、缺失掉落引用、缺失图标或阶段时间错误。");
  }
  lines.push("");

  return { markdown: lines.join("\n"), issues };
}

async function runCli() {
  const mode = process.argv[2] ?? "--check";
  const { markdown, issues } = await buildLegacyContentAudit();
  assert.deepEqual(issues, [], `旧内容审计发现问题：\n${issues.join("\n")}`);
  if (mode === "--write") {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown);
    console.log(`已更新 ${path.relative(projectRoot, outputPath)}`);
    return;
  }
  if (mode === "--check") {
    assert.equal(
      fs.readFileSync(outputPath, "utf8"),
      markdown,
      "旧内容资产清单已过期，请显式运行 npm run content:audit:write。",
    );
    console.log("V1 旧内容资产清单一致。注意：检查模式不会修改文档。");
    return;
  }
  throw new Error(`未知参数：${mode}。仅支持 --check 或 --write。`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await runCli();
}
