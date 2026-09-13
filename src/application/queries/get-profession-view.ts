import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import type { ItemInstanceId, ProfessionDefinitionId, MemberId } from "../../domain/shared/ids";
import { guildBankSlotUsage } from "../../domain/inventory/guild-bank-rules";
import { resolveItemInstance } from "../../domain/equipment/resolve-item-instance";
import type { EconomyLedgerEntry } from "../../domain/economy/economy-ledger";

export interface ProfessionMemberView {
  readonly id: MemberId;
  readonly name: string;
  readonly active: boolean;
  readonly professions: readonly {
    readonly id: ProfessionDefinitionId;
    readonly name: string;
    readonly skill: number;
    readonly trainingRank: number;
    readonly nextTrainingRank?: number;
    readonly nextTrainingCost?: number;
    readonly learnedRecipeIds: readonly string[];
  }[];
}

export interface ProfessionMaterialView {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly quantity: number;
  readonly availableQuantity: number;
  readonly stackLimit: number;
  readonly reservedInputQuantity: number;
  readonly reservedOutputQuantity: number;
}

export interface GuildBankEquipmentView {
  readonly id: ItemInstanceId;
  readonly name: string;
  readonly itemLevel: number;
  readonly quality: string;
}

export interface ProfessionRecipeView {
  readonly id: string;
  readonly name: string;
  readonly professionId: ProfessionDefinitionId;
  readonly status: "available" | "preview" | "unobtainable";
  readonly learnedByMemberIds: readonly MemberId[];
  readonly requiredSkill: number;
  readonly durationSeconds: number;
}

export interface ProfessionView {
  readonly members: readonly ProfessionMemberView[];
  readonly materials: readonly ProfessionMaterialView[];
  readonly recipes: readonly ProfessionRecipeView[];
  readonly facilities: readonly {
    readonly id: string;
    readonly name: string;
    readonly professionId: ProfessionDefinitionId;
    readonly level: number;
    readonly nextLevel?: number;
    readonly nextCost?: number;
  }[];
  readonly bank: {
    readonly usedSlots: number;
    readonly capacitySlots: number;
    readonly reservedEquipmentSlots: number;
    readonly equipment: readonly GuildBankEquipmentView[];
  };
  readonly economy: {
    readonly activeProfessionActivities: number;
    readonly completedProfessionActivities: number;
    readonly gatheringActivities: number;
    readonly craftingActivities: number;
    readonly craftedEquipmentInstances: number;
    readonly supplyAllocated: number;
    readonly supplyConsumed: number;
    readonly supplyReleased: number;
    readonly guildFunds: number;
    readonly goldIncome: number;
    readonly goldExpense: number;
    readonly recentLedger: readonly EconomyLedgerEntry[];
  };
}

