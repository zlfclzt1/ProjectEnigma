import type { ContentRegistry } from "../../content/registry";
import type { ItemDefinition } from "../../content/schemas/item";
import type { CollectionRewardEffect } from "../../content/schemas/collection-reward";
import type { ItemSuffixDefinition } from "../../content/schemas/item-suffix";
import type { GameState } from "../../domain/game-state";
import {
  evaluateCollectionReward,
  getClaimedCollectionBenefits,
} from "../../domain/collection/collection-reward-rules";
import {
  getDungeonDevelopmentSummary,
  rewardEncounterAssignments,
  unlockedDevelopmentItemsByEncounter,
} from "../../domain/dungeon/dungeon-development";
import type { ItemStatLineView } from "./get-members-view";
import { EQUIPMENT_SLOT_NAMES, getItemStatLines } from "./get-members-view";
import type {
  CollectionRewardId,
  DungeonId,
  DungeonRouteVariantId,
  EncounterId,
  ItemDefinitionId,
  ItemSetId,
  LootTableId,
  ManagementFeatureId,
  RandomSuffixId,
  DisplayRecordId,
} from "../../domain/shared/ids";

export interface CollectionProgressView {
  readonly acquiredItemCount: number;
  readonly totalItemCount: number;
  readonly completionPercent: number;
}

export interface CatalogSuffixView {
  readonly id: RandomSuffixId;
  readonly name: string;
}

export interface CatalogItemSourceView {
  readonly dungeonId: DungeonId;
  readonly dungeonName: string;
  readonly sourceType: "encounter" | "route-completion";
  readonly encounterId?: EncounterId;
  readonly routeVariantId?: DungeonRouteVariantId;
  readonly encounterName: string;
  readonly lootTableId?: LootTableId;
  readonly kind: "base" | "development";
  readonly guaranteedEquipmentDrops: number;
  readonly relativeWeight: number;
  readonly basePerDropChance: number;
  readonly perDropChance: number;
  readonly baseEncounterDropChance: number;
  readonly encounterDropChance: number;
  readonly developmentQuestNames: readonly string[];
  readonly firstDevelopmentReward: boolean;
}

export interface CatalogItemView {
  readonly id: ItemDefinitionId;
  readonly name: string;
  readonly description: string;
  readonly itemLevel: number;
  readonly requiredLevel: number;
  readonly quality: ItemDefinition["quality"];
  readonly slot: ItemDefinition["slot"];
  readonly armorType?: ItemDefinition["armorType"];
  readonly icon: ItemDefinition["icon"];
  readonly iconUrl?: string;
  readonly stats: ItemDefinition["stats"];
  readonly statLines: readonly ItemStatLineView[];
  readonly slotName: string;
  readonly requirements: readonly string[];
  readonly statsSource: string;
  readonly source: CatalogItemSourceView;
  readonly sources: readonly CatalogItemSourceView[];
  readonly itemSetIds: readonly ItemSetId[];
  readonly acquired: boolean;
  readonly acquisitionCount: number;
  readonly possibleRandomSuffixes: readonly CatalogSuffixView[];
  readonly seenRandomSuffixes: readonly CatalogSuffixView[];
}

export interface EncounterCatalogView {
  readonly id: EncounterId;
  readonly name: string;
  readonly guaranteedEquipmentDrops: number;
  readonly extraLootPercent: number;
  readonly expectedEquipmentDrops: number;
  readonly items: readonly CatalogItemView[];
}

export interface RouteRewardCatalogView {
  readonly id: DungeonRouteVariantId;
  readonly name: string;
  readonly guaranteedEquipmentDrops: number;
  readonly items: readonly CatalogItemView[];
}

export interface DungeonCatalogDevelopmentView {
  readonly level: number;
  readonly points: number;
  readonly totalPoints: number;
  readonly experienceBonusPercent: number;
  readonly extraLootPercent: number;
  readonly completedCommissionCount: number;
  readonly totalCommissionCount: number;
  readonly unlockedItemCount: number;
  readonly hiddenItemCount: number;
}

