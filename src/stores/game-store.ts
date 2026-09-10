import { computed, markRaw, readonly, shallowRef } from "vue";
import { defineStore } from "pinia";
import type { V2ClientBootstrapResult, V2ClientOrigin } from "../app/client-bootstrap";
import {
  generateCandidateCommand,
  settleCandidateGenerationCommand,
} from "../application/commands/generate-candidate";
import { dismissMemberCommand } from "../application/commands/dismiss-member";
import { recruitMemberCommand } from "../application/commands/recruit-member";
import { rejectCandidateCommand } from "../application/commands/reject-candidate";
import { respecMemberCommand } from "../application/commands/respec-member";
import type { Clock } from "../application/ports/clock";
import { getGameSnapshot } from "../application/queries/get-game-snapshot";
import { getActivitiesView } from "../application/queries/get-activities-view";
import { getAutoLootPreview } from "../application/queries/get-auto-loot-preview";
import { getDungeonPlanningView } from "../application/queries/get-dungeons-view";
import {
  getMemberDetailView,
  getMemberDirectoryView,
} from "../application/queries/get-members-view";
import { getOverviewView } from "../application/queries/get-overview-view";
import { getRespecPreview } from "../application/queries/get-respec-preview";
import { getRecruitmentView } from "../application/queries/get-recruitment-view";
import { startExpeditionCommand } from "../application/commands/start-expedition";
import { settleDueActivitiesCommand } from "../application/services/settlement-service";
import { assignLootCommand } from "../application/commands/assign-loot";
import { autoAssignLootCommand } from "../application/commands/auto-assign-loot";
import { sellLootCommand } from "../application/commands/sell-loot";
import { getLootView } from "../application/queries/get-loot-view";
import { getCombatReportsView } from "../application/queries/get-combat-reports-view";
import { getGuildUpgradeView } from "../application/queries/get-guild-upgrade-view";
import { getItemCatalogView } from "../application/queries/get-item-catalog-view";
import { purchaseGuildUpgradeCommand } from "../application/commands/purchase-guild-upgrade";
import { claimCollectionRewardCommand } from "../application/commands/claim-collection-reward";
import { removeMemberWishlistTargetCommand } from "../application/commands/remove-member-wishlist-target";
import {
  setMemberWishlistTargetCommand,
  type SetMemberWishlistTargetInput,
} from "../application/commands/set-member-wishlist-target";
import type { GameCommand, GameSession } from "../application/services/game-session";
import type { ContentRegistry } from "../content/registry";
import type { GameState } from "../domain/game-state";
import type {
  CandidateId,
  CollectionRewardId,
  CombatReportId,
  DungeonId,
  GuildUpgradeId,
  ItemDefinitionId,
  MemberId,
  PendingLootId,
  SpecId,
} from "../domain/shared/ids";

export type GameStoreStatus = "idle" | "loading" | "ready" | "error";
export type GameStoreErrorKind = "initialization" | "command" | "conflict" | "missing-save";

export interface GameStoreError {
  readonly kind: GameStoreErrorKind;
  readonly message: string;
  readonly commandType?: string;
  readonly expectedRevision?: number;
  readonly actualRevision?: number;
}

export interface V2ClientDiagnostics {
  readonly origin: V2ClientOrigin;
  readonly slotId: string;
  readonly saveVersion: number;
  readonly revision: number;
  readonly contentVersion: string;
  readonly guildName: string;
  readonly funds: number;
  readonly memberCount: number;
  readonly candidateCount: number;
  readonly activeActivityCount: number;
  readonly pendingLootCount: number;
}

export type GameCommandOutcome<Result> =
  | { readonly ok: true; readonly result: Result }
  | { readonly ok: false; readonly error: GameStoreError };

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

