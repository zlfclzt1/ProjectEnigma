import { SLOT_LABELS, SLOT_WEIGHTS } from "../core.js";
import { loadBrowserContentRegistry } from "./manifest";
import type { ContentRegistry } from "./registry";
import type { ItemDefinition } from "./schemas/item";

function legacyItemId(id: string): string | number {
  const numeric = Number(id);
  return Number.isSafeInteger(numeric) && String(numeric) === id ? numeric : id;
}

function legacyItem(item: ItemDefinition) {
  return {
    id: legacyItemId(item.id),
    name: item.name.zhCN,
    ...(item.name.enUS ? { englishName: item.name.enUS } : {}),
    iconName: item.icon.kind === "database" ? item.icon.name : undefined,
    quality: item.quality,
    itemLevel: item.itemLevel,
    slot: item.slot,
    armorType: item.armorType ?? null,
    allowedClasses: [...item.restrictions.allowedClassIds],
    allowedRoles: [...item.restrictions.allowedRoles],
    description: item.description.zhCN,
    ...(item.twoHanded ? { twoHanded: true } : {}),
  };
}

function legacyLogKey(group: ContentRegistry["logTemplates"][number]): string {
  if (group.scope.type === "dungeon") return group.scope.dungeonId;
  if (group.scope.type === "encounter") return group.scope.encounterId;
  return group.eventType === "expedition-start" ? "start" : "failure";
}

export function adaptLegacyContent(registry: ContentRegistry) {
  const roleLabels = Object.fromEntries(registry.roles.map((role) => [role.id, role.name.zhCN]));
  const personalities = registry.personalities.map((personality) => ({
    id: personality.id,
    name: personality.name.zhCN,
    benefit: personality.benefit.zhCN,
    drawback: personality.drawback.zhCN,
  }));
  const classes = registry.classes.map((classDefinition) => ({
    id: classDefinition.id,
    name: classDefinition.name.zhCN,
    armorType: classDefinition.armorType,
    races: [...classDefinition.races],
    specs: registry.specs
      .filter((spec) => spec.classId === classDefinition.id)
      .map((spec) => ({ id: spec.id, name: spec.name.zhCN, role: spec.role })),
  }));
  const names = registry.namePartsByLocale.get("zh-CN");
  if (!names) throw new Error("旧版适配器缺少 zh-CN 随机姓名定义");
  const nameParts = { first: [...names.first], second: [...names.second] };

  const logTemplates: Record<string, readonly string[]> = {};
  for (const group of registry.logTemplates) {
    const key = legacyLogKey(group);
    if (logTemplates[key]) throw new Error(`旧版日志键重复：${key}`);
    logTemplates[key] = [...group.templates];
  }
  for (const requiredKey of ["start", "failure"]) {
    if (!logTemplates[requiredKey]?.length) throw new Error(`旧版适配器缺少 ${requiredKey} 日志`);
  }

  const dungeons = [...registry.dungeons]
    .sort(
      (left, right) =>
        left.recommendedLevel - right.recommendedLevel ||
        left.minimumLevel - right.minimumLevel ||
        left.id.localeCompare(right.id),
    )
    .map((dungeon) => ({
      id: dungeon.id,
      name: dungeon.name.zhCN,
      minimumLevel: dungeon.minimumLevel,
      recommendedLevel: dungeon.recommendedLevel,
      defaultUnlocked: dungeon.defaultUnlocked,
      ...(dungeon.unlock
        ? {
            unlock: {
              ...(dungeon.unlock.requiredDungeonIds
                ? { requiredDungeonIds: [...dungeon.unlock.requiredDungeonIds] }
                : {}),
              ...(dungeon.unlock.requiredAnyDungeonIds
                ? { requiredAnyDungeonIds: [...dungeon.unlock.requiredAnyDungeonIds] }
                : {}),
            },
          }
        : {}),
      members: { ...dungeon.members },
      duration: { ...dungeon.duration },
      probability: { ...dungeon.probability },
      bosses: registry.getEncountersForDungeon(dungeon.id).map((encounter) => ({
        id: encounter.id,
        name: encounter.name.zhCN,
        stageSeconds: encounter.stageSeconds,
        requirements: { ...encounter.requirements },
        weights: { ...encounter.weights },
        experienceShare: encounter.experienceShare,
        funds: encounter.funds,
        firstKillBonus: encounter.firstKillBonus,
        lootPool: encounter.lootTableId,
      })),
    }));
  const dungeonById = new Map(dungeons.map((dungeon) => [dungeon.id, dungeon]));
  const dungeon = dungeons.find((entry) => entry.id === "ragefire_chasm") ?? dungeons[0];
  if (!dungeon) throw new Error("旧版适配器至少需要一个副本定义");

  const items = registry.items.filter((item) => !item.isStarter).map(legacyItem);
  const itemById = new Map(items.map((item) => [String(item.id), item]));
  const lootPools = new Map(
    registry.lootTables.map((table) => [
      table.id,
      {
        id: table.id,
        guaranteedEquipmentDrops: table.guaranteedEquipmentDrops,
        ...(table.sourceType ? { sourceType: table.sourceType } : {}),
        items: table.items.map((entry) => ({
          itemId: legacyItemId(entry.itemId),
          weight: entry.weight,
        })),
      },
    ]),
  );
  const hiddenCharacters = registry.hiddenCharacters.map((character) => ({
    id: character.id,
    legacyId: character.name.zhCN,
    name: character.name.zhCN,
    classId: character.classId,
    specId: character.specId,
    personalityId: character.personalityId,
    appearance: { ...character.appearance },
  }));

  return {
    dungeon,
    dungeons,
    dungeonById,
    lootPools,
    items,
    itemById,
    classes,
    personalities,
    roleLabels,
    nameParts,
    logTemplates,
    hiddenCharacters,
    equipmentSlotIds: Object.keys(SLOT_WEIGHTS),
    slotLabels: SLOT_LABELS,
  };
}

export type LegacyContent = ReturnType<typeof adaptLegacyContent>;

export function loadBrowserLegacyContent(): LegacyContent {
  return adaptLegacyContent(loadBrowserContentRegistry());
}