export function getProfessionView(state: GameState, content: ContentRegistry): ProfessionView {
  const members = Object.values(state.members).map((member) => ({
    id: member.id,
    name: member.identity.name,
    active: member.activeActivityId !== undefined,
    professions: Object.values(member.professionStates ?? {})
      .filter(
        (profession): profession is NonNullable<typeof profession> => profession !== undefined,
      )
      .map((profession) => ({
        id: profession.professionId,
        name:
          content.professionById.get(profession.professionId)?.name.zhCN ?? profession.professionId,
        skill: profession.skill,
        trainingRank: profession.trainingRank,
        ...(() => {
          const next = content.professionById
            .get(profession.professionId)
            ?.trainingTiers.find((tier) => tier.rank === profession.trainingRank + 1);
          return next ? { nextTrainingRank: next.rank, nextTrainingCost: next.cost } : {};
        })(),
        learnedRecipeIds: [...profession.learnedRecipeIds],
      })),
  }));
  const materials = content.items
    .filter((item) => item.kind === "material" || item.kind === "consumable")
    .map((item) => ({
      id: item.id,
      name: item.name.zhCN,
      kind: item.kind ?? "equipment",
      quantity: state.guildBank.stackCounts[item.id] ?? 0,
      availableQuantity:
        (state.guildBank.stackCounts[item.id] ?? 0) -
        (state.guildBank.reservedStackCounts?.[item.id] ?? 0),
      stackLimit: item.stackLimit ?? 1,
      reservedInputQuantity: state.guildBank.reservedStackCounts?.[item.id] ?? 0,
      reservedOutputQuantity: state.guildBank.reservedOutputStackCounts?.[item.id] ?? 0,
    }))
    .filter((item) => item.quantity > 0 || item.availableQuantity > 0);
  const recipes = content.recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name.zhCN,
    professionId: recipe.professionId,
    status: recipe.status,
    learnedByMemberIds: members
      .filter((member) =>
        member.professions.some((profession) => profession.learnedRecipeIds.includes(recipe.id)),
      )
      .map((member) => member.id),
    requiredSkill: recipe.requiredSkill,
    durationSeconds: recipe.durationSeconds,
  }));
  const facilities = content.professionFacilities.map((facility) => {
    const level = state.guild.professionFacilities?.[facility.id]?.level ?? 0;
    const next = facility.levels.find((entry) => entry.level === level + 1);
    return {
      id: facility.id,
      name: content.professionById.get(facility.professionId)?.name.zhCN ?? facility.id,
      professionId: facility.professionId,
      level,
      ...(next ? { nextLevel: next.level, nextCost: next.cost } : {}),
    };
  });
  const stackLimitByItemId = new Map(content.items.map((item) => [item.id, item.stackLimit ?? 1]));
  return {
    members,
    materials,
    recipes,
    facilities,
    bank: {
      usedSlots: guildBankSlotUsage(state.guildBank, stackLimitByItemId),
      capacitySlots: state.guildBank.capacitySlots ?? 100,
      reservedEquipmentSlots: state.guildBank.reservedEquipmentSlots ?? 0,
      equipment: state.guildBank.equipmentInstanceIds.flatMap((id) => {
        const instance = state.itemInstances[id];
        if (!instance) return [];
        const definition = resolveItemInstance(instance, content).definition;
        return [
          {
            id,
            name: definition.name.zhCN,
            itemLevel: definition.itemLevel,
            quality: definition.quality,
          },
        ];
      }),
    },
    economy: {
      activeProfessionActivities: Object.values(state.activities).filter(
        (activity) =>
          (activity.type === "gathering" || activity.type === "crafting") &&
          (activity.status === "active" || activity.status === "scheduled"),
      ).length,
      completedProfessionActivities: Object.values(state.activities).filter(
        (activity) =>
          (activity.type === "gathering" || activity.type === "crafting") &&
          activity.status === "completed",
      ).length,
      gatheringActivities: Object.values(state.activities).filter(
        (activity) => activity.type === "gathering",
      ).length,
      craftingActivities: Object.values(state.activities).filter(
        (activity) => activity.type === "crafting",
      ).length,
      craftedEquipmentInstances: Object.values(state.itemInstances).filter(
        (instance) => instance.source.type === "crafting",
      ).length,
      supplyAllocated: Object.values(state.activities).reduce(
        (sum, activity) =>
          sum +
          (activity.type === "expedition"
            ? (activity.supplySnapshot?.entries.reduce(
                (entrySum, entry) => entrySum + entry.allocatedQuantity,
                0,
              ) ?? 0)
            : 0),
        0,
      ),
      supplyConsumed: Object.values(state.activities).reduce(
        (sum, activity) =>
          sum +
          (activity.type === "expedition"
            ? (activity.supplySnapshot?.entries.reduce(
                (entrySum, entry) => entrySum + entry.consumedQuantity,
                0,
              ) ?? 0)
            : 0),
        0,
      ),
      supplyReleased: Object.values(state.activities).reduce(
        (sum, activity) =>
          sum +
          (activity.type === "expedition"
            ? (activity.supplySnapshot?.entries.reduce(
                (entrySum, entry) => entrySum + (entry.releasedQuantity ?? 0),
                0,
              ) ?? 0)
            : 0),
        0,
      ),
      guildFunds: state.guild.funds,
      goldIncome: (state.economyLedger ?? [])
        .filter((entry) => entry.kind === "gold-income")
        .reduce((sum, entry) => sum + (entry.amount ?? 0), 0),
      goldExpense: (state.economyLedger ?? [])
        .filter((entry) => entry.kind === "gold-expense")
        .reduce((sum, entry) => sum + (entry.amount ?? 0), 0),
      recentLedger: (state.economyLedger ?? []).slice(-20).reverse(),
    },
  };
}