export interface LockedDungeonCatalogView {
  readonly id: DungeonId;
  readonly name: string;
  readonly unlocked: false;
}

export interface UnlockedDungeonCatalogView extends CollectionProgressView {
  readonly id: DungeonId;
  readonly name: string;
  readonly unlocked: true;
  readonly development: DungeonCatalogDevelopmentView;
  readonly encounters: readonly EncounterCatalogView[];
  readonly routeRewards: readonly RouteRewardCatalogView[];
}

export type DungeonCatalogView = LockedDungeonCatalogView | UnlockedDungeonCatalogView;

export interface ItemSetPartView {
  readonly id: ItemDefinitionId;
  readonly name: string;
  readonly acquired: boolean;
  readonly acquisitionCount: number;
}

export interface ItemSetCatalogView extends CollectionProgressView {
  readonly id: ItemSetId;
  readonly name: string;
  readonly description: string;
  readonly parts: readonly ItemSetPartView[];
}

export interface CollectionRewardConditionView extends CollectionProgressView {
  readonly type:
    | "encounter-victory"
    | "dungeon-completion"
    | "item-set-completion"
    | "item-sets-completion"
    | "global-completion";
  readonly minimumPercent: number;
  readonly scopeName: string;
}

export interface CollectionRewardView {
  readonly id: CollectionRewardId;
  readonly name: string;
  readonly description: string;
  readonly condition: CollectionRewardConditionView;
  readonly effects: readonly CollectionRewardEffect[];
  readonly claimable: boolean;
  readonly claimed: boolean;
}

export interface ItemCatalogView {
  readonly dungeons: readonly DungeonCatalogView[];
  readonly itemSets: readonly ItemSetCatalogView[];
  readonly globalProgress: CollectionProgressView;
  readonly rewards: readonly CollectionRewardView[];
  readonly unlockedManagementFeatureIds: readonly ManagementFeatureId[];
  readonly unlockedDisplayRecordIds: readonly DisplayRecordId[];
}

interface CatalogSource {
  readonly dungeonId: DungeonId;
  readonly sourceType: "encounter" | "route-completion";
  readonly encounterId?: EncounterId;
  readonly routeVariantId?: DungeonRouteVariantId;
  readonly sourceName: string;
  readonly lootTableId?: LootTableId;
  readonly kind: "base" | "development";
  readonly guaranteedEquipmentDrops: number;
  readonly relativeWeight: number;
  readonly basePerDropChance: number;
  readonly perDropChance: number;
  readonly baseEncounterDropChance: number;
  readonly encounterDropChance: number;
  readonly developmentQuestNames: readonly string[];
  readonly firstDevelopmentReward: boolean;
}

interface CatalogIndex {
  readonly sourcesByItemId: ReadonlyMap<ItemDefinitionId, readonly CatalogSource[]>;
  readonly itemIdsByDungeonId: ReadonlyMap<DungeonId, ReadonlySet<ItemDefinitionId>>;
  readonly baseItemIdsByDungeonId: ReadonlyMap<DungeonId, ReadonlySet<ItemDefinitionId>>;
  readonly allItemIds: ReadonlySet<ItemDefinitionId>;
  readonly itemSetIdsByItemId: ReadonlyMap<ItemDefinitionId, readonly ItemSetId[]>;
}

