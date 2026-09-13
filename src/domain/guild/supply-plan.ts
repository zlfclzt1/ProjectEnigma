import type { ContentRegistry } from "../../content/registry";
import type { ItemDefinitionId, SupplyPlanId, ConsumableEffectId } from "../shared/ids";

export const MAX_GUILD_SUPPLY_PLANS = 20;
export const MAX_GUILD_SUPPLY_PLAN_ENTRIES = 12;
export const MAX_GUILD_SUPPLY_PLAN_NAME_LENGTH = 40;

export interface GuildSupplyPlanEntry {
  itemId: ItemDefinitionId;
  quantityPerRun: number;
  effectId?: ConsumableEffectId;
}

export interface GuildSupplyPlan {
  readonly id: SupplyPlanId;
  name: string;
  entries: GuildSupplyPlanEntry[];
  readonly createdAt: number;
  updatedAt: number;
}

export function normalizeGuildSupplyPlanName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new Error("补给方案名称不能为空。");
  if ([...normalized].length > MAX_GUILD_SUPPLY_PLAN_NAME_LENGTH) {
    throw new Error(`补给方案名称不能超过 ${MAX_GUILD_SUPPLY_PLAN_NAME_LENGTH} 个字符。`);
  }
  return normalized;
}

export function validateGuildSupplyPlanEntries(
  content: ContentRegistry,
  entries: readonly GuildSupplyPlanEntry[],
): GuildSupplyPlanEntry[] {
  if (entries.length < 1) throw new Error("补给方案至少需要 1 种物品。");
  if (entries.length > MAX_GUILD_SUPPLY_PLAN_ENTRIES) {
    throw new Error(`补给方案最多配置 ${MAX_GUILD_SUPPLY_PLAN_ENTRIES} 种物品。`);
  }
  const itemIds = new Set<ItemDefinitionId>();
  return entries.map((entry) => {
    if (itemIds.has(entry.itemId)) throw new Error("补给方案不能重复配置同一物品。");
    itemIds.add(entry.itemId);
    if (!Number.isInteger(entry.quantityPerRun) || entry.quantityPerRun <= 0) {
      throw new Error("每轮补给数量必须是正整数。");
    }
    const item = content.itemById.get(entry.itemId);
    if (!item) throw new Error(`补给物品不存在：${entry.itemId}。`);
    const kind = item.kind ?? "equipment";
    if (kind !== "material" && kind !== "consumable") {
      throw new Error(`只有材料或消耗品可以用于远征补给：${item.name.zhCN}。`);
    }
    if (entry.effectId && !content.consumableEffectById.has(entry.effectId)) {
      throw new Error(`补给效果不存在：${entry.effectId}。`);
    }
    return { ...entry };
  });
}

export function assertUniqueGuildSupplyPlanName(
  plans: Readonly<Record<SupplyPlanId, GuildSupplyPlan>>,
  name: string,
  excludingId?: SupplyPlanId,
): void {
  const duplicate = Object.values(plans).some(
    (plan) =>
      plan.id !== excludingId &&
      plan.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0,
  );
  if (duplicate) throw new Error("补给方案名称不能重复。");
}
