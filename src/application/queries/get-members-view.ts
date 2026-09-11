import type { ContentRegistry } from "../../content/registry";
import type { ClassicItemStats } from "../../domain/equipment/stats";
import { buildCombatProfile } from "../../domain/combat/formula-pipeline";
import { EQUIPMENT_SLOTS, type EquipmentSlot } from "../../domain/equipment/equipment-slot";
import { averageEquippedItemLevel } from "../../domain/equipment/item-level";
import type { ItemInstance } from "../../domain/equipment/item-instance";
import { resolveItemInstance } from "../../domain/equipment/resolve-item-instance";
import type { GameState } from "../../domain/game-state";
import { RESPEC_COST } from "../../domain/guild/recruitment";
import type { ClassId, MemberId, SpecId } from "../../domain/shared/ids";

export type MemberRole = "tank" | "healer" | "dps";

export interface MemberDirectoryEntryView {
  readonly id: MemberId;
  readonly name: string;
  readonly level: number;
  readonly itemLevel: number;
  readonly classId: ClassId;
  readonly className: string;
  readonly specName: string;
  readonly role: MemberRole;
  readonly roleName: string;
  readonly personalityName: string;
  readonly active: boolean;
}

export interface MemberDirectoryView {
  readonly members: readonly MemberDirectoryEntryView[];
  readonly classOptions: readonly { readonly id: ClassId; readonly name: string }[];
  readonly roleOptions: readonly { readonly id: MemberRole; readonly name: string }[];
}

export interface ItemStatLineView {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly numericValue?: number;
}

export interface EquippedItemView {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly name: string;
  readonly quality: "poor" | "common" | "uncommon" | "rare" | "epic";
  readonly itemLevel: number;
  readonly requiredLevel: number;
  readonly armorType?: string;
  readonly twoHanded: boolean;
  readonly iconUrl?: string;
  readonly description: string;
  readonly stats: readonly ItemStatLineView[];
  readonly acquisitionSource: string;
  readonly statsSource: string;
  readonly requirements: readonly string[];
  readonly randomSuffix?: {
    readonly name: string;
    readonly stats: readonly ItemStatLineView[];
  };
}

export interface EquipmentSlotView {
  readonly id: EquipmentSlot;
  readonly name: string;
  readonly item?: EquippedItemView;
}

export interface CombatContributionView {
  readonly id: string;
  readonly stage: string;
  readonly capability?: string;
  readonly amount: number;
  readonly description: string;
}

export interface MemberDetailView extends MemberDirectoryEntryView {
  readonly raceName: string;
  readonly personalityBenefit: string;
  readonly personalityDrawback: string;
  readonly equipment: readonly EquipmentSlotView[];
  readonly aggregateStats: readonly ItemStatLineView[];
  readonly capabilities: {
    readonly survivability: number;
    readonly threat: number;
    readonly healing: number;
    readonly damage: number;
  };
  readonly contributions: readonly CombatContributionView[];
  readonly availableSpecs: readonly {
    readonly id: SpecId;
    readonly name: string;
    readonly role: MemberRole;
    readonly roleName: string;
    readonly current: boolean;
  }[];
  readonly formulaVersion: string;
  readonly activeActivityId?: string;
  readonly canManage: boolean;
  readonly canAffordRespec: boolean;
  readonly respecCost: number;
}

export const EQUIPMENT_SLOT_NAMES: Readonly<Record<EquipmentSlot, string>> = {
  head: "头部",
  neck: "颈部",
  shoulder: "肩部",
  back: "背部",
  chest: "胸部",
  wrist: "手腕",
  hands: "手部",
  waist: "腰部",
  legs: "腿部",
  feet: "脚部",
  ring1: "戒指 1",
  ring2: "戒指 2",
  trinket1: "饰品 1",
  trinket2: "饰品 2",
  mainHand: "主手",
  offHand: "副手",
  ranged: "远程",
};