export function getItemCatalogView(state: GameState, content: ContentRegistry): ItemCatalogView {
  const index = buildCatalogIndex(state, content);
  const unlockedDungeonIds = new Set(state.guild.unlockedDungeonIds);
  const visibleItemIds = new Set<ItemDefinitionId>();
  for (const dungeonId of unlockedDungeonIds) {
    for (const itemId of index.itemIdsByDungeonId.get(dungeonId) ?? []) visibleItemIds.add(itemId);
  }
  const visibleSetIds = new Set(
    content.itemSets
      .filter((set) => set.itemIds.every((itemId) => visibleItemIds.has(itemId)))
      .map((set) => set.id),
  );

  const dungeons = content.dungeons
    .map((dungeon): DungeonCatalogView => {
      if (!unlockedDungeonIds.has(dungeon.id)) {
        return { id: dungeon.id, name: dungeon.name.zhCN, unlocked: false };
      }
      const dungeonItemIds = index.baseItemIdsByDungeonId.get(dungeon.id) ?? new Set();
      const progress = progressFor(dungeonItemIds, state);
      const developmentSummary = getDungeonDevelopmentSummary(state, content, dungeon.id);
      const developmentItems = unlockedDevelopmentItemsByEncounter(state, content, dungeon.id);
      const quests = content.quests.filter((quest) => quest.dungeonId === dungeon.id);
      const unlockedDevelopmentItemIds = new Set(
        Object.values(developmentItems).flatMap((itemIds) => itemIds ?? []),
      );
      const hiddenDevelopmentItemIds = new Set(
        quests.flatMap((quest) =>
          state.dungeonDevelopment.entries[quest.id]?.status === "completed"
            ? []
            : [...quest.rewards.fixedItemIds, ...quest.rewards.itemChoiceIds],
        ),
      );
      return {
        id: dungeon.id,
        name: dungeon.name.zhCN,
        unlocked: true,
        ...progress,
        development: {
          level: developmentSummary.level,
          points: developmentSummary.points,
          totalPoints: developmentSummary.totalPoints,
          experienceBonusPercent: Math.round((developmentSummary.experienceMultiplier - 1) * 100),
          extraLootPercent: Math.round(developmentSummary.extraLootChance * 100),
          completedCommissionCount: quests.filter(
            (quest) => state.dungeonDevelopment.entries[quest.id]?.status === "completed",
          ).length,
          totalCommissionCount: quests.length,
          unlockedItemCount: unlockedDevelopmentItemIds.size,
          hiddenItemCount: hiddenDevelopmentItemIds.size,
        },
        encounters: dungeon.route.map(({ encounterId }) => {
          const encounter = content.encounterById.get(encounterId)!;
          const lootTable = content.getLootTableForEncounter(encounter.id);
          const itemIds = [
            ...(lootTable?.items.map((entry) => entry.itemId) ?? []),
            ...(developmentItems[encounter.id] ?? []).filter(
              (itemId) => !lootTable?.items.some((entry) => entry.itemId === itemId),
            ),
          ];
          const guaranteedEquipmentDrops =
            itemIds.length === 0 ? 0 : (lootTable?.guaranteedEquipmentDrops ?? 1);
          return {
            id: encounter.id,
            name: encounter.name.zhCN,
            guaranteedEquipmentDrops,
            extraLootPercent:
              itemIds.length === 0 ? 0 : Math.round(developmentSummary.extraLootChance * 100),
            expectedEquipmentDrops:
              guaranteedEquipmentDrops +
              (itemIds.length === 0 ? 0 : developmentSummary.extraLootChance),
            items: itemIds.map((itemId) => {
              const definition = content.itemById.get(itemId)!;
              const source = (index.sourcesByItemId.get(itemId) ?? []).find(
                (candidate) =>
                  candidate.sourceType === "encounter" && candidate.encounterId === encounter.id,
              )!;
              return projectItem(
                state,
                content,
                index,
                visibleSetIds,
                unlockedDungeonIds,
                definition,
                source,
              );
            }),
          };
        }),
        routeRewards: (dungeon.routeVariants ?? []).flatMap((variant): RouteRewardCatalogView[] => {
          if (!variant.completionReward) return [];
          const table = content.lootTableById.get(variant.completionReward.lootTableId)!;
          return [
            {
              id: variant.id,
              name: `${variant.name.zhCN}完成奖励`,
              guaranteedEquipmentDrops: table.guaranteedEquipmentDrops,
              items: table.items.map(({ itemId }) => {
                const definition = content.itemById.get(itemId)!;
                const source = (index.sourcesByItemId.get(itemId) ?? []).find(
                  (candidate) =>
                    candidate.sourceType === "route-completion" &&
                    candidate.routeVariantId === variant.id,
                )!;
                return projectItem(
                  state,
                  content,
                  index,
                  visibleSetIds,
                  unlockedDungeonIds,
                  definition,
                  source,
                );
              }),
            },
          ];
        }),
      };
    })
    .sort(
      (left, right) =>
        Number(right.unlocked) - Number(left.unlocked) ||
        (content.dungeonById.get(left.id)?.recommendedLevel ?? 0) -
          (content.dungeonById.get(right.id)?.recommendedLevel ?? 0) ||
        left.id.localeCompare(right.id),
    );

  const itemSets = content.itemSets
    .filter((set) => visibleSetIds.has(set.id))
    .map((set): ItemSetCatalogView => {
      return {
        id: set.id,
        name: set.name.zhCN,
        description: set.description.zhCN,
        ...progressFor(set.itemIds, state),
        parts: set.itemIds.map((itemId) => {
          const record = state.collection.items[itemId];
          return {
            id: itemId,
            name: content.itemById.get(itemId)?.name.zhCN ?? itemId,
            acquired: record !== undefined,
            acquisitionCount: record?.acquisitionCount ?? 0,
          };
        }),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));

  const globalProgress = progressFor(index.allItemIds, state);
  const rewards = content.collectionRewards
    .filter((reward) => {
      if (state.collection.claimedRewardIds.includes(reward.id)) return true;
      if (reward.condition.type === "global-completion") return true;
      if (reward.condition.type === "encounter-victory") {
        const dungeonId = content.encounterById.get(reward.condition.encounterId)?.dungeonId;
        return dungeonId !== undefined && unlockedDungeonIds.has(dungeonId);
      }
      if (reward.condition.type === "dungeon-completion") {
        return unlockedDungeonIds.has(reward.condition.dungeonId);
      }
      if (reward.condition.type === "item-set-completion") {
        return visibleSetIds.has(reward.condition.itemSetId);
      }
      return reward.condition.itemSetIds.every((itemSetId) => visibleSetIds.has(itemSetId));
    })
    .map((reward): CollectionRewardView => {
      const eligibility = evaluateCollectionReward(state, content, reward.id);
      const condition = rewardConditionView(content, reward.condition, eligibility);
      return {
        id: reward.id,
        name: reward.name.zhCN,
        description: reward.description.zhCN,
        condition,
        effects: structuredClone(reward.effects),
        claimable: eligibility.claimable,
        claimed: eligibility.claimed,
      };
    });
  const claimedBenefits = getClaimedCollectionBenefits(state, content);

  return {
    dungeons,
    itemSets,
    globalProgress,
    rewards,
    unlockedManagementFeatureIds: claimedBenefits.managementFeatureIds,
    unlockedDisplayRecordIds: claimedBenefits.displayRecordIds,
  };
}

function buildCatalogIndex(state: GameState, content: ContentRegistry): CatalogIndex {
  const sourcesByItemId = new Map<ItemDefinitionId, CatalogSource[]>();
  const itemIdsByDungeonId = new Map<DungeonId, Set<ItemDefinitionId>>();
  const baseItemIdsByDungeonId = new Map<DungeonId, Set<ItemDefinitionId>>();
  const allItemIds = new Set<ItemDefinitionId>();
  const firstDevelopmentRewardKeys = getFirstDevelopmentRewardKeys(state);
  for (const dungeon of content.dungeons) {
    const dungeonItemIds = new Set<ItemDefinitionId>();
    const baseDungeonItemIds = new Set<ItemDefinitionId>();
    const developmentSummary = getDungeonDevelopmentSummary(state, content, dungeon.id);
    const developmentItems = unlockedDevelopmentItemsByEncounter(state, content, dungeon.id);
    const developmentQuestNames = getDevelopmentQuestNames(state, content, dungeon.id);
    for (const { encounterId } of dungeon.route) {
      const encounter = content.encounterById.get(encounterId)!;
      const lootTable = content.getLootTableForEncounter(encounter.id);
      const baseItems = lootTable?.items ?? [];
      const baseTotalWeight = baseItems.reduce((sum, entry) => sum + entry.weight, 0);
      const unlockedWeight = baseItems.length > 0 ? baseTotalWeight / baseItems.length : 1;
      const unlockedItems = (developmentItems[encounter.id] ?? [])
        .filter((itemId) => !baseItems.some((entry) => entry.itemId === itemId))
        .map((itemId) => ({ itemId, weight: unlockedWeight }));
      const currentItems = [...baseItems, ...unlockedItems];
      const currentTotalWeight = currentItems.reduce((sum, entry) => sum + entry.weight, 0);
      const guaranteedEquipmentDrops = lootTable?.guaranteedEquipmentDrops ?? 1;
      for (const entry of currentItems) {
        const baseEntry = baseItems.find((candidate) => candidate.itemId === entry.itemId);
        const basePerDropChance = baseEntry ? baseEntry.weight / baseTotalWeight : 0;
        const perDropChance = entry.weight / currentTotalWeight;
        const sources = sourcesByItemId.get(entry.itemId) ?? [];
        const questNames = developmentQuestNames.get(
          developmentItemKey(encounter.id, entry.itemId),
        );
        sources.push({
          dungeonId: dungeon.id,
          sourceType: "encounter",
          encounterId: encounter.id,
          sourceName: encounter.name.zhCN,
          ...(lootTable ? { lootTableId: lootTable.id } : {}),
          kind: baseEntry ? "base" : "development",
          guaranteedEquipmentDrops,
          relativeWeight: entry.weight,
          basePerDropChance,
          perDropChance,
          baseEncounterDropChance:
            basePerDropChance === 0 ? 0 : 1 - (1 - basePerDropChance) ** guaranteedEquipmentDrops,
          encounterDropChance:
            1 -
            (1 - perDropChance) ** guaranteedEquipmentDrops *
              (1 - developmentSummary.extraLootChance * perDropChance),
          developmentQuestNames: questNames ?? [],
          firstDevelopmentReward: firstDevelopmentRewardKeys.has(
            developmentItemKey(encounter.id, entry.itemId),
          ),
        });
        sourcesByItemId.set(entry.itemId, sources);
        dungeonItemIds.add(entry.itemId);
        if (baseEntry) {
          baseDungeonItemIds.add(entry.itemId);
          allItemIds.add(entry.itemId);
        }
      }
    }
    for (const variant of dungeon.routeVariants ?? []) {
      if (!variant.completionReward) continue;
      const table = content.lootTableById.get(variant.completionReward.lootTableId)!;
      const totalWeight = table.items.reduce((sum, entry) => sum + entry.weight, 0);
      for (const entry of table.items) {
        const perDropChance = entry.weight / totalWeight;
        const sources = sourcesByItemId.get(entry.itemId) ?? [];
        sources.push({
          dungeonId: dungeon.id,
          sourceType: "route-completion",
          routeVariantId: variant.id,
          sourceName: `${variant.name.zhCN}完成奖励`,
          lootTableId: table.id,
          kind: "base",
          guaranteedEquipmentDrops: table.guaranteedEquipmentDrops,
          relativeWeight: entry.weight,
          basePerDropChance: perDropChance,
          perDropChance,
          baseEncounterDropChance: 1 - (1 - perDropChance) ** table.guaranteedEquipmentDrops,
          encounterDropChance: 1 - (1 - perDropChance) ** table.guaranteedEquipmentDrops,
          developmentQuestNames: [],
          firstDevelopmentReward: false,
        });
        sourcesByItemId.set(entry.itemId, sources);
        dungeonItemIds.add(entry.itemId);
        baseDungeonItemIds.add(entry.itemId);
        allItemIds.add(entry.itemId);
      }
    }
    itemIdsByDungeonId.set(dungeon.id, dungeonItemIds);
    baseItemIdsByDungeonId.set(dungeon.id, baseDungeonItemIds);
  }

  const itemSetIdsByItemId = new Map<ItemDefinitionId, ItemSetId[]>();
  for (const set of content.itemSets) {
    for (const itemId of set.itemIds) {
      const setIds = itemSetIdsByItemId.get(itemId) ?? [];
      setIds.push(set.id);
      itemSetIdsByItemId.set(itemId, setIds);
    }
  }
  return {
    sourcesByItemId,
    itemIdsByDungeonId,
    baseItemIdsByDungeonId,
    allItemIds,
    itemSetIdsByItemId,
  };
}

function getDevelopmentQuestNames(
  state: GameState,
  content: ContentRegistry,
  dungeonId: DungeonId,
): ReadonlyMap<string, readonly string[]> {
  const namesByItem = new Map<string, string[]>();
  for (const quest of content.quests) {
    const progress = state.dungeonDevelopment.entries[quest.id];
    if (progress?.status !== "completed") continue;
    for (const [encounterId, itemIds] of rewardEncounterAssignments(
      quest,
      content,
      progress.completionEncounterId,
    )) {
      if (content.encounterById.get(encounterId)?.dungeonId !== dungeonId) continue;
      for (const itemId of itemIds) {
        const key = developmentItemKey(encounterId, itemId);
        namesByItem.set(key, [...new Set([...(namesByItem.get(key) ?? []), quest.name.zhCN])]);
      }
    }
  }
  return namesByItem;
}

function getFirstDevelopmentRewardKeys(state: GameState): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const activity of Object.values(state.activities)) {
    if (activity.type !== "expedition") continue;
    for (const event of activity.developmentEvents) {
      if (event.type !== "completed") continue;
      for (const itemInstanceId of event.itemInstanceIds) {
        const item = state.itemInstances[itemInstanceId];
        if (item) keys.add(developmentItemKey(event.encounterId, item.definitionId));
      }
    }
  }
  return keys;
}

