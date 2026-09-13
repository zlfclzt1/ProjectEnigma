import type { Clock } from "../ports/clock";
import type { GameCommand } from "../services/game-session";
import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import type { GuildSupplyPlan, GuildSupplyPlanEntry } from "../../domain/guild/supply-plan";
import {
  assertUniqueGuildSupplyPlanName,
  MAX_GUILD_SUPPLY_PLANS,
  normalizeGuildSupplyPlanName,
  validateGuildSupplyPlanEntries,
} from "../../domain/guild/supply-plan";
import { asBrandedId, type SupplyPlanId } from "../../domain/shared/ids";
import { LocalIdGenerator } from "../../infrastructure/ids/local-id-generator";

function savePlan(
  draft: GameState,
  content: ContentRegistry,
  clock: Clock,
  name: string,
  entries: readonly GuildSupplyPlanEntry[],
  id?: SupplyPlanId,
): GuildSupplyPlan {
  draft.guild.supplyPlans ??= {};
  const normalizedName = normalizeGuildSupplyPlanName(name);
  assertUniqueGuildSupplyPlanName(draft.guild.supplyPlans, normalizedName, id);
  const normalizedEntries = validateGuildSupplyPlanEntries(content, entries);
  const now = clock.now();
  if (id) {
    const current = draft.guild.supplyPlans[id];
    if (!current) throw new Error("自定义补给方案不存在。");
    current.name = normalizedName;
    current.entries = normalizedEntries;
    current.updatedAt = now;
    return structuredClone(current);
  }
  if (Object.keys(draft.guild.supplyPlans).length >= MAX_GUILD_SUPPLY_PLANS) {
    throw new Error(`最多只能保存 ${MAX_GUILD_SUPPLY_PLANS} 个自定义补给方案。`);
  }
  const ids = new LocalIdGenerator(draft.ids);
  const plan: GuildSupplyPlan = {
    id: asBrandedId<"SupplyPlanId">(ids.next("supply-plan")),
    name: normalizedName,
    entries: normalizedEntries,
    createdAt: now,
    updatedAt: now,
  };
  draft.guild.supplyPlans[plan.id] = plan;
  draft.ids = ids.snapshot();
  return structuredClone(plan);
}

export function createSupplyPlanCommand(
  content: ContentRegistry,
  clock: Clock,
  name: string,
  entries: readonly GuildSupplyPlanEntry[],
): GameCommand<GuildSupplyPlan> {
  return {
    type: "create-supply-plan",
    execute: (draft) => savePlan(draft, content, clock, name, entries),
  };
}

export function updateSupplyPlanCommand(
  content: ContentRegistry,
  clock: Clock,
  id: SupplyPlanId,
  name: string,
  entries: readonly GuildSupplyPlanEntry[],
): GameCommand<GuildSupplyPlan> {
  return {
    type: "update-supply-plan",
    execute: (draft) => savePlan(draft, content, clock, name, entries, id),
  };
}

export function duplicateSupplyPlanCommand(
  content: ContentRegistry,
  clock: Clock,
  id: SupplyPlanId,
  name: string,
): GameCommand<GuildSupplyPlan> {
  return {
    type: "duplicate-supply-plan",
    execute(draft) {
      const source = draft.guild.supplyPlans?.[id];
      if (!source) throw new Error("自定义补给方案不存在。");
      return savePlan(draft, content, clock, name, source.entries);
    },
  };
}

export function deleteSupplyPlanCommand(id: SupplyPlanId): GameCommand<boolean> {
  return {
    type: "delete-supply-plan",
    execute(draft) {
      if (!draft.guild.supplyPlans?.[id]) return false;
      delete draft.guild.supplyPlans[id];
      return true;
    },
  };
}
