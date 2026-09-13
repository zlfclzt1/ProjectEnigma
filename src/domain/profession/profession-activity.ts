import type { ContentRegistry } from "../../content/registry";
import type { SkillGainRule, SkillRule } from "../../content/schemas/profession";
import type {
  ActivityHandler,
  ActivitySettlementResult,
  ActivityStartRequest,
} from "../activity/activity-handler";
import type { CraftingActivity, GatheringActivity } from "../activity/activity";
import type { GameState } from "../game-state";
import {
  addStackToGuildBank,
  availableStackCount,
  commitReservedStack,
  commitReservedEquipmentSlot,
  commitReservedOutputStack,
  releaseReservedEquipmentSlots,
  releaseReservedOutputStack,
  slotCapacityPolicy,
} from "../inventory/guild-bank-rules";
import {
  asBrandedId,
  type GatheringSiteId,
  type ItemDefinitionId,
  type RecipeId,
} from "../shared/ids";
import {
  ensureFacilityLevel,
  ensureTrainingRank,
  ensureMemberProfessionState,
  hasLearnedRecipe,
} from "./profession-rules";
import { ItemInstance } from "../equipment/item-instance";
import { SeededRandomSource } from "../../infrastructure/random/seeded-random-source";
import { recordAcquiredItem } from "../collection/item-collection";
import { recordEconomyEvent } from "../economy/economy-ledger";

export interface StartGatheringRequest extends ActivityStartRequest {
  readonly type: "gathering";
  readonly siteId: GatheringSiteId;
  readonly quantity: number;
}

export interface StartCraftingRequest extends ActivityStartRequest {
  readonly type: "crafting";
  readonly recipeId: RecipeId;
  readonly quantity: number;
}

function issue(code: string, message: string) {
  return { code, message };
}

function validQuantity(quantity: number, max: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= max;
}

function skillColor(
  skill: number,
  required: number,
): keyof Pick<SkillGainRule, "orange" | "yellow" | "green" | "gray"> {
  if (skill < required) return "gray";
  if (skill <= required) return "orange";
  if (skill <= required + 20) return "yellow";
  if (skill <= required + 40) return "green";
  return "gray";
}

function stackLimits(content: ContentRegistry): ReadonlyMap<ItemDefinitionId, number> {
  return new Map(content.items.map((item) => [item.id, item.stackLimit ?? 1]));
}

export function createGatheringActivityHandler(
  content: ContentRegistry,
): ActivityHandler<StartGatheringRequest, GatheringActivity> {
  return {
    type: "gathering",
    validateStart(context, request) {
      const site = content.gatheringSiteById.get(request.siteId);
      if (!site || site.status !== "available")
        return { ok: false, issues: [issue("site.not-found", "采集点不存在或尚未开放。")] };
      const member = context.state.members[request.participantIds[0]!];
      const issues = [];
      if (request.participantIds.length !== 1)
        issues.push(issue("participants.invalid", "采集活动必须由一名成员执行。"));
      if (!validQuantity(request.quantity, site.batchLimit))
        issues.push(issue("quantity.invalid", `采集批次必须为 1–${site.batchLimit}。`));
      if (!member) issues.push(issue("member.not-found", "找不到采集成员。"));
      else {
        const profession = ensureMemberProfessionState(member, site.professionId);
        if (site.requiredTrainingRank) {
          try {
            ensureTrainingRank(member, site.professionId, site.requiredTrainingRank);
          } catch (error) {
            if (error instanceof Error) issues.push(issue("training.low", error.message));
          }
        }
        if (profession.skill < site.requiredSkill)
          issues.push(issue("skill.low", "专业技能不足。"));
        ensureFacilityLevel(context.state, content, site.facilityId);
      }
      return issues.length ? { ok: false, issues } : { ok: true };
    },
    create(context, request) {
      const site = content.gatheringSiteById.get(request.siteId)!;
      const member = context.state.members[request.participantIds[0]!]!;
      const profession = ensureMemberProfessionState(member, site.professionId);
      const id = asBrandedId<"ActivityId">(context.ids.next("gathering"));
      return {
        id,
        type: "gathering",
        participantIds: [...request.participantIds],
        status: "active",
        createdAt: context.now,
        startedAt: context.now,
        nextSettlementAt: context.now + site.durationSeconds * request.quantity * 1000,
        seed: `${context.state.random.seed}:gathering:${id}:${context.random.next("seed")}`,
        contentVersion: context.state.contentVersion,
        professionDefinitionId: site.professionId,
        siteId: request.siteId,
        quantity: request.quantity,
        skillAtStart: profession.skill,
        outputSeed: `${id}:outputs`,
      };
    },
  };
}