const STAT_LABELS: Readonly<Record<string, string>> = {
  strengthPoints: "力量",
  agilityPoints: "敏捷",
  staminaPoints: "耐力",
  intellectPoints: "智力",
  spiritPoints: "精神",
  armorPoints: "护甲",
  defenseSkillPoints: "防御技能",
  blockValuePoints: "格挡值",
  dodgePercent: "躲闪",
  parryPercent: "招架",
  blockPercent: "格挡",
  attackPowerPoints: "攻击强度",
  rangedAttackPowerPoints: "远程攻击强度",
  spellPowerPoints: "法术强度",
  healingPowerPoints: "治疗强度",
  arcaneSpellPowerPoints: "奥术法术强度",
  fireSpellPowerPoints: "火焰法术强度",
  frostSpellPowerPoints: "冰霜法术强度",
  natureSpellPowerPoints: "自然法术强度",
  shadowSpellPowerPoints: "暗影法术强度",
  healthRegenPer5Seconds: "每 5 秒生命回复",
  manaRegenPer5Seconds: "每 5 秒法力回复",
  arcanePoints: "奥术抗性",
  firePoints: "火焰抗性",
  frostPoints: "冰霜抗性",
  naturePoints: "自然抗性",
  shadowPoints: "暗影抗性",
};

const PERCENT_FIELDS = new Set([
  "dodgePercent",
  "parryPercent",
  "blockPercent",
  "physicalHitPercent",
  "physicalCriticalStrikePercent",
  "spellHitPercent",
  "spellCriticalStrikePercent",
]);

function directoryEntry(
  state: GameState,
  content: ContentRegistry,
  member: GameState["members"][MemberId],
): MemberDirectoryEntryView {
  const spec = content.specById.get(member.progression.specId)!;
  return {
    id: member.id,
    name: member.identity.name,
    level: member.progression.level,
    itemLevel: averageEquippedItemLevel(member, state.itemInstances, content),
    classId: member.identity.classId,
    className: content.classById.get(member.identity.classId)?.name.zhCN ?? "未知职业",
    specName: spec.name.zhCN,
    role: spec.role,
    roleName: content.roleById.get(spec.role)?.name.zhCN ?? spec.role,
    personalityName:
      content.personalityById.get(member.identity.personalityId)?.name.zhCN ?? "未知性格",
    active: member.activeActivityId !== undefined,
  };
}

export function getMemberDirectoryView(
  state: GameState,
  content: ContentRegistry,
): MemberDirectoryView {
  return {
    members: Object.values(state.members)
      .map((member) => directoryEntry(state, content, member))
      .sort((left, right) => right.level - left.level || left.name.localeCompare(right.name)),
    classOptions: content.classes.map((definition) => ({
      id: definition.id,
      name: definition.name.zhCN,
    })),
    roleOptions: content.roles.map((definition) => ({
      id: definition.id,
      name: definition.name.zhCN,
    })),
  };
}