function developmentItemKey(encounterId: EncounterId, itemId: ItemDefinitionId): string {
  return `${encounterId}:${itemId}`;
}

function projectItem(
  state: GameState,
  content: ContentRegistry,
  index: CatalogIndex,
  visibleSetIds: ReadonlySet<ItemSetId>,
  unlockedDungeonIds: ReadonlySet<DungeonId>,
  definition: ItemDefinition,
  source: CatalogSource,
): CatalogItemView {
  const record = state.collection.items[definition.id];
  const requirements = [`需要等级 ${definition.requiredLevel ?? 1}`];
  if (definition.armorType) requirements.push(`护甲类型：${definition.armorType}`);
  if (definition.restrictions.allowedClassIds.length > 0) {
    requirements.push(
      `职业：${definition.restrictions.allowedClassIds
        .map((id) => content.classById.get(id)?.name.zhCN ?? id)
        .join("、")}`,
    );
  }
  if (definition.restrictions.allowedRoles.length > 0) {
    requirements.push(
      `定位：${definition.restrictions.allowedRoles
        .map((id) => content.roleById.get(id)?.name.zhCN ?? id)
        .join("、")}`,
    );
  }
  return {
    id: definition.id,
    name: definition.name.zhCN,
    description: definition.description.zhCN,
    itemLevel: definition.itemLevel,
    requiredLevel: definition.requiredLevel ?? 1,
    quality: definition.quality,
    slot: definition.slot,
    ...(definition.armorType ? { armorType: definition.armorType } : {}),
    icon: structuredClone(definition.icon),
    ...(definition.icon.kind === "database"
      ? {
          iconUrl: `/assets/item-icons/${encodeURIComponent(definition.icon.name)}.jpg`,
        }
      : {}),
    stats: structuredClone(definition.stats),
    statLines: getItemStatLines(definition.stats),
    slotName: EQUIPMENT_SLOT_NAMES[definition.slot],
    requirements,
    statsSource:
      definition.statsSource.provider === "wowhead-classic"
        ? `Wowhead Classic · ${definition.statsSource.verifiedAt}`
        : `游戏设计数据 · ${definition.statsSource.verifiedAt}`,
    source: projectCatalogSource(content, source),
    sources: (index.sourcesByItemId.get(definition.id) ?? [])
      .filter((candidate) => unlockedDungeonIds.has(candidate.dungeonId))
      .map((candidate) => projectCatalogSource(content, candidate)),
    itemSetIds: (index.itemSetIdsByItemId.get(definition.id) ?? []).filter((setId) =>
      visibleSetIds.has(setId),
    ),
    acquired: record !== undefined,
    acquisitionCount: record?.acquisitionCount ?? 0,
    possibleRandomSuffixes: content.getRandomSuffixesForItem(definition.id).map(projectSuffix),
    seenRandomSuffixes: (record?.seenRandomSuffixIds ?? []).map((suffixId) => {
      const suffix = content.itemSuffixById.get(suffixId);
      return suffix ? projectSuffix(suffix) : { id: suffixId, name: suffixId };
    }),
  };
}

