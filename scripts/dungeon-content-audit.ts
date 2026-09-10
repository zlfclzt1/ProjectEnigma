import type { ContentRegistry } from "../src/content/registry";

export interface DungeonContentRouteRow {
  readonly dungeonId: string;
  readonly dungeonName: string;
  readonly nodeId: string;
  readonly nodeType: "required" | "optional" | "rare";
  readonly spawnProbability?: number;
  readonly encounterId: string;
  readonly encounterName: string;
  readonly lootTableId?: string;
  readonly sourceType?: string;
  readonly guaranteedEquipmentDrops: number;
  readonly items: readonly {
    readonly id: string;
    readonly name: string;
    readonly hasRandomSuffixPool: boolean;
    readonly statsSource: string;
  }[];
}

export interface DungeonContentAudit {
  readonly routes: readonly DungeonContentRouteRow[];
  readonly questIds: readonly string[];
  readonly itemSetIds: readonly string[];
  readonly unusedLootTableIds: readonly string[];
  readonly unreferencedItemIds: readonly string[];
  readonly unreferencedQuestIds: readonly string[];
  readonly unreferencedItemSetIds: readonly string[];
  readonly questRewardBossOverlap: readonly string[];
}

export function auditDungeonContent(registry: ContentRegistry): DungeonContentAudit {
  const routes: DungeonContentRouteRow[] = [];
  const referencedLootTableIds = new Set<string>();
  const referencedItemIds = new Set<string>();

  for (const dungeon of registry.dungeons) {
    for (const node of dungeon.route) {
      const encounter = registry.encounterById.get(node.encounterId);
      if (!encounter) throw new Error(`副本 ${dungeon.id} 缺少首领 ${node.encounterId}`);
      const lootTable = encounter.lootTableId
        ? registry.lootTableById.get(encounter.lootTableId)
        : undefined;
      if (encounter.lootTableId && !lootTable) {
        throw new Error(`首领 ${encounter.id} 缺少掉落表 ${encounter.lootTableId}`);
      }
      if (lootTable) referencedLootTableIds.add(lootTable.id);
      const items = lootTable
        ? lootTable.items.map(({ itemId }) => {
            const item = registry.itemById.get(itemId);
            if (!item) throw new Error(`掉落表 ${lootTable.id} 缺少物品 ${itemId}`);
            referencedItemIds.add(item.id);
            return {
              id: item.id,
              name: item.name.zhCN,
              hasRandomSuffixPool: (item.randomSuffixIds?.length ?? 0) > 0,
              statsSource: `${item.statsSource.provider}/${item.statsSource.kind}`,
            };
          })
        : [];
      routes.push({
        dungeonId: dungeon.id,
        dungeonName: dungeon.name.zhCN,
        nodeId: node.id,
        nodeType: node.type,
        spawnProbability: node.type === "rare" ? node.spawnProbability : undefined,
        encounterId: encounter.id,
        encounterName: encounter.name.zhCN,
        lootTableId: lootTable?.id,
        sourceType: lootTable?.sourceType ? String(lootTable.sourceType) : undefined,
        guaranteedEquipmentDrops: lootTable?.guaranteedEquipmentDrops ?? 0,
        items,
      });
    }
  }

  const questIds = registry.quests.map((quest) => {
    quest.rewards.fixedItemIds.forEach((itemId) => referencedItemIds.add(itemId));
    quest.rewards.itemChoiceIds.forEach((itemId) => referencedItemIds.add(itemId));
    return String(quest.id);
  });
  const itemSetIds = registry.itemSets.map((itemSet) => {
    itemSet.itemIds.forEach((itemId) => referencedItemIds.add(itemId));
    return String(itemSet.id);
  });
  const questRewardIds = new Set(
    registry.quests.flatMap((quest) =>
      [...quest.rewards.fixedItemIds, ...quest.rewards.itemChoiceIds].map(String),
    ),
  );
  const bossDropIds = new Set(
    registry.lootTables
      .filter((table) => String(table.sourceType ?? "boss_drop") === "boss_drop")
      .flatMap((table) => table.items.map(({ itemId }) => String(itemId))),
  );

  return {
    routes,
    questIds,
    itemSetIds,
    unusedLootTableIds: registry.lootTables
      .filter((table) => !referencedLootTableIds.has(String(table.id)))
      .map((table) => String(table.id))
      .sort(),
    unreferencedItemIds: registry.items
      .filter((item) => !item.isStarter && !referencedItemIds.has(String(item.id)))
      .map((item) => String(item.id))
      .sort(),
    unreferencedQuestIds: registry.quests
      .filter((quest) => !registry.dungeonById.has(quest.dungeonId))
      .map((quest) => String(quest.id))
      .sort(),
    unreferencedItemSetIds: registry.itemSets
      .filter(
        (itemSet) =>
          !registry.collectionRewards.some(
            (reward) =>
              reward.condition.type === "item-set-completion" &&
              reward.condition.itemSetId === itemSet.id,
          ),
      )
      .map((itemSet) => String(itemSet.id))
      .sort(),
    questRewardBossOverlap: [...questRewardIds].filter((itemId) => bossDropIds.has(itemId)).sort(),
  };
}

