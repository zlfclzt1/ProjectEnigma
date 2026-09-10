import type { ContentRegistry } from "../../content/registry";
import type { ItemDefinition } from "../../content/schemas/item";
import type { CollectionRewardEffect } from "../../content/schemas/collection-reward";
import type { ItemSuffixDefinition } from "../../content/schemas/item-suffix";
import type { GameState } from "../../domain/game-state";
import {
  evaluateCollectionReward,
  getClaimedCollectionBenefits,
} from "../../domain/collection/collection-reward-rules";
import type { ItemStatLineView } from "./get-members-view";
import { EQUIPMENT_SLOT_NAMES, getItemStatLines } from "./get-members-view";
import type {
  CollectionRewardId,
  DungeonId,
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
  readonly encounterId: EncounterId;
  readonly encounterName: string;
  readonly lootTableId: LootTableId;
  readonly guaranteedEquipmentDrops: number;
  readonly relativeWeight: number;
  readonly perDropChance: number;
  readonly encounterDropChance: number;
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
  readonly itemSetIds: readonly ItemSetId[];
  readonly acquired: boolean;
  readonly acquisitionCount: number;
  readonly possibleRandomSuffixes: readonly CatalogSuffixView[];
  readonly seenRandomSuffixes: readonly CatalogSuffixView[];
}

export interface EncounterCatalogView {
  readonly id: EncounterId;
  readonly name: string;
  readonly items: readonly CatalogItemView[];
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
  readonly encounters: readonly EncounterCatalogView[];
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
    "encounter-victory" | "dungeon-completion" | "item-set-completion" | "global-completion";
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
  readonly encounterId: EncounterId;
  readonly lootTableId: LootTableId;
  readonly guaranteedEquipmentDrops: number;
  readonly relativeWeight: number;
  readonly perDropChance: number;
  readonly encounterDropChance: number;
}

interface CatalogIndex {
  readonly sourcesByItemId: ReadonlyMap<ItemDefinitionId, readonly CatalogSource[]>;
  readonly itemIdsByDungeonId: ReadonlyMap<DungeonId, ReadonlySet<ItemDefinitionId>>;
  readonly allItemIds: ReadonlySet<ItemDefinitionId>;
  readonly itemSetIdsByItemId: ReadonlyMap<ItemDefinitionId, readonly ItemSetId[]>;
}

export function getItemCatalogView(state: GameState, content: ContentRegistry): ItemCatalogView {
  const index = buildCatalogIndex(content);
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
      const dungeonItemIds = index.itemIdsByDungeonId.get(dungeon.id) ?? new Set();
      const progress = progressFor(dungeonItemIds, state);
      return {
        id: dungeon.id,
        name: dungeon.name.zhCN,
        unlocked: true,
        ...progress,
        encounters: dungeon.route.map(({ encounterId }) => {
          const encounter = content.encounterById.get(encounterId)!;
          const lootTable = content.getLootTableForEncounter(encounter.id);
          return {
            id: encounter.id,
            name: encounter.name.zhCN,
            items: (lootTable?.items ?? []).map((entry) => {
              const definition = content.itemById.get(entry.itemId)!;
              const source = (index.sourcesByItemId.get(entry.itemId) ?? []).find(
                (candidate) => candidate.encounterId === encounter.id,
              )!;
              return projectItem(state, content, index, visibleSetIds, definition, source);
            }),
          };
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
      return visibleSetIds.has(reward.condition.itemSetId);
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

function buildCatalogIndex(content: ContentRegistry): CatalogIndex {
  const sourcesByItemId = new Map<ItemDefinitionId, CatalogSource[]>();
  const itemIdsByDungeonId = new Map<DungeonId, Set<ItemDefinitionId>>();
  const allItemIds = new Set<ItemDefinitionId>();
  for (const dungeon of content.dungeons) {
    const dungeonItemIds = new Set<ItemDefinitionId>();
    for (const { encounterId } of dungeon.route) {
      const encounter = content.encounterById.get(encounterId)!;
      const lootTable = content.getLootTableForEncounter(encounter.id);
      if (!lootTable) continue;
      const totalWeight = lootTable.items.reduce((sum, entry) => sum + entry.weight, 0);
      for (const entry of lootTable.items) {
        const perDropChance = entry.weight / totalWeight;
        const sources = sourcesByItemId.get(entry.itemId) ?? [];
        sources.push({
          dungeonId: dungeon.id,
          encounterId: encounter.id,
          lootTableId: lootTable.id,
          guaranteedEquipmentDrops: lootTable.guaranteedEquipmentDrops,
          relativeWeight: entry.weight,
          perDropChance,
          encounterDropChance: 1 - (1 - perDropChance) ** lootTable.guaranteedEquipmentDrops,
        });
        sourcesByItemId.set(entry.itemId, sources);
        dungeonItemIds.add(entry.itemId);
        allItemIds.add(entry.itemId);
      }
    }
    itemIdsByDungeonId.set(dungeon.id, dungeonItemIds);
  }

  const itemSetIdsByItemId = new Map<ItemDefinitionId, ItemSetId[]>();
  for (const set of content.itemSets) {
    for (const itemId of set.itemIds) {
      const setIds = itemSetIdsByItemId.get(itemId) ?? [];
      setIds.push(set.id);
      itemSetIdsByItemId.set(itemId, setIds);
    }
  }
  return { sourcesByItemId, itemIdsByDungeonId, allItemIds, itemSetIdsByItemId };
}

function projectItem(
  state: GameState,
  content: ContentRegistry,
  index: CatalogIndex,
  visibleSetIds: ReadonlySet<ItemSetId>,
  definition: ItemDefinition,
  source: CatalogSource,
): CatalogItemView {
  const record = state.collection.items[definition.id];
  const encounter = content.encounterById.get(source.encounterId)!;
  const dungeon = content.dungeonById.get(source.dungeonId)!;
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
          iconUrl: `https://wow.zamimg.com/images/wow/icons/large/${encodeURIComponent(definition.icon.name)}.jpg`,
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
    source: {
      dungeonId: dungeon.id,
      dungeonName: dungeon.name.zhCN,
      encounterId: encounter.id,
      encounterName: encounter.name.zhCN,
      lootTableId: source.lootTableId,
      guaranteedEquipmentDrops: source.guaranteedEquipmentDrops,
      relativeWeight: source.relativeWeight,
      perDropChance: source.perDropChance,
      encounterDropChance: source.encounterDropChance,
    },
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
  return {
    type: condition.type,
    minimumPercent: condition.minimumPercent,
    scopeName: "全部副本装备",
    ...progress,
  };
}