function projectCatalogSource(
  content: ContentRegistry,
  source: CatalogSource,
): CatalogItemSourceView {
  const dungeon = content.dungeonById.get(source.dungeonId)!;
  return {
    dungeonId: dungeon.id,
    dungeonName: dungeon.name.zhCN,
    sourceType: source.sourceType,
    ...(source.encounterId ? { encounterId: source.encounterId } : {}),
    ...(source.routeVariantId ? { routeVariantId: source.routeVariantId } : {}),
    encounterName: source.sourceName,
    ...(source.lootTableId ? { lootTableId: source.lootTableId } : {}),
    kind: source.kind,
    guaranteedEquipmentDrops: source.guaranteedEquipmentDrops,
    relativeWeight: source.relativeWeight,
    basePerDropChance: source.basePerDropChance,
    perDropChance: source.perDropChance,
    baseEncounterDropChance: source.baseEncounterDropChance,
    encounterDropChance: source.encounterDropChance,
    developmentQuestNames: [...source.developmentQuestNames],
    firstDevelopmentReward: source.firstDevelopmentReward,
  };
}

function projectSuffix(suffix: ItemSuffixDefinition): CatalogSuffixView {
  return {
    id: suffix.id,
    name: suffix.nameTemplate.zhCN.replace("{base}", "").trim(),
  };
}

