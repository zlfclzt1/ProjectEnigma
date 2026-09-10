import type { ContentRegistry } from "../src/content/registry";
import type { LootTable } from "../src/content/schemas/dungeon";

export type LootSourceCategory = "boss-drop" | "quest-reward" | "world-drop" | "design-placeholder";
export type EncounterLootCategory = LootSourceCategory | "no-equipment";

export interface LootSourceAuditRow {
  readonly dungeonId: string;
  readonly dungeonName: string;
  readonly encounterId: string;
  readonly encounterName: string;
  readonly lootTableId?: string;
  readonly category: EncounterLootCategory;
  readonly explicitSourceType: boolean;
  readonly guaranteedEquipmentDrops: number;
  readonly items: readonly { readonly id: string; readonly name: string }[];
}

export interface LootSourceAudit {
  readonly rows: readonly LootSourceAuditRow[];
  readonly lootTableCounts: Readonly<Record<LootSourceCategory, number>>;
  readonly encounterCounts: Readonly<Record<EncounterLootCategory, number>>;
  readonly distinctItemCounts: Readonly<Record<LootSourceCategory, number>>;
  readonly unusedLootTableIds: readonly string[];
}

const SOURCE_TYPE_CATEGORIES: Readonly<Record<string, LootSourceCategory>> = {
  boss_drop: "boss-drop",
  dungeon_quest_rewards: "quest-reward",
  world_drop: "world-drop",
  design_placeholder: "design-placeholder",
};

const CATEGORY_LABELS: Readonly<Record<LootSourceCategory, string>> = {
  "boss-drop": "Boss 专属掉落",
  "quest-reward": "任务奖励",
  "world-drop": "世界掉落",
  "design-placeholder": "设计占位",
};

const ENCOUNTER_CATEGORY_LABELS: Readonly<Record<EncounterLootCategory, string>> = {
  ...CATEGORY_LABELS,
  "no-equipment": "无装备掉落",
};

const CATEGORIES: readonly LootSourceCategory[] = [
  "boss-drop",
  "quest-reward",
  "world-drop",
  "design-placeholder",
];

export function classifyLootSource(table: LootTable): LootSourceCategory {
  if (!table.sourceType) return "boss-drop";
  return SOURCE_TYPE_CATEGORIES[String(table.sourceType)] ?? "design-placeholder";
}

function emptyCounts(): Record<LootSourceCategory, number> {
  return {
    "boss-drop": 0,
    "quest-reward": 0,
    "world-drop": 0,
    "design-placeholder": 0,
  };
}

function emptyEncounterCounts(): Record<EncounterLootCategory, number> {
  return { ...emptyCounts(), "no-equipment": 0 };
}

export function auditLootSources(registry: ContentRegistry): LootSourceAudit {
  const rows: LootSourceAuditRow[] = [];
  const referencedLootTableIds = new Set<string>();

  for (const dungeon of registry.dungeons) {
    for (const encounterId of dungeon.route) {
      const encounter = registry.encounterById.get(encounterId);
      if (!encounter) throw new Error(`副本 ${dungeon.id} 路线缺少首领 ${encounterId}`);
      if (!encounter.lootTableId) {
        rows.push({
          dungeonId: dungeon.id,
          dungeonName: dungeon.name.zhCN,
          encounterId: encounter.id,
          encounterName: encounter.name.zhCN,
          category: "no-equipment",
          explicitSourceType: true,
          guaranteedEquipmentDrops: 0,
          items: [],
        });
        continue;
      }
      const lootTable = registry.lootTableById.get(encounter.lootTableId);
      if (!lootTable) throw new Error(`首领 ${encounter.id} 缺少掉落表 ${encounter.lootTableId}`);
      referencedLootTableIds.add(lootTable.id);
      rows.push({
        dungeonId: dungeon.id,
        dungeonName: dungeon.name.zhCN,
        encounterId: encounter.id,
        encounterName: encounter.name.zhCN,
        lootTableId: lootTable.id,
        category: classifyLootSource(lootTable),
        explicitSourceType: lootTable.sourceType !== undefined,
        guaranteedEquipmentDrops: lootTable.guaranteedEquipmentDrops,
        items: lootTable.items.map(({ itemId }) => {
          const item = registry.itemById.get(itemId);
          if (!item) throw new Error(`掉落表 ${lootTable.id} 缺少物品 ${itemId}`);
          return { id: item.id, name: item.name.zhCN };
        }),
      });
    }
  }

  const lootTableCounts = emptyCounts();
  const encounterCounts = emptyEncounterCounts();
  const distinctItems = new Map<LootSourceCategory, Set<string>>(
    CATEGORIES.map((category) => [category, new Set<string>()]),
  );
  for (const table of registry.lootTables) lootTableCounts[classifyLootSource(table)] += 1;
  for (const row of rows) {
    encounterCounts[row.category] += 1;
    if (row.category === "no-equipment") continue;
    for (const item of row.items) distinctItems.get(row.category)!.add(item.id);
  }

  return {
    rows,
    lootTableCounts,
    encounterCounts,
    distinctItemCounts: Object.fromEntries(
      CATEGORIES.map((category) => [category, distinctItems.get(category)!.size]),
    ) as Record<LootSourceCategory, number>,
    unusedLootTableIds: registry.lootTables
      .filter((table) => !referencedLootTableIds.has(table.id))
      .map((table) => table.id)
      .sort(),
  };
}

