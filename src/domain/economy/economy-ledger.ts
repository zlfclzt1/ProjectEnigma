import type { ItemDefinitionId } from "../shared/ids";
import type { GameState } from "../game-state";

export type EconomyLedgerKind =
  | "gold-income"
  | "gold-expense"
  | "material-input"
  | "material-output"
  | "supply-allocated"
  | "supply-consumed"
  | "supply-released";

export interface EconomyLedgerEntry {
  readonly id: number;
  readonly occurredAt: number;
  readonly kind: EconomyLedgerKind;
  readonly source: string;
  readonly amount?: number;
  readonly itemId?: ItemDefinitionId;
  readonly quantity?: number;
  readonly activityId?: string;
}

export const MAX_ECONOMY_LEDGER_ENTRIES = 2_000;

export function recordEconomyEvent(
  state: GameState,
  event: Omit<EconomyLedgerEntry, "id" | "occurredAt"> & { occurredAt?: number },
): void {
  const ledger = (state.economyLedger ??= []);
  const next: EconomyLedgerEntry = {
    ...event,
    id: (ledger.at(-1)?.id ?? 0) + 1,
    occurredAt: event.occurredAt ?? state.updatedAt,
  };
  ledger.push(next);
  if (ledger.length > MAX_ECONOMY_LEDGER_ENTRIES)
    ledger.splice(0, ledger.length - MAX_ECONOMY_LEDGER_ENTRIES);
}

export function createEmptyEconomyLedger(): EconomyLedgerEntry[] {
  return [];
}
