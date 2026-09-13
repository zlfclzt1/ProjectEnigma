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
import { getProfessionView } from "../application/queries/get-profession-view";
import { getRespecPreview } from "../application/queries/get-respec-preview";
import { getRecruitmentView } from "../application/queries/get-recruitment-view";
import { startExpeditionCommand } from "../application/commands/start-expedition";
import { learnProfessionCommand } from "../application/commands/learn-profession";
import { learnRecipeCommand } from "../application/commands/learn-recipe";
import { trainProfessionCommand } from "../application/commands/train-profession";
import { upgradeProfessionFacilityCommand } from "../application/commands/upgrade-profession-facility";
import {
  startCraftingCommand,
  startGatheringCommand,
} from "../application/commands/start-profession-activities";
import { settleDueActivitiesCommand } from "../application/services/settlement-service";
import { assignLootCommand } from "../application/commands/assign-loot";
import { autoAssignLootCommand } from "../application/commands/auto-assign-loot";
import { sellLootCommand } from "../application/commands/sell-loot";
import { getLootView } from "../application/queries/get-loot-view";
import { getLootPlanView, type LootPlanOverride } from "../application/queries/get-loot-plan";
import {
  executeLootPlanCommand,
  type LootPlanDecision,
} from "../application/commands/execute-loot-plan";
import { sellNoUpgradeLootCommand } from "../application/commands/sell-no-upgrade-loot";
import {
  assignGuildBankEquipmentCommand,
  sellGuildBankEquipmentCommand,
} from "../application/commands/assign-guild-bank-equipment";
import { getCombatReportsView } from "../application/queries/get-combat-reports-view";
import { getGuildUpgradeView } from "../application/queries/get-guild-upgrade-view";
import { getItemCatalogView } from "../application/queries/get-item-catalog-view";
import { purchaseGuildUpgradeCommand } from "../application/commands/purchase-guild-upgrade";
import { claimCollectionRewardCommand } from "../application/commands/claim-collection-reward";
import { getExpeditionQuestBriefView } from "../application/queries/get-expedition-quest-brief-view";
import { getRosterPresetsView } from "../application/queries/get-roster-presets-view";
import { getDungeonDevelopmentView } from "../application/queries/get-dungeon-development-view";
import {
  createSupplyPlanCommand,
  deleteSupplyPlanCommand,
  duplicateSupplyPlanCommand,
  updateSupplyPlanCommand,
} from "../application/commands/manage-supply-plans";
import {
  createRosterPresetCommand,
  deleteRosterPresetCommand,
  renameRosterPresetCommand,
  updateRosterPresetCommand,
} from "../application/commands/manage-roster-presets";
import type { GameCommand, GameSession } from "../application/services/game-session";
import type { ContentRegistry } from "../content/registry";
import type { GameState } from "../domain/game-state";
import type { RosterPreset } from "../domain/guild/roster-preset";
import type {
  CandidateId,
  CollectionRewardId,
  CombatReportId,
  DungeonId,
  GuildUpgradeId,
  MemberId,
  PendingLootId,
  RosterPresetId,
  SpecId,
  SupplyPlanId,
} from "../domain/shared/ids";
import type { GuildSupplyPlanEntry } from "../domain/guild/supply-plan";
import { organizeGuildBankCommand } from "../application/commands/organize-guild-bank";
import { getEconomyReport } from "../application/queries/get-economy-report";

