import type { Clock } from "../ports/clock";
import type { GameCommand } from "../services/game-session";
import type { ContentRegistry } from "../../content/registry";
import type { GatheringActivity, CraftingActivity } from "../../domain/activity/activity";
import { ActivityRegistry } from "../../domain/activity/activity-registry";
import { ActivityScheduler } from "../../domain/activity/activity-scheduler";
import { LocalIdGenerator } from "../../infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../infrastructure/random/seeded-random-source";
import {
  createCraftingActivityHandler,
  createGatheringActivityHandler,
  type StartCraftingRequest,
  type StartGatheringRequest,
} from "../../domain/profession/profession-activity";
import {
  addStackToGuildBank,
  removeStackFromGuildBank,
  reserveStackFromGuildBank,
  reserveEquipmentSlots,
  reserveOutputStack,
  slotCapacityPolicy,
} from "../../domain/inventory/guild-bank-rules";

export function startGatheringCommand(
  dependencies: { readonly content: ContentRegistry; readonly clock: Clock },
  request: Omit<StartGatheringRequest, "type">,
): GameCommand<GatheringActivity> {
  return {
    type: "start-gathering",
    execute(draft) {
      const ids = new LocalIdGenerator(draft.ids);
      const random = new SeededRandomSource(draft.random);
      const registry = new ActivityRegistry();
      registry.register(createGatheringActivityHandler(dependencies.content));
      const result = new ActivityScheduler(registry).start<
        StartGatheringRequest,
        GatheringActivity
      >(draft, { ...request, type: "gathering" }, dependencies.clock.now(), { ids, random });
      if (result.status === "rejected")
        throw new Error(result.issues.map((i) => i.message).join(" "));
      const site = dependencies.content.gatheringSiteById.get(request.siteId)!;
      const capacity = slotCapacityPolicy({
        capacitySlots: draft.guildBank.capacitySlots ?? Number.MAX_SAFE_INTEGER,
        stackLimitByItemId: new Map(
          dependencies.content.items.map((item) => [item.id, item.stackLimit ?? 1]),
        ),
      });
      let projected = draft.guildBank;
      for (const output of site.outputs) {
        if (output.guaranteed || output.chance > 0) {
          projected = addStackToGuildBank(
            projected,
            output.itemId,
            output.quantity.max * request.quantity,
            capacity,
          );
        }
      }
      const outputStackReservations = site.outputs
        .filter((output) => output.chance > 0)
        .map((output) => ({
          itemId: output.itemId,
          quantity: output.quantity.max * request.quantity,
        }));
      for (const reservation of outputStackReservations) {
        draft.guildBank = reserveOutputStack(
          draft.guildBank,
          reservation.itemId,
          reservation.quantity,
          new Map(dependencies.content.items.map((item) => [item.id, item.stackLimit ?? 1])),
        );
      }
      if (outputStackReservations.length > 0) {
        result.activity.outputStackReservations = outputStackReservations;
        draft.activities[result.activity.id] = structuredClone(result.activity);
      }
      draft.ids = ids.snapshot();
      draft.random = random.snapshot();
      return result.activity;
    },
  };
}

export function startCraftingCommand(
  dependencies: { readonly content: ContentRegistry; readonly clock: Clock },
  request: Omit<StartCraftingRequest, "type">,
): GameCommand<CraftingActivity> {
  return {
    type: "start-crafting",
    execute(draft) {
      const ids = new LocalIdGenerator(draft.ids);
      const random = new SeededRandomSource(draft.random);
      const registry = new ActivityRegistry();
      registry.register(createCraftingActivityHandler(dependencies.content));
      const result = new ActivityScheduler(registry).start<StartCraftingRequest, CraftingActivity>(
        draft,
        { ...request, type: "crafting" },
        dependencies.clock.now(),
        { ids, random },
      );
      if (result.status === "rejected")
        throw new Error(result.issues.map((i) => i.message).join(" "));
      const recipe = dependencies.content.recipeById.get(request.recipeId)!;
      const capacity = slotCapacityPolicy({
        capacitySlots: draft.guildBank.capacitySlots ?? Number.MAX_SAFE_INTEGER,
        stackLimitByItemId: new Map(
          dependencies.content.items.map((item) => [item.id, item.stackLimit ?? 1]),
        ),
      });
      let projected = {
        ...draft.guildBank,
        stackCounts: { ...draft.guildBank.stackCounts },
        equipmentInstanceIds: [...draft.guildBank.equipmentInstanceIds],
      };
      for (const input of recipe.input) {
        projected = removeStackFromGuildBank(
          projected,
          input.itemId,
          input.quantityPerBatch * request.quantity,
        );
      }
      for (const output of recipe.output) {
        const maxQuantity =
          output.type === "material-stack" || output.type === "item-instance"
            ? output.quantity.max
            : output.type === "consumable-effect" || output.type === "enchantment"
              ? (output.charges?.max ?? 1)
              : 0;
        const total = maxQuantity * request.quantity;
        if (output.type === "material-stack")
          projected = addStackToGuildBank(projected, output.itemId, total, capacity);
        else if (output.type === "item-instance") {
          if (
            projected.equipmentInstanceIds.length + total >
            (projected.capacitySlots ?? Number.MAX_SAFE_INTEGER)
          )
            throw new Error("公会仓库没有足够空间容纳制造产物。");
          projected = {
            ...projected,
            equipmentInstanceIds: [
              ...projected.equipmentInstanceIds,
              ...Array.from(
                { length: total },
                () => "reserved" as (typeof projected.equipmentInstanceIds)[number],
              ),
            ],
          };
        }
      }
      const outputStackReservations = recipe.output.flatMap((output) =>
        output.type === "material-stack" && output.chance > 0
          ? [{ itemId: output.itemId, quantity: output.quantity.max * request.quantity }]
          : [],
      );
      const equipmentReservationCount = recipe.output.reduce((total, output) => {
        if (output.type !== "item-instance") return total;
        return total + output.quantity.max * request.quantity;
      }, 0);
      for (const reservation of result.activity.inputReservations ?? []) {
        draft.guildBank = reserveStackFromGuildBank(
          draft.guildBank,
          reservation.itemId,
          reservation.quantity,
        );
      }
      for (const reservation of outputStackReservations) {
        draft.guildBank = reserveOutputStack(
          draft.guildBank,
          reservation.itemId,
          reservation.quantity,
          new Map(dependencies.content.items.map((item) => [item.id, item.stackLimit ?? 1])),
        );
      }
      if (outputStackReservations.length > 0) {
        result.activity.outputStackReservations = outputStackReservations;
        draft.activities[result.activity.id] = structuredClone(result.activity);
      }
      if (equipmentReservationCount > 0) {
        draft.guildBank = reserveEquipmentSlots(
          draft.guildBank,
          equipmentReservationCount,
          new Map(dependencies.content.items.map((item) => [item.id, item.stackLimit ?? 1])),
        );
        result.activity.outputEquipmentReservations = equipmentReservationCount;
        draft.activities[result.activity.id] = structuredClone(result.activity);
      }
      draft.ids = ids.snapshot();
      draft.random = random.snapshot();
      return result.activity;
    },
  };
}