function categorySummary(
  label: string,
  counts: Readonly<Record<LootSourceCategory, number>>,
): string {
  return `- ${label}：${CATEGORIES.map((category) => `${CATEGORY_LABELS[category]} ${counts[category]}`).join("，")}。`;
}

function encounterCategorySummary(counts: Readonly<Record<EncounterLootCategory, number>>): string {
  return `- Encounter 引用分类：${Object.entries(ENCOUNTER_CATEGORY_LABELS)
    .map(([category, label]) => `${label} ${counts[category as EncounterLootCategory]}`)
    .join("，")}。`;
}

function itemList(row: LootSourceAuditRow): string {
  return row.items.map((item) => `${item.id} ${item.name}`).join("、");
}

export function renderLootSourceAudit(audit: LootSourceAudit): string {
  const migrationRows = audit.rows.filter(
    (row) => row.category !== "boss-drop" && row.category !== "no-equipment",
  );
  const migrationItems = new Map<string, string>();
  for (const row of migrationRows) {
    for (const item of row.items) migrationItems.set(item.id, item.name);
  }
  const implicitBossTables = new Set(
    audit.rows
      .filter((row) => row.category === "boss-drop" && !row.explicitSourceType)
      .map((row) => row.lootTableId!),
  );
  const rowsByDungeon = new Map<string, LootSourceAuditRow[]>();
  for (const row of audit.rows) {
    const dungeonRows = rowsByDungeon.get(row.dungeonId) ?? [];
    dungeonRows.push(row);
    rowsByDungeon.set(row.dungeonId, dungeonRows);
  }

  const lines = [
    "# 当前四副本掉落来源审计",
    "",
    "生成日期：2026-09-08",
    "",
    "本报告只描述当前内容元数据和引用关系，不修改掉落、概率或装备属性。分类规则以掉落表 `sourceType` 为准；未填写时按现有兼容规则视为 Boss 专属掉落。",
    "",
    "## 汇总",
    "",
    `- 路线 Encounter：${audit.rows.length}。`,
    `- 掉落表：${Object.values(audit.lootTableCounts).reduce((sum, count) => sum + count, 0)}。`,
    categorySummary("掉落表分类", audit.lootTableCounts),
    encounterCategorySummary(audit.encounterCounts),
    categorySummary("不同装备分类", audit.distinctItemCounts),
    `- 未显式填写 \`sourceType\` 的 Boss 掉落表：${implicitBossTables.size}。`,
    `- 未被路线 Encounter 引用的掉落表：${audit.unusedLootTableIds.length === 0 ? "0" : audit.unusedLootTableIds.join("、")}。`,
    "",
    "## 后续迁移候选",
    "",
    ...(migrationRows.length === 0
      ? ["当前没有非 Boss 来源被 Encounter 当作 Boss 掉落引用。"]
      : [
          "以下 Encounter 当前引用了非 Boss 来源装备。任务系统完成后，应移除这些掉落引用，并将装备迁回成员任务奖励：",
          "",
          ...migrationRows.map(
            (row) =>
              `- ${row.dungeonName} · ${row.encounterName}（${row.encounterId}）引用 ${CATEGORY_LABELS[row.category as LootSourceCategory]}表 \`${row.lootTableId}\`。`,
          ),
          "",
          `待迁移装备：${[...migrationItems.entries()].map(([id, name]) => `${id} ${name}`).join("、")}。`,
        ]),
    "",
    "## 逐副本明细",
    "",
  ];

  for (const [dungeonId, dungeonRows] of rowsByDungeon) {
    lines.push(
      `### ${dungeonRows[0]!.dungeonName}（${dungeonId}）`,
      "",
      "| Encounter | 掉落表 | 分类 | 保证数量 | 装备 |",
      "|---|---|---|---:|---|",
      ...dungeonRows.map(
        (row) =>
          `| ${row.encounterName}（${row.encounterId}） | ${row.lootTableId ?? "—"} | ${ENCOUNTER_CATEGORY_LABELS[row.category]}${row.category !== "no-equipment" && !row.explicitSourceType ? "（隐式）" : ""} | ${row.guaranteedEquipmentDrops} | ${itemList(row) || "—"} |`,
      ),
      "",
    );
  }

  lines.push(
    "## 审计结论",
    "",
    "- 当前没有任务奖励或世界掉落被路线 Encounter 当作 Boss 掉落引用。",
    "- 未标记 `sourceType` 的表暂按 Boss 专属掉落处理；后续完整度审计应要求新内容显式填写来源类型。",
    "- 本报告不能替代外部资料核对。任务 7.8 迁移前仍需按经典内容来源政策确认每件装备的真实来源。",
    "",
  );
  return lines.join("\n");
}