export type GameStoreStatus = "idle" | "loading" | "needs-setup" | "ready" | "error";
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
  const rosterPresets = computed(() =>
    stateSnapshot.value && content ? getRosterPresetsView(stateSnapshot.value, content) : null,
  );
  const dungeonDevelopment = computed(() =>
    stateSnapshot.value && content ? getDungeonDevelopmentView(stateSnapshot.value, content) : null,
  );
  const supplyPlans = computed(() => {
    const defaults = (content?.supplyPlans ?? []).map((plan) => ({
      ...plan,
      editable: plan.editable,
      isCustom: false,
    }));
    const custom = Object.values(stateSnapshot.value?.guild.supplyPlans ?? {}).map((plan) => ({
      id: plan.id,
      name: { zhCN: plan.name },
      editable: true,
      isCustom: true,
      entries: plan.entries,
    }));
    return [...defaults, ...custom];
  });
  const professions = computed(() => content?.professions ?? []);
  const gatheringSites = computed(() => content?.gatheringSites ?? []);
  const recipes = computed(() => content?.recipes ?? []);
  const supplyItems = computed(
    () =>
      content?.items
        .filter((item) => item.kind === "material" || item.kind === "consumable")
        .map((item) => ({ id: item.id, name: item.name.zhCN })) ?? [],
  );
  const supplyEffects = computed(
    () => content?.consumableEffects.map((effect) => ({ id: effect.id, name: effect.id })) ?? [],
  );
  const professionView = computed(() =>
    stateSnapshot.value && content ? getProfessionView(stateSnapshot.value, content) : null,
  );
  const economyReport = computed(() =>
    stateSnapshot.value ? getEconomyReport(stateSnapshot.value) : null,
  );

  function economyReportFor(from?: number, to?: number) {
    return stateSnapshot.value ? getEconomyReport(stateSnapshot.value, from, to) : null;
  }

  function refreshSnapshot(): void {
    if (session) stateSnapshot.value = getGameSnapshot(session);
  }

  function adoptBootstrapResult(result: V2ClientBootstrapResult): void {
    session = markRaw(result.session);
    content = markRaw(result.content);
    clock = markRaw(result.clock);
    origin.value = result.origin;
    now.value = clock.now();
    refreshSnapshot();
    status.value = "ready";
  }

  async function initialize(
    bootstrap: () => Promise<V2ClientBootstrapResult | null>,
  ): Promise<boolean> {
    if (status.value === "ready") return true;
    if (initialization) return initialization;
    status.value = "loading";
    error.value = null;
    initialization = (async () => {
      try {
        const result = await bootstrap();
        if (!result) {
          status.value = "needs-setup";
          return false;
        }
        adoptBootstrapResult(result);
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

  async function createNewGame(create: () => Promise<V2ClientBootstrapResult>): Promise<boolean> {
    if (status.value !== "needs-setup" && status.value !== "error") return false;
    status.value = "loading";
    error.value = null;
    try {
      adoptBootstrapResult(await create());
      return true;
    } catch (reason) {
      error.value = { kind: "initialization", message: messageOf(reason) };
      status.value = "needs-setup";
      return false;
    }
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
    routeVariantId: import("../domain/shared/ids").DungeonRouteVariantId | null = null,
    routeSelections: Readonly<
      Record<string, import("../application/queries/get-dungeons-view").DungeonRouteSelectionInput>
    > = {},
  ) {
    return stateSnapshot.value && content
      ? getDungeonPlanningView(
          stateSnapshot.value,
          content,
          dungeonId,
          memberIds,
          requestedRuns,
          selectedOptionalNodeIds,
          routeVariantId,
          routeSelections,
        )
      : null;
  }

  function expeditionQuestBrief(
    dungeonId: DungeonId,
    participantIds: readonly MemberId[],
    selectedOptionalNodeIds: readonly import("../domain/shared/ids").DungeonRouteNodeId[] = [],
    routeVariantId?: import("../domain/shared/ids").DungeonRouteVariantId,
  ) {
    return stateSnapshot.value && content
      ? getExpeditionQuestBriefView(
          stateSnapshot.value,
          content,
          dungeonId,
          participantIds,
          selectedOptionalNodeIds,
          routeVariantId,
        )
      : null;
  }

  async function startExpedition(
    dungeonId: DungeonId,
    participantIds: readonly MemberId[],
    requestedRuns: number,
    selectedOptionalNodeIds: readonly import("../domain/shared/ids").DungeonRouteNodeId[] = [],
    routeVariantId?: import("../domain/shared/ids").DungeonRouteVariantId,
    supplyPlanId?: SupplyPlanId,
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
          ...(routeVariantId ? { routeVariantId } : {}),
          ...(supplyPlanId ? { supplyPlanId } : {}),
        },
      ),
    );
  }

  async function createSupplyPlan(
    name: string,
    entries: readonly GuildSupplyPlanEntry[],
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content || !clock) return unavailableOutcome("create-supply-plan");
    return execute(createSupplyPlanCommand(content, clock, name, entries));
  }

  async function updateSupplyPlan(
    id: SupplyPlanId,
    name: string,
    entries: readonly GuildSupplyPlanEntry[],
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content || !clock) return unavailableOutcome("update-supply-plan");
    return execute(updateSupplyPlanCommand(content, clock, id, name, entries));
  }

  async function duplicateSupplyPlan(
    id: SupplyPlanId,
    name: string,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content || !clock) return unavailableOutcome("duplicate-supply-plan");
    return execute(duplicateSupplyPlanCommand(content, clock, id, name));
  }

  async function deleteSupplyPlan(id: SupplyPlanId): Promise<GameCommandOutcome<boolean>> {
    return execute(deleteSupplyPlanCommand(id));
  }

  async function organizeGuildBank(): Promise<GameCommandOutcome<boolean>> {
    if (!content) return unavailableOutcome("organize-guild-bank");
    return execute(organizeGuildBankCommand(content));
  }

  async function learnProfession(
    memberId: MemberId,
    professionId: import("../domain/shared/ids").ProfessionDefinitionId,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("learn-profession");
    return execute(learnProfessionCommand(content, memberId, professionId));
  }

  async function learnRecipe(
    memberId: MemberId,
    recipeId: import("../domain/shared/ids").RecipeId,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("learn-recipe");
    return execute(learnRecipeCommand(content, memberId, recipeId));
  }

  async function trainProfession(
    memberId: MemberId,
    professionId: import("../domain/shared/ids").ProfessionDefinitionId,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("train-profession");
    return execute(trainProfessionCommand(content, memberId, professionId));
  }

  async function upgradeProfessionFacility(
    facilityId: import("../domain/shared/ids").ProfessionFacilityId,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("upgrade-profession-facility");
    return execute(upgradeProfessionFacilityCommand(content, facilityId));
  }

  async function startGathering(
    memberId: MemberId,
    siteId: import("../domain/shared/ids").GatheringSiteId,
    quantity: number,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content || !clock) return unavailableOutcome("start-gathering");
    return execute(
      startGatheringCommand({ content, clock }, { participantIds: [memberId], siteId, quantity }),
    );
  }

  async function startCrafting(
    memberId: MemberId,
    recipeId: import("../domain/shared/ids").RecipeId,
    quantity: number,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content || !clock) return unavailableOutcome("start-crafting");
    return execute(
      startCraftingCommand({ content, clock }, { participantIds: [memberId], recipeId, quantity }),
    );
  }

  async function createRosterPreset(
    name: string,
    memberIds: readonly MemberId[],
  ): Promise<GameCommandOutcome<RosterPreset>> {
    if (!clock) return unavailableOutcome<RosterPreset>("create-roster-preset");
    return execute(createRosterPresetCommand(clock, name, memberIds));
  }

  async function updateRosterPreset(
    presetId: RosterPresetId,
    memberIds: readonly MemberId[],
  ): Promise<GameCommandOutcome<RosterPreset>> {
    if (!clock) return unavailableOutcome<RosterPreset>("update-roster-preset");
    return execute(updateRosterPresetCommand(clock, presetId, memberIds));
  }

  async function renameRosterPreset(
    presetId: RosterPresetId,
    name: string,
  ): Promise<GameCommandOutcome<RosterPreset>> {
    if (!clock) return unavailableOutcome<RosterPreset>("rename-roster-preset");
    return execute(renameRosterPresetCommand(clock, presetId, name));
  }

  async function deleteRosterPreset(
    presetId: RosterPresetId,
  ): Promise<GameCommandOutcome<boolean>> {
    return execute(deleteRosterPresetCommand(presetId));
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

  async function assignGuildBankEquipment(
    instanceId: import("../domain/shared/ids").ItemInstanceId,
    memberId: MemberId,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("assign-guild-bank-equipment");
    return execute(assignGuildBankEquipmentCommand(content, instanceId, memberId));
  }

  async function sellGuildBankEquipment(
    instanceId: import("../domain/shared/ids").ItemInstanceId,
  ): Promise<GameCommandOutcome<number>> {
    if (!content) return unavailableOutcome("sell-guild-bank-equipment");
    return execute(sellGuildBankEquipmentCommand(content, instanceId));
  }

  async function autoAssignLoot(
    activityId?: import("../domain/shared/ids").ActivityId,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("auto-assign-loot");
    return execute(autoAssignLootCommand(content, activityId));
  }

  function lootPlan(
    overrides: readonly LootPlanOverride[] = [],
    activityId?: import("../domain/shared/ids").ActivityId,
  ) {
    return stateSnapshot.value && content
      ? getLootPlanView(stateSnapshot.value, content, overrides, activityId)
      : null;
  }

  function autoLootPreviewForActivity(activityId?: import("../domain/shared/ids").ActivityId) {
    return stateSnapshot.value && content
      ? getAutoLootPreview(stateSnapshot.value, content, activityId)
      : null;
  }

  async function executeLootPlan(
    decisions: readonly LootPlanDecision[],
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("execute-loot-plan");
    return execute(executeLootPlanCommand(content, decisions));
  }

  async function sellNoUpgradeLoot(
    activityId?: import("../domain/shared/ids").ActivityId,
  ): Promise<GameCommandOutcome<unknown>> {
    if (!content) return unavailableOutcome("sell-no-upgrade-loot");
    return execute(sellNoUpgradeLootCommand(content, activityId));
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
    lootPlan,
    combatReports,
    guildUpgrades,
    itemCatalog,
    autoLootPreview,
    autoLootPreviewForActivity,
    rosterPresets,
    dungeonDevelopment,
    supplyPlans,
    professions,
    gatheringSites,
    recipes,
    supplyItems,
    supplyEffects,
    professionView,
    economyReport,
    economyReportFor,
    initialize,
    createNewGame,
    execute,
    tick,
    paidRefreshCandidate,
    recruitCandidate,
    rejectCandidate,
    memberDetail,
    respecPreview,
    respecMember,
    dismissMember,
    purchaseGuildUpgrade,
    claimCollectionReward,
    expeditionQuestBrief,
    dungeonPlanning,
    startExpedition,
    createSupplyPlan,
    updateSupplyPlan,
    duplicateSupplyPlan,
    deleteSupplyPlan,
    organizeGuildBank,
    learnProfession,
    learnRecipe,
    trainProfession,
    upgradeProfessionFacility,
    startGathering,
    startCrafting,
    createRosterPreset,
    updateRosterPreset,
    renameRosterPreset,
    deleteRosterPreset,
    assignLoot,
    sellLoot,
    assignGuildBankEquipment,
    sellGuildBankEquipment,
    autoAssignLoot,
    executeLootPlan,
    sellNoUpgradeLoot,
    combatReport,
    clearError,
  };
});
