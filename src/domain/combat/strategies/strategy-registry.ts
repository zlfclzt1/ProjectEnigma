import { BUILTIN_COMBAT_STRATEGIES } from "./builtin-strategies";
import type { CombatStrategy } from "./combat-strategy";
import type { CombatStrategyConfig } from "../formula-context";

export class CombatStrategyNotFoundError extends Error {
  constructor(readonly strategyId: string) {
    super(`Combat strategy not found: ${strategyId}`);
    this.name = "CombatStrategyNotFoundError";
  }
}

export class CombatStrategyRegistry {
  private readonly strategies = new Map<string, CombatStrategy>();

  constructor(strategies: readonly CombatStrategy[] = BUILTIN_COMBAT_STRATEGIES) {
    for (const strategy of strategies) this.strategies.set(strategy.strategyId, strategy);
  }

  evaluate(
    config: CombatStrategyConfig,
    ...args: Parameters<CombatStrategy["evaluate"]> extends [unknown, ...infer Rest] ? Rest : never
  ) {
    const strategy = this.strategies.get(config.strategyId);
    if (!strategy) throw new CombatStrategyNotFoundError(config.strategyId);
    return strategy.evaluate(config, ...args);
  }
}
