import type { CombatCapability } from "./combat-profile";
import type { CombatStatId } from "./formula-context";

export type FormulaStage =
  "class-base" | "equipment" | "derived-stat" | "linear-weight" | "strategy" | "modifier";

export interface StatContribution {
  readonly stage: FormulaStage;
  readonly capability?: CombatCapability;
  readonly statId?: CombatStatId;
  readonly sourceId: string;
  readonly rawValue?: number;
  readonly normalizedValue?: number;
  readonly weight?: number;
  readonly amount: number;
  readonly description: string;
}
