import type { ContentRegistry } from "../../content/registry";
import type { GameCommand } from "../services/game-session";
import { ensureMemberProfessionState } from "../../domain/profession/profession-rules";
import type { MemberId, ProfessionDefinitionId } from "../../domain/shared/ids";
import { recordEconomyEvent } from "../../domain/economy/economy-ledger";

export function trainProfessionCommand(
  content: ContentRegistry,
  memberId: MemberId,
  professionId: ProfessionDefinitionId,
): GameCommand<void> {
  return {
    type: "train-profession",
    execute(state) {
      const member = state.members[memberId];
      if (!member) throw new Error("找不到该成员。");
      if (member.activeActivityId) throw new Error("活动中的成员不能训练专业。");
      const profession = content.professionById.get(professionId);
      if (!profession || profession.status !== "available") throw new Error("该专业尚未开放。");
      const current = ensureMemberProfessionState(member, professionId);
      const next = profession.trainingTiers.find((tier) => tier.rank === current.trainingRank + 1);
      if (!next || next.availability !== "available")
        throw new Error("该专业已经达到当前训练上限。");
      if (
        next.requiredMemberLevel !== undefined &&
        member.progression.level < next.requiredMemberLevel
      ) {
        throw new Error(`成员等级不足，需要 ${next.requiredMemberLevel} 级。`);
      }
      if (state.guild.funds < next.cost) throw new Error(`公会资金不足，需要 ${next.cost} G。`);
      current.trainingRank = next.rank;
      state.guild.funds -= next.cost;
      recordEconomyEvent(state, {
        kind: "gold-expense",
        source: "profession-training",
        amount: next.cost,
      });
    },
  };
}