export function renderDungeonContentAudit(audit: DungeonContentAudit): string {
  const lines = [
    "# 副本内容完整度审计",
    "",
    "生成日期：2026-09-10",
    "",
    "本报告检查路线节点、Encounter、掉落来源、任务奖励、随机词缀和套装引用，不替代外部资料核对或数值平衡模拟。",
    "",
    "## 路线与掉落",
    "",
    "| 副本 | 节点 | 类型 | Encounter | 掉落来源 | 保证数量 | 装备 |",
    "|---|---|---|---|---|---:|---|",
    ...audit.routes.map((row) => {
      const nodeType = row.nodeType === "rare" ? `rare（${row.spawnProbability}）` : row.nodeType;
      const source = row.lootTableId
        ? `${row.sourceType ?? "implicit"}:${row.lootTableId}`
        : "无装备掉落";
      const items =
        row.items
          .map((item) => `${item.id} ${item.name}${item.hasRandomSuffixPool ? "〔词缀〕" : ""}`)
          .join("、") || "—";
      return `| ${row.dungeonName}（${row.dungeonId}） | ${row.nodeId} | ${nodeType} | ${row.encounterName}（${row.encounterId}） | ${source} | ${row.guaranteedEquipmentDrops} | ${items} |`;
    }),
    "",
    "## 引用完整度",
    "",
    `- 副本路线节点：${audit.routes.length}。`,
    `- 副本任务：${audit.questIds.length}。`,
    `- 套装：${audit.itemSetIds.length}。`,
    `- 未被路线引用的掉落表：${audit.unusedLootTableIds.length === 0 ? "0" : audit.unusedLootTableIds.join("、")}。`,
    `- 未被掉落、任务或套装引用的非初始装备：${audit.unreferencedItemIds.length === 0 ? "0" : audit.unreferencedItemIds.join("、")}。`,
    `- 未关联有效副本的任务：${audit.unreferencedQuestIds.length === 0 ? "0" : audit.unreferencedQuestIds.join("、")}。`,
    `- 未被收藏奖励引用的套装：${audit.unreferencedItemSetIds.length === 0 ? "0" : audit.unreferencedItemSetIds.join("、")}。`,
    `- 任务奖励与 Boss 掉落重复：${audit.questRewardBossOverlap.length === 0 ? "0" : audit.questRewardBossOverlap.join("、")}。`,
    "",
    "## 结论",
    "",
    audit.questRewardBossOverlap.length === 0
      ? "- 当前任务奖励与 Boss 掉落池没有重复装备。"
      : "- 发现任务奖励与 Boss 掉落池重复装备，必须在发布前拆分来源。",
    audit.unusedLootTableIds.length === 0
      ? "- 当前没有未被路线引用的掉落表。"
      : "- 存在未被路线引用的掉落表，请确认是否为预备内容。",
    "",
  ];
  return lines.join("\n");
}