export function createCraftingActivityHandler(
  content: ContentRegistry,
): ActivityHandler<StartCraftingRequest, CraftingActivity> {
  return {
    type: "crafting",
    validateStart(context, request) {
      const recipe = content.recipeById.get(request.recipeId);
      const member = context.state.members[request.participantIds[0]!];
      const issues = [];
      if (!recipe || recipe.status !== "available")
        issues.push(issue("recipe.not-found", "配方不存在或尚未开放。"));
      if (request.participantIds.length !== 1)
        issues.push(issue("participants.invalid", "制造活动必须由一名成员执行。"));
      if (recipe && !validQuantity(request.quantity, recipe.batchLimit))
        issues.push(issue("quantity.invalid", `制造批次必须为 1–${recipe.batchLimit}。`));
      if (!member) issues.push(issue("member.not-found", "找不到制造成员。"));
      if (recipe && member) {
        const profession = ensureMemberProfessionState(member, recipe.professionId);
        if (recipe.requiredTrainingRank) {
          try {
            ensureTrainingRank(member, recipe.professionId, recipe.requiredTrainingRank);
          } catch (error) {
            if (error instanceof Error) issues.push(issue("training.low", error.message));
          }
        }
        ensureFacilityLevel(context.state, content, recipe.facilityId);
        if (!hasLearnedRecipe(member, recipe.professionId, recipe.id))
          issues.push(issue("recipe.unlearned", "成员尚未学习该配方。"));
        if (profession.skill < recipe.requiredSkill)
          issues.push(issue("skill.low", "专业技能不足。"));
        for (const input of recipe.input)
          if (
            availableStackCount(context.state.guildBank, input.itemId) <
            input.quantityPerBatch * request.quantity
          )
            issues.push(issue("materials.insufficient", "制造材料不足。"));
      }
      return issues.length ? { ok: false, issues } : { ok: true };
    },
    create(context, request) {
      const recipe = content.recipeById.get(request.recipeId)!;
      const member = context.state.members[request.participantIds[0]!]!;
      const profession = ensureMemberProfessionState(member, recipe.professionId);
      const id = asBrandedId<"ActivityId">(context.ids.next("crafting"));
      return {
        id,
        type: "crafting",
        participantIds: [...request.participantIds],
        status: "active",
        createdAt: context.now,
        startedAt: context.now,
        nextSettlementAt: context.now + recipe.durationSeconds * request.quantity * 1000,
        seed: `${context.state.random.seed}:crafting:${id}:${context.random.next("seed")}`,
        contentVersion: context.state.contentVersion,
        professionDefinitionId: recipe.professionId,
        recipeId: request.recipeId,
        quantity: request.quantity,
        skillAtStart: profession.skill,
        inputReservations: recipe.input.map((input) => ({
          itemId: input.itemId,
          quantity: input.quantityPerBatch * request.quantity,
        })),
        outputSeed: `${id}:outputs`,
      };
    },
  };
}

function rollQuantity(range: { min: number; max: number }, random: () => number): number {
  return range.min + Math.floor(random() * (range.max - range.min + 1));
}

export function settleGatheringActivity(
  state: GameState,
  content: ContentRegistry,
  activity: GatheringActivity,
): ActivitySettlementResult {
  const site = content.gatheringSiteById.get(activity.siteId);
  const member = state.members[activity.participantIds[0]!];
  if (!site || !member || activity.status === "completed") return { changed: false };
  const random = new SeededRandomSource(activity.outputSeed ?? activity.seed);
  const capacity = slotCapacityPolicy({
    capacitySlots: state.guildBank.capacitySlots ?? Number.MAX_SAFE_INTEGER,
    stackLimitByItemId: stackLimits(content),
  });
  const quantity = activity.quantity ?? 1;
  const producedByItem = new Map<ItemDefinitionId, number>();
  for (let batch = 0; batch < quantity; batch += 1)
    for (const output of site.outputs)
      if (random.next("chance") <= output.chance) {
        const produced = rollQuantity(output.quantity, () => random.next("quantity"));
        if (activity.outputStackReservations?.some((entry) => entry.itemId === output.itemId)) {
          state.guildBank = commitReservedOutputStack(
            state.guildBank,
            output.itemId,
            produced,
            capacity,
          );
        } else {
          state.guildBank = addStackToGuildBank(state.guildBank, output.itemId, produced, capacity);
        }
        producedByItem.set(output.itemId, (producedByItem.get(output.itemId) ?? 0) + produced);
      }
  for (const reservation of activity.outputStackReservations ?? []) {
    const unused = reservation.quantity - (producedByItem.get(reservation.itemId) ?? 0);
    if (unused > 0)
      state.guildBank = releaseReservedOutputStack(state.guildBank, reservation.itemId, unused);
  }
  for (const [itemId, produced] of producedByItem) {
    recordEconomyEvent(state, {
      kind: "material-output",
      source: "gathering",
      itemId,
      quantity: produced,
      activityId: activity.id,
    });
  }
  const profession = member.professionStates?.[activity.professionDefinitionId];
  if (profession) {
    const gain: SkillRule =
      site.skillGain[skillColor(activity.skillAtStart ?? profession.skill, site.requiredSkill)];
    if (random.next("skill-chance") <= gain.chance)
      profession.skill += rollQuantity(gain, () => random.next("skill"));
  }
  return { changed: true };
}

