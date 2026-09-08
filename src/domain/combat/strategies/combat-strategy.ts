import type { CombatCapability } from "../combat-profile";
import type {
  CombatStatBlock,
  CombatStrategyConfig,
  ResolvedCombatFormulaContext,
} from "../formula-context";

export interface StrategyContribution {
  readonly capability: CombatCapability;
  readonly amount: number;
  readonly sourceId: string;
  readonly description: string;
}

export interface CombatStrategy<Config extends CombatStrategyConfig = CombatStrategyConfig> {
  readonly strategyId: Config["strategyId"];
  evaluate(
    config: Config,
    stats: CombatStatBlock,
    context: ResolvedCombatFormulaContext,
  ): readonly StrategyContribution[];
}