export function getItemStatLines(stats: ClassicItemStats): ItemStatLineView[] {
  const lines: ItemStatLineView[] = [];
  const appendGroup = (group: Record<string, number> | undefined, prefix = ""): void => {
    if (!group) return;
    for (const [field, numericValue] of Object.entries(group)) {
      const id = `${prefix}${field}`;
      const label =
        STAT_LABELS[id] ??
        STAT_LABELS[field] ??
        (id.endsWith("HitPercent") ? "命中" : id.endsWith("CriticalStrikePercent") ? "暴击" : id);
      const percent = PERCENT_FIELDS.has(id) || field.endsWith("Percent");
      lines.push({
        id,
        label,
        value: `${numericValue >= 0 ? "+" : ""}${numericValue}${percent ? "%" : ""}`,
        numericValue,
      });
    }
  };
  appendGroup(stats.primary as Record<string, number> | undefined);
  appendGroup(stats.defense as Record<string, number> | undefined);
  appendGroup(
    stats.physical
      ? {
          ...(stats.physical.attackPowerPoints === undefined
            ? {}
            : { attackPowerPoints: stats.physical.attackPowerPoints }),
          ...(stats.physical.rangedAttackPowerPoints === undefined
            ? {}
            : { rangedAttackPowerPoints: stats.physical.rangedAttackPowerPoints }),
          ...(stats.physical.hitPercent === undefined
            ? {}
            : { physicalHitPercent: stats.physical.hitPercent }),
          ...(stats.physical.criticalStrikePercent === undefined
            ? {}
            : { physicalCriticalStrikePercent: stats.physical.criticalStrikePercent }),
        }
      : undefined,
  );
  appendGroup(
    stats.spell
      ? {
          ...(stats.spell.spellPowerPoints === undefined
            ? {}
            : { spellPowerPoints: stats.spell.spellPowerPoints }),
          ...(stats.spell.healingPowerPoints === undefined
            ? {}
            : { healingPowerPoints: stats.spell.healingPowerPoints }),
          ...(stats.spell.arcaneSpellPowerPoints === undefined
            ? {}
            : { arcaneSpellPowerPoints: stats.spell.arcaneSpellPowerPoints }),
          ...(stats.spell.fireSpellPowerPoints === undefined
            ? {}
            : { fireSpellPowerPoints: stats.spell.fireSpellPowerPoints }),
          ...(stats.spell.frostSpellPowerPoints === undefined
            ? {}
            : { frostSpellPowerPoints: stats.spell.frostSpellPowerPoints }),
          ...(stats.spell.natureSpellPowerPoints === undefined
            ? {}
            : { natureSpellPowerPoints: stats.spell.natureSpellPowerPoints }),
          ...(stats.spell.shadowSpellPowerPoints === undefined
            ? {}
            : { shadowSpellPowerPoints: stats.spell.shadowSpellPowerPoints }),
          ...(stats.spell.healthRegenPer5Seconds === undefined
            ? {}
            : { healthRegenPer5Seconds: stats.spell.healthRegenPer5Seconds }),
          ...(stats.spell.manaRegenPer5Seconds === undefined
            ? {}
            : { manaRegenPer5Seconds: stats.spell.manaRegenPer5Seconds }),
          ...(stats.spell.hitPercent === undefined
            ? {}
            : { spellHitPercent: stats.spell.hitPercent }),
          ...(stats.spell.criticalStrikePercent === undefined
            ? {}
            : { spellCriticalStrikePercent: stats.spell.criticalStrikePercent }),
        }
      : undefined,
  );
  appendGroup(stats.resistances as Record<string, number> | undefined);
  if (stats.weapon) {
    lines.push({
      id: "weaponDamage",
      label: "武器伤害",
      value: `${stats.weapon.damage.minimumPoints}–${stats.weapon.damage.maximumPoints}`,
    });
    lines.push({
      id: "weaponSpeed",
      label: "攻击速度",
      value: stats.weapon.speedSeconds.toFixed(2),
    });
  }
  return lines;
}

function acquisitionSource(instance: ItemInstance, content: ContentRegistry): string {
  switch (instance.source.type) {
    case "starter":
      return "加入公会时携带";
    case "encounter": {
      const dungeon = content.dungeonById.get(instance.source.dungeonId)?.name.zhCN;
      const encounter = content.encounterById.get(instance.source.encounterId)?.name.zhCN;
      return `${dungeon ?? "未知副本"} · ${encounter ?? "未知首领"}`;
    }
    case "crafting":
      return `专业制造 · 配方 ${instance.source.recipeId}`;
    case "grant":
      return `系统发放 · ${instance.source.reasonId}`;
    case "quest":
      return `成员任务 · ${content.questById.get(instance.source.questId)?.name.zhCN ?? instance.source.questId}`;
  }
}