export function settleCraftingActivity(
  state: GameState,
  content: ContentRegistry,
  activity: CraftingActivity,
  now: number,
): ActivitySettlementResult {
  const recipe = content.recipeById.get(activity.recipeId);
  const member = state.members[activity.participantIds[0]!];
  if (!recipe || !member || activity.status === "completed") return { changed: false };
  const reservations =
    activity.inputReservations ??
    recipe.input.map((input) => ({
      itemId: input.itemId,
      quantity: input.quantityPerBatch * activity.quantity,
    }));
  for (const input of reservations) {
    state.guildBank = commitReservedStack(state.guildBank, input.itemId, input.quantity);
    recordEconomyEvent(state, {
      kind: "material-input",
      source: "crafting",
      itemId: input.itemId,
      quantity: input.quantity,
      activityId: activity.id,
    });
  }
  const random = new SeededRandomSource(activity.outputSeed ?? activity.seed);
  const capacity = slotCapacityPolicy({
    capacitySlots: state.guildBank.capacitySlots ?? Number.MAX_SAFE_INTEGER,
    stackLimitByItemId: stackLimits(content),
  });
  const batches = activity.quantity ?? 1;
  let equipmentProduced = 0;
  const producedByItem = new Map<ItemDefinitionId, number>();
  for (let batch = 0; batch < batches; batch += 1)
    for (const output of recipe.output)
      if (random.next("chance") <= output.chance) {
        const range =
          output.type === "enchantment" || output.type === "consumable-effect"
            ? (output.charges ?? { min: 1, max: 1 })
            : output.type === "material-stack" || output.type === "item-instance"
              ? output.quantity
              : { min: 1, max: 1 };
        const quantity = rollQuantity(range, () => random.next("quantity"));
        if (output.type === "material-stack") {
          if (activity.outputStackReservations?.some((entry) => entry.itemId === output.itemId))
            state.guildBank = commitReservedOutputStack(
              state.guildBank,
              output.itemId,
              quantity,
              capacity,
            );
          else
            state.guildBank = addStackToGuildBank(
              state.guildBank,
              output.itemId,
              quantity,
              capacity,
            );
          producedByItem.set(output.itemId, (producedByItem.get(output.itemId) ?? 0) + quantity);
        } else if (output.type === "item-instance")
          for (let i = 0; i < quantity; i += 1) {
            const instance: ItemInstance = {
              id: asBrandedId<"ItemInstanceId">(`craft_${activity.id}_${batch}_${i}`),
              definitionId: output.itemId,
              bound: false,
              acquiredAt: now,
              source: { type: "crafting", activityId: activity.id, recipeId: activity.recipeId },
              enchantmentIds: [],
            };
            state.itemInstances[instance.id] = instance;
            recordAcquiredItem(state.collection, instance, content);
            if ((activity.outputEquipmentReservations ?? 0) > 0) {
              state.guildBank = commitReservedEquipmentSlot(state.guildBank);
            }
            state.guildBank = {
              ...state.guildBank,
              equipmentInstanceIds: [...state.guildBank.equipmentInstanceIds, instance.id],
            };
            equipmentProduced += 1;
          }
      }
  for (const [itemId, produced] of producedByItem) {
    recordEconomyEvent(state, {
      kind: "material-output",
      source: "crafting",
      itemId,
      quantity: produced,
      activityId: activity.id,
    });
  }
  if (equipmentProduced > 0) {
    recordEconomyEvent(state, {
      kind: "material-output",
      source: "crafting-equipment",
      quantity: equipmentProduced,
      activityId: activity.id,
    });
  }
  const reserved = activity.outputEquipmentReservations ?? 0;
  if (reserved > equipmentProduced) {
    state.guildBank = releaseReservedEquipmentSlots(state.guildBank, reserved - equipmentProduced);
  }
  for (const reservation of activity.outputStackReservations ?? []) {
    const unused = reservation.quantity - (producedByItem.get(reservation.itemId) ?? 0);
    if (unused > 0)
      state.guildBank = releaseReservedOutputStack(state.guildBank, reservation.itemId, unused);
  }
  const profession = member.professionStates?.[activity.professionDefinitionId];
  if (profession) {
    const gain: SkillRule =
      recipe.skillGain[skillColor(activity.skillAtStart ?? profession.skill, recipe.requiredSkill)];
    if (random.next("skill-chance") <= gain.chance)
      profession.skill += rollQuantity(gain, () => random.next("skill"));
  }
  return { changed: true };
}
