import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import {
  evaluateGuildUpgrade,
  getMemberCapacity,
  getNextGuildUpgrade,
  MEMBER_CAPACITY_TRACK_ID,
} from "../../domain/guild/guild-upgrade-rules";
import type { DungeonId, GuildUpgradeId } from "../../domain/shared/ids";

export interface GuildUpgradeRequirementView {
  readonly type: "dungeon-clear-count";
  readonly dungeonId: DungeonId;
  readonly label: string;
  readonly current: number;
  readonly target: number;
  readonly met: boolean;
}

export interface GuildUpgradeOptionView {
  readonly id: GuildUpgradeId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly targetMemberCapacity: number;
  readonly requirements: readonly GuildUpgradeRequirementView[];
  readonly requirementsMet: boolean;
  readonly fundsAvailable: boolean;
  readonly canPurchase: boolean;
  readonly blockedReasons: readonly string[];
}

export interface GuildUpgradeView {
  readonly memberCount: number;
  readonly memberCapacity: number;
  readonly funds: number;
  readonly purchasedCount: number;
  readonly nextUpgrade: GuildUpgradeOptionView | null;
  readonly atCurrentMaximum: boolean;
  readonly hasPurchasableUpgrade: boolean;
}

export function getGuildUpgradeView(state: GameState, content: ContentRegistry): GuildUpgradeView {
  const next = getNextGuildUpgrade(state, content, MEMBER_CAPACITY_TRACK_ID);
  const eligibility = next ? evaluateGuildUpgrade(state, next) : null;
  const requirements: GuildUpgradeRequirementView[] =
    eligibility?.requirements.map(({ requirement, current, target, met }) => {
      const dungeonName =
        content.dungeonById.get(requirement.dungeonId)?.name.zhCN ?? requirement.dungeonId;
      return {
        type: requirement.type,
        dungeonId: requirement.dungeonId,
        label: `${dungeonName}完整通关`,
        current,
        target,
        met,
      };
    }) ?? [];
  const blockedReasons: string[] = [];
  for (const requirement of requirements) {
    if (!requirement.met)
      blockedReasons.push(`${requirement.label} ${requirement.current}/${requirement.target}`);
  }
  if (next && state.guild.funds < next.cost) {
    blockedReasons.push(`公会资金还缺 ${next.cost - state.guild.funds} G`);
  }
  const targetMemberCapacity =
    next?.effects.find((effect) => effect.type === "member-capacity")?.value ??
    getMemberCapacity(state, content);

  return {
    memberCount: Object.keys(state.members).length,
    memberCapacity: getMemberCapacity(state, content),
    funds: state.guild.funds,
    purchasedCount: state.guild.purchasedUpgradeIds.length,
    nextUpgrade:
      next && eligibility
        ? {
            id: next.id,
            name: next.name.zhCN,
            description: next.description.zhCN,
            cost: next.cost,
            targetMemberCapacity,
            requirements,
            requirementsMet: eligibility.requirementsMet,
            fundsAvailable: eligibility.fundsAvailable,
            canPurchase: eligibility.canPurchase,
            blockedReasons,
          }
        : null,
    atCurrentMaximum: next === undefined,
    hasPurchasableUpgrade: eligibility?.canPurchase ?? false,
  };
}
