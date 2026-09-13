import type { ContentRegistry } from "../../content/registry";
import type { GameCommand } from "../services/game-session";
import type { ProfessionFacilityId } from "../../domain/shared/ids";
import { recordEconomyEvent } from "../../domain/economy/economy-ledger";

export function upgradeProfessionFacilityCommand(
  content: ContentRegistry,
  facilityId: ProfessionFacilityId,
): GameCommand<{ facilityId: ProfessionFacilityId; level: number; remainingFunds: number }> {
  return {
    type: "upgrade-profession-facility",
    execute(state) {
      const facility = content.professionFacilityById.get(facilityId);
      if (!facility || facility.status !== "available") throw new Error("专业设施尚未开放。");
      const currentLevel = state.guild.professionFacilities?.[facilityId]?.level ?? 0;
      const next = facility.levels.find((entry) => entry.level === currentLevel + 1);
      if (!next) throw new Error("该专业设施已经达到当前内容上限。");
      if (state.guild.funds < next.cost) throw new Error(`公会资金不足，需要 ${next.cost} G。`);
      state.guild.professionFacilities ??= {};
      state.guild.professionFacilities[facilityId] = { facilityId, level: next.level };
      state.guild.funds -= next.cost;
      recordEconomyEvent(state, {
        kind: "gold-expense",
        source: "profession-facility-upgrade",
        amount: next.cost,
      });
      return { facilityId, level: next.level, remainingFunds: state.guild.funds };
    },
  };
}
