import type { ContentRegistry } from "../../content/registry";
import type {
  GuildUpgradeDefinition,
  GuildUpgradeRequirement,
} from "../../content/schemas/guild-upgrade";
import type { GameState } from "../game-state";
import { asBrandedId, type GuildUpgradeTrackId } from "../shared/ids";

export const BASE_MEMBER_CAPACITY = 10;
export const MEMBER_CAPACITY_TRACK_ID = asBrandedId<"GuildUpgradeTrackId">("member-capacity");

export interface GuildUpgradeRequirementEvaluation {
  readonly requirement: GuildUpgradeRequirement;
  readonly current: number;
  readonly target: number;
  readonly met: boolean;
}

export interface GuildUpgradeEligibility {
  readonly upgrade: GuildUpgradeDefinition;
  readonly requirements: readonly GuildUpgradeRequirementEvaluation[];
  readonly requirementsMet: boolean;
  readonly fundsAvailable: boolean;
  readonly canPurchase: boolean;
}

export function getGuildUpgradesForTrack(
  content: ContentRegistry,
  trackId: GuildUpgradeTrackId,
): readonly GuildUpgradeDefinition[] {
  return content.guildUpgrades
    .filter((upgrade) => upgrade.trackId === trackId)
    .sort((left, right) => left.order - right.order);
}

export function getNextGuildUpgrade(
  state: GameState,
  content: ContentRegistry,
  trackId: GuildUpgradeTrackId,
): GuildUpgradeDefinition | undefined {
  const purchased = new Set(state.guild.purchasedUpgradeIds);
  return getGuildUpgradesForTrack(content, trackId).find((upgrade) => !purchased.has(upgrade.id));
}

function evaluateRequirement(
  state: GameState,
  requirement: GuildUpgradeRequirement,
): GuildUpgradeRequirementEvaluation {
  const current = state.history.dungeonClearCounts[requirement.dungeonId] ?? 0;
  return { requirement, current, target: requirement.count, met: current >= requirement.count };
}

export function evaluateGuildUpgrade(
  state: GameState,
  upgrade: GuildUpgradeDefinition,
): GuildUpgradeEligibility {
  const requirements = upgrade.requirements.map((requirement) =>
    evaluateRequirement(state, requirement),
  );
  const requirementsMet = requirements.every((requirement) => requirement.met);
  const fundsAvailable = state.guild.funds >= upgrade.cost;
  return {
    upgrade,
    requirements,
    requirementsMet,
    fundsAvailable,
    canPurchase: requirementsMet && fundsAvailable,
  };
}

export function getMemberCapacity(state: GameState, content: ContentRegistry): number {
  let capacity = BASE_MEMBER_CAPACITY;
  for (const upgradeId of state.guild.purchasedUpgradeIds) {
    const upgrade = content.guildUpgradeById.get(upgradeId);
    if (!upgrade) continue;
    for (const effect of upgrade.effects) {
      if (effect.type === "member-capacity") capacity = Math.max(capacity, effect.value);
    }
  }
  return capacity;
}
