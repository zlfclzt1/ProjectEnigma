import type { GameState } from "../../domain/game-state";
import type { EconomyLedgerEntry, EconomyLedgerKind } from "../../domain/economy/economy-ledger";

export interface EconomyReport {
  readonly from?: number;
  readonly to?: number;
  readonly entries: readonly EconomyLedgerEntry[];
  readonly goldIncome: number;
  readonly goldExpense: number;
  readonly goldNet: number;
  readonly byKind: Readonly<Record<EconomyLedgerKind, number>>;
  readonly bySource: readonly {
    source: string;
    amount: number;
    quantity: number;
    count: number;
  }[];
  readonly materialNet: readonly { itemId: string; quantity: number }[];
  readonly professionActivities: {
    total: number;
    active: number;
    completed: number;
    gathering: number;
    crafting: number;
    durationSeconds: number;
  };
  readonly expedition: {
    total: number;
    completedRuns: number;
    victories: number;
    defeats: number;
    successRate: number;
    durationSeconds: number;
    routeVariants: readonly { routeVariantId: string; count: number }[];
  };
  readonly supply: {
    required: number;
    allocated: number;
    consumed: number;
    released: number;
    downgradeRate: number;
    consumptionRate: number;
  };
}

const kinds: readonly EconomyLedgerKind[] = [
  "gold-income",
  "gold-expense",
  "material-input",
  "material-output",
  "supply-allocated",
  "supply-consumed",
  "supply-released",
];

export function getEconomyReport(state: GameState, from?: number, to?: number): EconomyReport {
  const entries = (state.economyLedger ?? []).filter(
    (entry) =>
      (from === undefined || entry.occurredAt >= from) &&
      (to === undefined || entry.occurredAt <= to),
  );
  const byKind = Object.fromEntries(kinds.map((kind) => [kind, 0])) as Record<
    EconomyLedgerKind,
    number
  >;
  const sources = new Map<string, { amount: number; quantity: number; count: number }>();
  const materials = new Map<string, number>();
  for (const entry of entries) {
    const value = entry.amount ?? entry.quantity ?? 0;
    byKind[entry.kind] += value;
    const source = sources.get(entry.source) ?? { amount: 0, quantity: 0, count: 0 };
    source.amount += entry.amount ?? 0;
    source.quantity += entry.quantity ?? 0;
    source.count += 1;
    sources.set(entry.source, source);
    if (entry.itemId && entry.quantity) {
      const sign =
        entry.kind === "material-input" ||
        entry.kind === "supply-allocated" ||
        entry.kind === "supply-consumed"
          ? -1
          : 1;
      materials.set(entry.itemId, (materials.get(entry.itemId) ?? 0) + sign * entry.quantity);
    }
  }
  const professionActivities = Object.values(state.activities).filter(
    (activity) => activity.type === "gathering" || activity.type === "crafting",
  );
  const expeditionActivities = Object.values(state.activities).filter(
    (activity) => activity.type === "expedition",
  );
  const inRange = (occurredAt: number): boolean =>
    (from === undefined || occurredAt >= from) && (to === undefined || occurredAt <= to);
  const filteredProfessionActivities = professionActivities.filter((activity) =>
    inRange(activity.createdAt),
  );
  const filteredExpeditionActivities = expeditionActivities.filter((activity) =>
    inRange(activity.createdAt),
  );
  const durationSeconds = (activity: {
    startedAt: number;
    completedAt?: number;
    nextSettlementAt: number;
  }) =>
    Math.max(
      0,
      (Math.min(activity.completedAt ?? activity.nextSettlementAt, activity.nextSettlementAt) -
        activity.startedAt) /
        1_000,
    );
  const routeVariants = new Map<string, number>();
  let expeditionCompletedRuns = 0;
  let expeditionVictories = 0;
  let expeditionDefeats = 0;
  for (const activity of filteredExpeditionActivities) {
    expeditionCompletedRuns += activity.completedRuns;
    if (activity.routeVariantId) {
      routeVariants.set(
        activity.routeVariantId,
        (routeVariants.get(activity.routeVariantId) ?? 0) + 1,
      );
    }
    for (const run of activity.runPlans) {
      for (const stage of run.stages) {
        if (stage.status === "victory") expeditionVictories += 1;
        if (stage.status === "defeat") expeditionDefeats += 1;
      }
    }
  }
  const supplyTotals = filteredExpeditionActivities.reduce(
    (totals, activity) => {
      for (const entry of activity.supplySnapshot?.entries ?? []) {
        totals.required += entry.requiredQuantity;
        totals.allocated += entry.allocatedQuantity;
        totals.consumed += entry.consumedQuantity;
        totals.released += entry.releasedQuantity ?? 0;
      }
      return totals;
    },
    { required: 0, allocated: 0, consumed: 0, released: 0 },
  );
  return {
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
    entries: [...entries].sort(
      (left, right) => right.occurredAt - left.occurredAt || right.id - left.id,
    ),
    goldIncome: byKind["gold-income"],
    goldExpense: byKind["gold-expense"],
    goldNet: byKind["gold-income"] - byKind["gold-expense"],
    byKind,
    bySource: [...sources.entries()]
      .map(([source, value]) => ({ source, ...value }))
      .sort((left, right) => right.amount - left.amount),
    materialNet: [...materials.entries()]
      .map(([itemId, quantity]) => ({ itemId, quantity }))
      .sort((left, right) => right.quantity - left.quantity),
    professionActivities: {
      total: filteredProfessionActivities.length,
      active: filteredProfessionActivities.filter(
        (activity) => activity.status === "active" || activity.status === "scheduled",
      ).length,
      completed: filteredProfessionActivities.filter((activity) => activity.status === "completed")
        .length,
      gathering: filteredProfessionActivities.filter((activity) => activity.type === "gathering")
        .length,
      crafting: filteredProfessionActivities.filter((activity) => activity.type === "crafting")
        .length,
      durationSeconds: filteredProfessionActivities.reduce(
        (sum, activity) => sum + durationSeconds(activity),
        0,
      ),
    },
    expedition: {
      total: filteredExpeditionActivities.length,
      completedRuns: expeditionCompletedRuns,
      victories: expeditionVictories,
      defeats: expeditionDefeats,
      successRate:
        expeditionVictories + expeditionDefeats > 0
          ? expeditionVictories / (expeditionVictories + expeditionDefeats)
          : 0,
      durationSeconds: filteredExpeditionActivities.reduce(
        (sum, activity) => sum + durationSeconds(activity),
        0,
      ),
      routeVariants: [...routeVariants.entries()].map(([routeVariantId, count]) => ({
        routeVariantId,
        count,
      })),
    },
    supply: {
      ...supplyTotals,
      downgradeRate:
        supplyTotals.required > 0
          ? (supplyTotals.required - supplyTotals.allocated) / supplyTotals.required
          : 0,
      consumptionRate:
        supplyTotals.allocated > 0 ? supplyTotals.consumed / supplyTotals.allocated : 0,
    },
  };
}
