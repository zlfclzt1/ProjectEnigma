import type { ContentRegistry } from "../../content/registry";
import {
  evaluateGuildUpgrade,
  getExpeditionRunCapacity,
  getMemberCapacity,
  getNextGuildUpgrade,
} from "../../domain/guild/guild-upgrade-rules";
import type { GuildUpgradeId } from "../../domain/shared/ids";
import type { GameCommand } from "../services/game-session";

export interface PurchaseGuildUpgradeResult {
  readonly upgradeId: GuildUpgradeId;
  readonly remainingFunds: number;
  readonly memberCapacity: number;
  readonly expeditionRunCapacity: number;
}

export function purchaseGuildUpgradeCommand(
  content: ContentRegistry,
  upgradeId: GuildUpgradeId,
): GameCommand<PurchaseGuildUpgradeResult> {
  return {
    type: "purchase-guild-upgrade",
    execute(draft) {
      const upgrade = content.guildUpgradeById.get(upgradeId);
      if (!upgrade) throw new Error("公会升级项目不存在。");
      if (draft.guild.purchasedUpgradeIds.includes(upgrade.id)) {
        throw new Error("这项公会升级已经购买。");
      }
      const next = getNextGuildUpgrade(draft, content, upgrade.trackId);
      if (!next || next.id !== upgrade.id) throw new Error("必须按顺序完成这条升级路线。");

      const eligibility = evaluateGuildUpgrade(draft, upgrade);
      if (!eligibility.requirementsMet) throw new Error("尚未满足公会升级条件。");
      if (!eligibility.fundsAvailable) throw new Error(`公会资金不足，需要 ${upgrade.cost} G。`);

      draft.guild.funds -= upgrade.cost;
      draft.guild.purchasedUpgradeIds.push(upgrade.id);
      return {
        upgradeId: upgrade.id,
        remainingFunds: draft.guild.funds,
        memberCapacity: getMemberCapacity(draft, content),
        expeditionRunCapacity: getExpeditionRunCapacity(draft, content),
      };
    },
  };
}
