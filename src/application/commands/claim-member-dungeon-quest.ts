import type { Clock } from "../ports/clock";
import type { ContentRegistry } from "../../content/registry";
import { recordAcquiredItem } from "../../domain/collection/item-collection";
import { equipItem } from "../../domain/equipment/equipment";
import { equipmentSellValue } from "../../domain/equipment/item-value";
import { resolveItemInstance } from "../../domain/equipment/resolve-item-instance";
import { claimMemberQuest } from "../../domain/member/member-quest-state";
import type { GameState } from "../../domain/game-state";
import type { ItemInstance } from "../../domain/equipment/item-instance";
import type { ItemDefinitionId, ItemInstanceId, MemberId, QuestId } from "../../domain/shared/ids";
import { LocalIdGenerator } from "../../infrastructure/ids/local-id-generator";
import type { GameCommand } from "../services/game-session";

export interface ClaimMemberDungeonQuestResult {
  readonly memberId: MemberId;
  readonly questId: QuestId;
  readonly itemInstanceId: ItemInstanceId;
  readonly saleProceeds: number;
  readonly experienceGained: number;
  readonly fundsGained: number;
}

export function claimMemberDungeonQuestCommand(
  dependencies: { readonly content: ContentRegistry; readonly clock: Clock },
  memberId: MemberId,
  questId: QuestId,
  itemDefinitionId: ItemDefinitionId,
): GameCommand<ClaimMemberDungeonQuestResult> {
  return {
    type: "claim-member-dungeon-quest",
    execute(draft) {
      const member = draft.members[memberId];
      if (!member) throw new Error("成员不存在。");
      const quest = dependencies.content.questById.get(questId);
      if (!quest) throw new Error("副本任务不存在。");
      const progress = member.quests.entries[questId];
      if (!progress || progress.status !== "completed") {
        throw new Error("任务尚未完成或奖励已经领取。");
      }
      if (!quest.rewards.itemChoiceIds.includes(itemDefinitionId)) {
        throw new Error("只能从该任务提供的装备奖励中选择一件。");
      }
      const definition = dependencies.content.itemById.get(itemDefinitionId);
      if (!definition) throw new Error("任务奖励装备不存在。");

      const ids = new LocalIdGenerator(draft.ids);
      const instance: ItemInstance = {
        id: ids.next("quest-item") as ItemInstanceId,
        definitionId: itemDefinitionId,
        ownerMemberId: memberId,
        bound: true,
        acquiredAt: dependencies.clock.now(),
        source: { type: "quest", questId, memberId },
        enchantmentIds: [],
      };
      let equipped;
      try {
        equipped = equipItem(member, instance, {
          content: dependencies.content,
          itemInstances: draft.itemInstances,
        });
      } catch {
        throw new Error("该成员无法装备所选任务奖励。");
      }

      let saleProceeds = 0;
      for (const displacedId of equipped.displacedItemInstanceIds) {
        const displaced = draft.itemInstances[displacedId];
        if (!displaced) throw new Error("被替换的装备数据不完整。");
        saleProceeds += equipmentSellValue(
          resolveItemInstance(displaced, dependencies.content).definition,
        );
        delete draft.itemInstances[displacedId];
      }
      const experienceGained = applyQuestExperience(member, quest.rewards.experienceFraction);
      claimMemberQuest(member.quests, questId, dependencies.clock.now());
      draft.members[memberId] = equipped.member;
      draft.itemInstances[instance.id] = equipped.equippedInstance;
      recordAcquiredItem(draft.collection, instance, dependencies.content);
      draft.guild.funds += quest.rewards.funds + saleProceeds;
      draft.ids = ids.snapshot();
      return {
        memberId,
        questId,
        itemInstanceId: instance.id,
        saleProceeds,
        experienceGained,
        fundsGained: quest.rewards.funds,
      };
    },
  };
}

function applyQuestExperience(member: GameState["members"][MemberId], fraction: number): number {
  if (member.progression.level >= 45 || fraction <= 0) return 0;
  const before = member.progression.level + member.progression.experience;
  let experience = member.progression.experience + fraction;
  while (experience >= 1 && member.progression.level < 45) {
    member.progression.level += 1;
    experience -= 1;
  }
  member.progression.experience = member.progression.level >= 45 ? 0 : experience;
  return member.progression.level + member.progression.experience - before;
}
