import type { MemberId } from "../shared/ids";
import type { FormulaVersion } from "../shared/ids";
import type { StatContribution } from "./stat-contribution";

export const COMBAT_CAPABILITIES = ["survivability", "threat", "healing", "damage"] as const;

export type CombatCapability = (typeof COMBAT_CAPABILITIES)[number];

export interface CombatCapabilityValues {
  readonly survivability: number;
  readonly threat: number;
  readonly healing: number;
  readonly damage: number;
}

export interface CombatUtilityProfile {
  readonly interruptScore: number;
  readonly dispelScore: number;
  readonly crowdControlScore: number;
}

export interface CombatProfile {
  readonly formulaVersion: FormulaVersion;
  readonly memberId: MemberId;
  readonly role: "tank" | "healer" | "dps";
  readonly capabilities: CombatCapabilityValues;
  readonly utility: CombatUtilityProfile;
  readonly diagnostics: readonly StatContribution[];
}
