import type { ContentRegistry } from "../../content/registry";
import type { GameCommand } from "../services/game-session";
import {
  addProfessionToMember,
  removeProfessionFromMember,
} from "../../domain/profession/profession-rules";
import type { MemberId, ProfessionDefinitionId } from "../../domain/shared/ids";
import { recordEconomyEvent } from "../../domain/economy/economy-ledger";

export function learnProfessionCommand(
  content: ContentRegistry,
  memberId: MemberId,
  professionId: ProfessionDefinitionId,
): GameCommand<void> {
  return {
    type: "learn-profession",
    execute(state) {
      const member = state.members[memberId];
      if (!member) throw new Error("找不到该成员。");
      const profession = content.professionById.get(professionId);
      if (!profession || profession.status !== "available") throw new Error("该专业尚未开放。");
      const tier = profession.trainingTiers[0];
      if (!tier || tier.availability !== "available") throw new Error("该专业暂无可用训练等级。");
      if (state.guild.funds < tier.cost) throw new Error(`公会资金不足，需要 ${tier.cost} G。`);
      const primaryProfessionIds = content.professions
        .filter((entry) => entry.kind === "primary")
        .map((entry) => entry.id);
      addProfessionToMember(
        member,
        professionId,
        1,
        tier.rank,
        profession.kind === "primary" ? 2 : Number.MAX_SAFE_INTEGER,
        profession.kind === "primary",
        primaryProfessionIds,
      );
      state.guild.funds -= tier.cost;
      recordEconomyEvent(state, {
        kind: "gold-expense",
        source: "profession-learning",
        amount: tier.cost,
      });
    },
  };
}

export function abandonProfessionCommand(
  memberId: MemberId,
  professionId: ProfessionDefinitionId,
): GameCommand<void> {
  return {
    type: "abandon-profession",
    execute(state) {
      const member = state.members[memberId];
      if (!member) throw new Error("找不到该成员。");
      if (member.activeActivityId) throw new Error("活动中的成员不能放弃专业。");
      removeProfessionFromMember(member, professionId);
    },
  };
}