export const useGameStore = defineStore("game", () => {
  const status = shallowRef<GameStoreStatus>("idle");
  const stateSnapshot = shallowRef<GameState | null>(null);
  const origin = shallowRef<V2ClientOrigin | null>(null);
  const error = shallowRef<GameStoreError | null>(null);
  const pendingCommandCount = shallowRef(0);
  const now = shallowRef(0);
  let session: GameSession | null = null;
  let content: ContentRegistry | null = null;
  let clock: Clock | null = null;
  let initialization: Promise<boolean> | null = null;
  let tickSettlement: Promise<void> | null = null;

  const commandPending = computed(() => pendingCommandCount.value > 0);
  const snapshot = computed(() => (stateSnapshot.value ? readonly(stateSnapshot.value) : null));
  const diagnostics = computed<V2ClientDiagnostics | null>(() => {
    const state = stateSnapshot.value;
    if (!state || !origin.value) return null;
    return {
      origin: origin.value,
      slotId: state.slotId,
      saveVersion: state.saveVersion,
      revision: state.revision,
      contentVersion: state.contentVersion,
      guildName: state.guild.name,
      funds: state.guild.funds,
      memberCount: Object.keys(state.members).length,
      candidateCount: Object.keys(state.candidates).length,
      activeActivityCount: Object.values(state.activities).filter(
        (activity) => activity.status === "active",
      ).length,
      pendingLootCount: Object.keys(state.pendingLoot).length,
    };
  });
  const overview = computed(() =>
    stateSnapshot.value && content ? getOverviewView(stateSnapshot.value, content) : null,
  );
  const recruitment = computed(() =>
    stateSnapshot.value && content
      ? getRecruitmentView(stateSnapshot.value, content, now.value)
      : null,
  );
  const members = computed(() =>
    stateSnapshot.value && content ? getMemberDirectoryView(stateSnapshot.value, content) : null,
  );
  const activities = computed(() =>
    stateSnapshot.value && content
      ? getActivitiesView(stateSnapshot.value, content, now.value)
      : null,
  );
  const loot = computed(() =>
    stateSnapshot.value && content ? getLootView(stateSnapshot.value, content) : null,
  );
  const combatReports = computed(() =>
    stateSnapshot.value && content ? getCombatReportsView(stateSnapshot.value, content) : null,
  );
  const guildUpgrades = computed(() =>
    stateSnapshot.value && content ? getGuildUpgradeView(stateSnapshot.value, content) : null,
  );
  const itemCatalog = computed(() =>
    stateSnapshot.value && content ? getItemCatalogView(stateSnapshot.value, content) : null,
  );
  const autoLootPreview = computed(() =>
    stateSnapshot.value && content ? getAutoLootPreview(stateSnapshot.value, content) : null,
  );

  function refreshSnapshot(): void {
    if (session) stateSnapshot.value = getGameSnapshot(session);
  }

  async function initialize(bootstrap: () => Promise<V2ClientBootstrapResult>): Promise<boolean> {
    if (status.value === "ready") return true;
    if (initialization) return initialization;
    status.value = "loading";
    error.value = null;
    initialization = (async () => {
      try {
        const result = await bootstrap();
        session = markRaw(result.session);
        content = markRaw(result.content);
        clock = markRaw(result.clock);
        origin.value = result.origin;
        now.value = clock.now();
        refreshSnapshot();
        status.value = "ready";
        return true;
      } catch (reason) {
        error.value = { kind: "initialization", message: messageOf(reason) };
        status.value = "error";
        return false;
      } finally {
        initialization = null;
      }
    })();
    return initialization;
  }

  async function execute<Result>(
    command: GameCommand<Result>,
  ): Promise<GameCommandOutcome<Result>> {
    if (!session || status.value !== "ready") {
      const nextError: GameStoreError = {
        kind: "initialization",
        commandType: command.type,
        message: "游戏会话尚未准备完成。",
      };
      error.value = nextError;
      return { ok: false, error: nextError };
    }
    pendingCommandCount.value += 1;
    error.value = null;
    try {
      const result = await session.execute(command);
      if (result.status === "committed") {
        refreshSnapshot();
        return { ok: true, result: result.result };
      }
      const nextError: GameStoreError =
        result.status === "conflict"
          ? {
              kind: "conflict",
              commandType: command.type,
              expectedRevision: result.expectedRevision,
              actualRevision: result.actualRevision,
              message: "存档已在其他会话中更新，请重新载入后再试。",
            }
          : {
              kind: "missing-save",
              commandType: command.type,
              expectedRevision: result.expectedRevision,
              message: "当前存档已不存在，请重新创建公会。",
            };
      error.value = nextError;
      return { ok: false, error: nextError };
    } catch (reason) {
      const nextError: GameStoreError = {
        kind: "command",
        commandType: command.type,
        message: messageOf(reason),
      };
      error.value = nextError;
      return { ok: false, error: nextError };
    } finally {
      pendingCommandCount.value -= 1;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  async function tick(): Promise<void> {
    if (!clock || !content || !stateSnapshot.value || status.value !== "ready") return;
    now.value = clock.now();
    if (tickSettlement) return tickSettlement;
    const recruitmentDue =
      stateSnapshot.value.recruitment.nextCandidateAt !== undefined &&
      stateSnapshot.value.recruitment.nextCandidateAt <= now.value;
    const activityDue = Object.values(stateSnapshot.value.activities).some(
      (activity) =>
        (activity.status === "active" || activity.status === "scheduled") &&
        activity.nextSettlementAt <= now.value,
    );
    if (!recruitmentDue && !activityDue) return;
    tickSettlement = (async () => {
      if (recruitmentDue) {
        await execute(settleCandidateGenerationCommand({ content: content!, clock: clock! }));
      }
      if (
        stateSnapshot.value &&
        Object.values(stateSnapshot.value.activities).some(
          (activity) =>
            (activity.status === "active" || activity.status === "scheduled") &&
            activity.nextSettlementAt <= clock!.now(),
        )
      ) {
        await execute(settleDueActivitiesCommand({ content: content!, clock: clock! }));
      }
    })();
    try {
      await tickSettlement;
    } finally {
      tickSettlement = null;
    }
  }

  async function paidRefreshCandidate(): Promise<GameCommandOutcome<unknown>> {
    if (!content || !clock) return unavailableOutcome("generate-candidate");
    return execute(generateCandidateCommand({ content, clock }));
  }

  async function recruitCandidate(candidateId: CandidateId): Promise<GameCommandOutcome<unknown>> {
    if (!content || !clock) return unavailableOutcome("recruit-member");
    return execute(recruitMemberCommand({ content, clock }, candidateId));
  }

  async function rejectCandidate(candidateId: CandidateId): Promise<GameCommandOutcome<boolean>> {
    if (!clock) return unavailableOutcome("reject-candidate");
    return execute(rejectCandidateCommand(clock, candidateId));
  }

  function memberDetail(memberId: MemberId) {
    return stateSnapshot.value && content
      ? getMemberDetailView(stateSnapshot.value, content, memberId)
      : null;
  }

  function respecPreview(memberId: MemberId, specId: SpecId) {
    return stateSnapshot.value && content
      ? getRespecPreview(stateSnapshot.value, content, memberId, specId)
      : null;
  }

  async function respecMember(
    memberId: MemberId,
    specId: SpecId,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content || !clock) return unavailableOutcome("respec-member");
    return execute(respecMemberCommand({ content, clock }, memberId, specId));
  }

  async function dismissMember(memberId: MemberId): Promise<GameCommandOutcome<boolean>> {
    return execute(dismissMemberCommand(memberId));
  }

  async function setMemberWishlistTarget(
    memberId: MemberId,
    input: SetMemberWishlistTargetInput,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("set-member-wishlist-target");
    return execute(setMemberWishlistTargetCommand(content, memberId, input));
  }

  async function removeMemberWishlistTarget(
    memberId: MemberId,
    itemDefinitionId: ItemDefinitionId,
  ): Promise<GameCommandOutcome<boolean>> {
    return execute(removeMemberWishlistTargetCommand(memberId, itemDefinitionId));
  }

  async function purchaseGuildUpgrade(
    upgradeId: GuildUpgradeId,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("purchase-guild-upgrade");
    return execute(purchaseGuildUpgradeCommand(content, upgradeId));
  }

  async function claimCollectionReward(
    rewardId: CollectionRewardId,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("claim-collection-reward");
    return execute(claimCollectionRewardCommand(content, rewardId));
  }

  function dungeonPlanning(
    dungeonId: DungeonId | null,
    memberIds: readonly MemberId[],
    requestedRuns: number,
    selectedOptionalNodeIds: readonly import("../domain/shared/ids").DungeonRouteNodeId[] = [],
  ) {
    return stateSnapshot.value && content
      ? getDungeonPlanningView(
          stateSnapshot.value,
          content,
          dungeonId,
          memberIds,
          requestedRuns,
          selectedOptionalNodeIds,
        )
      : null;
  }

  async function startExpedition(
    dungeonId: DungeonId,
    participantIds: readonly MemberId[],
    requestedRuns: number,
    selectedOptionalNodeIds: readonly import("../domain/shared/ids").DungeonRouteNodeId[] = [],
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content || !clock) return unavailableOutcome("start-expedition");
    return execute(
      startExpeditionCommand(
        { content, clock },
        {
          dungeonId,
          participantIds: [...participantIds],
          requestedRuns,
          selectedOptionalNodeIds: [...selectedOptionalNodeIds],
        },
      ),
    );
  }

  async function assignLoot(
    pendingLootId: PendingLootId,
    memberId: MemberId,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("assign-loot");
    return execute(assignLootCommand(content, pendingLootId, memberId));
  }

  async function sellLoot(pendingLootId: PendingLootId): Promise<GameCommandOutcome<number>> {
    if (!content) return unavailableOutcome("sell-loot");
    return execute(sellLootCommand(content, pendingLootId));
  }

  async function autoAssignLoot(): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("auto-assign-loot");
    return execute(autoAssignLootCommand(content));
  }

  function combatReport(reportId: CombatReportId) {
    return combatReports.value?.reports.find((report) => report.id === reportId) ?? null;
  }

  function unavailableOutcome<Result>(commandType: string): GameCommandOutcome<Result> {
    const nextError: GameStoreError = {
      kind: "initialization",
      commandType,
      message: "游戏内容尚未准备完成。",
    };
    error.value = nextError;
    return { ok: false, error: nextError };
  }

  return {
    status,
    now,
    snapshot,
    error,
    commandPending,
    diagnostics,
    overview,
    recruitment,
    members,
    activities,
    loot,
    combatReports,
    guildUpgrades,
    itemCatalog,
    autoLootPreview,
    initialize,
    execute,
    tick,
    paidRefreshCandidate,
    recruitCandidate,
    rejectCandidate,
    memberDetail,
    respecPreview,
    respecMember,
    dismissMember,
    setMemberWishlistTarget,
    removeMemberWishlistTarget,
    purchaseGuildUpgrade,
    claimCollectionReward,
    dungeonPlanning,
    startExpedition,
    assignLoot,
    sellLoot,
    autoAssignLoot,
    combatReport,
    clearError,
  };
});