function progressFor(
  itemIds: Iterable<ItemDefinitionId>,
  state: GameState,
): CollectionProgressView {
  const uniqueItemIds = new Set(itemIds);
  const acquiredItemCount = [...uniqueItemIds].filter(
    (itemId) => state.collection.items[itemId] !== undefined,
  ).length;
  return {
    acquiredItemCount,
    totalItemCount: uniqueItemIds.size,
    completionPercent:
      uniqueItemIds.size === 0 ? 0 : (acquiredItemCount / uniqueItemIds.size) * 100,
  };
}

function rewardConditionView(
  content: ContentRegistry,
  condition: ContentRegistry["collectionRewards"][number]["condition"],
  progress: CollectionProgressView,
): CollectionRewardConditionView {
  if (condition.type === "encounter-victory") {
    return {
      type: condition.type,
      minimumPercent: 100,
      scopeName:
        content.encounterById.get(condition.encounterId)?.name.zhCN ?? condition.encounterId,
      ...progress,
    };
  }
  if (condition.type === "dungeon-completion") {
    return {
      type: condition.type,
      minimumPercent: condition.minimumPercent,
      scopeName: content.dungeonById.get(condition.dungeonId)?.name.zhCN ?? condition.dungeonId,
      ...progress,
    };
  }
  if (condition.type === "item-set-completion") {
    const set = content.itemSetById.get(condition.itemSetId);
    return {
      type: condition.type,
      minimumPercent: condition.minimumPercent,
      scopeName: set?.name.zhCN ?? condition.itemSetId,
      ...progress,
    };
  }
  if (condition.type === "item-sets-completion") {
    return {
      type: condition.type,
      minimumPercent: condition.minimumPercent,
      scopeName: condition.itemSetIds
        .map((itemSetId) => content.itemSetById.get(itemSetId)?.name.zhCN ?? itemSetId)
        .join("、"),
      ...progress,
    };
  }
  return {
    type: condition.type,
    minimumPercent: condition.minimumPercent,
    scopeName: "全部副本装备",
    ...progress,
  };
}