export function getEquippedItemView(
  instance: ItemInstance,
  content: ContentRegistry,
): EquippedItemView {
  const resolved = resolveItemInstance(instance, content);
  const definition = resolved.definition;
  const requirements: string[] = [`需要等级 ${definition.requiredLevel ?? 1}`];
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
    instanceId: instance.id,
    definitionId: definition.id,
    name: definition.name.zhCN,
    quality: definition.quality,
    itemLevel: definition.itemLevel,
    requiredLevel: definition.requiredLevel ?? 1,
    ...(definition.armorType ? { armorType: definition.armorType } : {}),
    twoHanded: definition.twoHanded,
    ...(definition.icon.kind === "database"
      ? {
          iconUrl: `https://wow.zamimg.com/images/wow/icons/large/${encodeURIComponent(definition.icon.name)}.jpg`,
        }
      : {}),
    description: definition.description.zhCN,
    stats: getItemStatLines(definition.stats),
    ...(resolved.randomSuffix && resolved.suffixTier
      ? {
          randomSuffix: {
            name: resolved.randomSuffix.nameTemplate.zhCN.replace("{base}", "").trim(),
            stats: getItemStatLines(resolved.suffixTier.stats),
          },
        }
      : {}),
    acquisitionSource: acquisitionSource(instance, content),
    statsSource:
      definition.statsSource.provider === "wowhead-classic"
        ? `Wowhead Classic · ${definition.statsSource.verifiedAt}`
        : `游戏设计数据 · ${definition.statsSource.verifiedAt}`,
    requirements,
  };
}

function aggregateStats(equipment: readonly EquipmentSlotView[]): ItemStatLineView[] {
  const totals = new Map<string, { label: string; value: number; percent: boolean }>();
  for (const slot of equipment) {
    for (const line of slot.item?.stats ?? []) {
      if (line.numericValue === undefined) continue;
      const entry = totals.get(line.id) ?? {
        label: line.label,
        value: 0,
        percent: line.value.endsWith("%"),
      };
      entry.value += line.numericValue;
      totals.set(line.id, entry);
    }
  }
  return [...totals.entries()]
    .map(([id, entry]) => ({
      id,
      label: entry.label,
      value: `${entry.value >= 0 ? "+" : ""}${Math.round(entry.value * 100) / 100}${entry.percent ? "%" : ""}`,
      numericValue: entry.value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function getMemberDetailView(
  state: GameState,
  content: ContentRegistry,
  memberId: MemberId,
): MemberDetailView | null {
  const member = state.members[memberId];
  if (!member) return null;
  const base = directoryEntry(state, content, member);
  const spec = content.specById.get(member.progression.specId)!;
  const formula = content.combatProfileById.get(spec.combatProfileId)!;
  const profile = buildCombatProfile(
    { member, content, itemInstances: state.itemInstances },
    formula,
  );
  const personality = content.personalityById.get(member.identity.personalityId)!;
  const equipment = EQUIPMENT_SLOTS.map((slot): EquipmentSlotView => {
    const instanceId = member.equipment[slot];
    const instance = instanceId ? state.itemInstances[instanceId] : undefined;
    return {
      id: slot,
      name: EQUIPMENT_SLOT_NAMES[slot],
      ...(instance ? { item: getEquippedItemView(instance, content) } : {}),
    };
  });
  return {
    ...base,
    raceName: content.raceById.get(member.identity.raceId)?.name.zhCN ?? "未知种族",
    personalityBenefit: personality.benefit.zhCN,
    personalityDrawback: personality.drawback.zhCN,
    equipment,
    aggregateStats: aggregateStats(equipment),
    capabilities: profile.capabilities,
    contributions: profile.diagnostics
      .filter(
        (entry) =>
          entry.amount !== 0 &&
          ["linear-weight", "strategy", "modifier", "derived-stat"].includes(entry.stage),
      )
      .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount))
      .slice(0, 16)
      .map((entry, index) => ({
        id: `${entry.stage}:${entry.sourceId}:${index}`,
        stage: entry.stage,
        ...(entry.capability ? { capability: entry.capability } : {}),
        amount: entry.amount,
        description: entry.description,
      })),
    availableSpecs: content.specs
      .filter((candidate) => candidate.classId === member.identity.classId)
      .map((candidate) => ({
        id: candidate.id,
        name: candidate.name.zhCN,
        role: candidate.role,
        roleName: content.roleById.get(candidate.role)?.name.zhCN ?? candidate.role,
        current: candidate.id === member.progression.specId,
      })),
    formulaVersion: profile.formulaVersion,
    ...(member.activeActivityId ? { activeActivityId: member.activeActivityId } : {}),
    canManage: member.activeActivityId === undefined,
    canAffordRespec: state.guild.funds >= RESPEC_COST,
    respecCost: RESPEC_COST,
  };
}
