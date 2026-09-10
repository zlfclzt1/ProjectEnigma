<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useGameStore } from "../../stores/game-store";
import { useUiStore } from "../../stores/ui-store";
import DungeonSelector from "../components/DungeonSelector.vue";
import PartyBuilder from "../components/PartyBuilder.vue";
import PartyPreview from "../components/PartyPreview.vue";
import RosterPresetBar from "../components/RosterPresetBar.vue";
import RosterPresetManager from "../components/RosterPresetManager.vue";
import RosterPresetNameDialog from "../components/RosterPresetNameDialog.vue";
import RosterPresetReductionDialog from "../components/RosterPresetReductionDialog.vue";
import type { DungeonRouteNodeId, MemberId, RosterPresetId } from "../../domain/shared/ids";

const game = useGameStore();
const ui = useUiStore();
const notice = ref("");
const selectedPresetId = ref<RosterPresetId | null>(null);
const namingOpen = ref(false);
const managerOpen = ref(false);
const reductionOpen = ref(false);
const planning = computed(() =>
  game.dungeonPlanning(
    ui.selectedDungeonId,
    ui.selectedPartyMemberIds,
    ui.requestedExpeditionRuns,
    ui.selectedOptionalNodeIds,
    ui.selectedRouteVariantId,
  ),
);
const selectedPreset = computed(
  () => game.rosterPresets?.presets.find((preset) => preset.id === selectedPresetId.value) ?? null,
);
const questBrief = computed(() => {
  const dungeonId = planning.value?.selectedDungeon?.id;
  return dungeonId
    ? game.expeditionQuestBrief(
        dungeonId,
        ui.selectedPartyMemberIds,
        ui.selectedOptionalNodeIds,
        ui.selectedRouteVariantId ?? undefined,
      )
    : null;
});

watchEffect(() => {
  const selected = planning.value?.selectedDungeon;
  if (selected && ui.selectedDungeonId !== selected.id) ui.selectDungeon(selected.id);
  if (
    planning.value?.selectedRouteVariantId &&
    ui.selectedRouteVariantId !== planning.value.selectedRouteVariantId
  ) {
    ui.selectRouteVariant(planning.value.selectedRouteVariantId);
  }
});

async function start(): Promise<void> {
  await depart(ui.selectedOptionalNodeIds);
}

async function depart(optionalNodeIds: readonly DungeonRouteNodeId[]): Promise<void> {
  const dungeon = planning.value?.selectedDungeon;
  if (!dungeon) return;
  notice.value = "";
  const outcome = await game.startExpedition(
    dungeon.id,
    ui.selectedPartyMemberIds,
    ui.requestedExpeditionRuns,
    optionalNodeIds,
    ui.selectedRouteVariantId ?? undefined,
  );
  if (!outcome.ok) return;
  notice.value = `${dungeon.name}队伍已经出发，可以继续组织另一支队伍。`;
  ui.clearParty();
}

async function purchaseRunCapacity(): Promise<void> {
  const upgrade = planning.value?.runCapacityUpgrade;
  if (!upgrade) return;
  notice.value = "";
  const outcome = await game.purchaseGuildUpgrade(upgrade.id);
  if (outcome.ok) notice.value = "远征补给已经备齐，现在可以一次安排五轮副本。";
}

function appliedNotice(
  preset: NonNullable<typeof selectedPreset.value>,
  memberIds: readonly MemberId[],
): string {
  const messages = [`已套用“${preset.name}”的 ${memberIds.length} 名成员。`];
  if (preset.activeCount) messages.push(`${preset.activeCount} 名成员正在参加其他活动。`);
  if (preset.departedCount) messages.push(`${preset.departedCount} 名已离队成员已跳过。`);
  return messages.join(" ");
}

function applyMembers(memberIds: readonly MemberId[]): void {
  const preset = selectedPreset.value;
  if (!preset) return;
  ui.setPartyMembers(memberIds);
  notice.value = appliedNotice(preset, memberIds);
  reductionOpen.value = false;
}

function applyPreset(): void {
  const preset = selectedPreset.value;
  const maximumMembers = planning.value?.selectedDungeon?.maximumMembers ?? 0;
  if (!preset || maximumMembers < 1) return;
  if (preset.currentMemberIds.length > maximumMembers) {
    reductionOpen.value = true;
    return;
  }
  applyMembers(preset.currentMemberIds);
}

async function saveCurrent(name: string): Promise<void> {
  const outcome = await game.createRosterPreset(name, ui.selectedPartyMemberIds);
  if (!outcome.ok) return;
  selectedPresetId.value = outcome.result.id;
  namingOpen.value = false;
  managerOpen.value = false;
  notice.value = `已保存固定队伍“${outcome.result.name}”。`;
}

async function createFromManager(name: string, memberIds: readonly MemberId[]): Promise<void> {
  const outcome = await game.createRosterPreset(name, memberIds);
  if (!outcome.ok) return;
  selectedPresetId.value = outcome.result.id;
  managerOpen.value = false;
  notice.value = `已保存固定队伍“${outcome.result.name}”。`;
}

async function updateCurrent(presetId = selectedPresetId.value): Promise<void> {
  if (!presetId) return;
  const outcome = await game.updateRosterPreset(presetId, ui.selectedPartyMemberIds);
  if (outcome.ok) notice.value = `已用当前阵容更新“${outcome.result.name}”。`;
}

async function updateFromManager(
  presetId: RosterPresetId,
  memberIds: readonly MemberId[],
): Promise<void> {
  const outcome = await game.updateRosterPreset(presetId, memberIds);
  if (outcome.ok) notice.value = `已更新固定队伍“${outcome.result.name}”。`;
}

async function renamePreset(presetId: RosterPresetId, name: string): Promise<void> {
  const outcome = await game.renameRosterPreset(presetId, name);
  if (outcome.ok) notice.value = `固定队伍已重命名为“${outcome.result.name}”。`;
}

async function deletePreset(presetId: RosterPresetId): Promise<void> {
  const preset = game.rosterPresets?.presets.find((entry) => entry.id === presetId);
  if (!preset || !window.confirm(`确定删除固定队伍“${preset.name}”吗？`)) return;
  const outcome = await game.deleteRosterPreset(presetId);
  if (!outcome.ok) return;
  if (selectedPresetId.value === presetId) selectedPresetId.value = null;
  notice.value = `已删除固定队伍“${preset.name}”。`;
}
</script>

<template>
  <section v-if="planning" class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">副本作战室</p>
        <h2>组织副本</h2>
      </div>
      <label>
        <span>连续挑战</span>
        <select
          :value="ui.requestedExpeditionRuns"
          @change="
            ui.setRequestedExpeditionRuns(Number(($event.target as HTMLSelectElement).value))
          "
        >
          <option v-for="runs in planning.maximumRuns" :key="runs" :value="runs">
            {{ runs }} 次
          </option>
        </select>
      </label>
    </header>

    <DungeonSelector
      :dungeons="planning.dungeons"
      :selected-id="planning.selectedDungeon?.id ?? null"
      :selected-member-levels="
        planning.members
          .filter((member) => ui.selectedPartyMemberIds.includes(member.id))
          .map((member) => member.level)
      "
      @select="ui.selectDungeon"
    />
    <p v-if="notice" class="notice">{{ notice }}</p>
    <details v-if="questBrief?.entries.length" class="quest-summary">
      <summary>
        <span>
          <strong>可推进 {{ questBrief.advanceCount }} 项调查</strong>
          <small v-if="questBrief.developmentCacheItemCount">
            · 首次开发战利品 ×{{ questBrief.developmentCacheItemCount }}
          </small>
          <small v-else>· 当前路线不会产生首次开发箱</small>
        </span>
        <em>开发 {{ questBrief.currentLevel }} 级</em>
      </summary>
      <div class="development-benefits">
        <span>当前副本经验 +{{ questBrief.currentExperienceBonusPercent }}%</span>
        <span>额外普通掉落 +{{ questBrief.currentExtraLootPercent }}%</span>
        <span v-if="questBrief.firstDevelopmentCount">
          本次全通可完成 {{ questBrief.firstDevelopmentCount }} 项首次开发
        </span>
      </div>
      <section class="commission-preview">
        <article v-for="entry in questBrief.entries" :key="entry.questId">
          <header>
            <strong>{{ entry.name }}</strong>
            <span :class="{ covered: entry.routeCovered }">
              {{ entry.routeCovered ? (entry.willComplete ? "预计完成" : "可推进") : "路线未覆盖" }}
            </span>
          </header>
          <p>{{ entry.description }}</p>
          <small>{{ entry.objectiveLabel }} · {{ entry.progressLabel }}</small>
          <small
            v-if="!entry.routeCovered && entry.requiredOptionalBossNames.length"
            class="route-hint"
          >
            勾选可选首领 {{ entry.requiredOptionalBossNames.join("、") }} 后可推进
          </small>
          <details v-if="entry.rewardItems.length" class="reward-pool">
            <summary>查看开发装备池</summary>
            <span v-for="item in entry.rewardItems" :key="item.id">
              {{ item.name }} · 装等 {{ item.itemLevel }}
            </span>
          </details>
        </article>
      </section>
    </details>
    <aside v-if="planning.runCapacityUpgrade" class="run-upgrade">
      <div>
        <strong>{{ planning.runCapacityUpgrade.name }}</strong>
        <p>{{ planning.runCapacityUpgrade.description }}</p>
        <small v-if="planning.runCapacityUpgrade.blockedReasons.length">
          解锁五连刷尚需：{{ planning.runCapacityUpgrade.blockedReasons.join("；") }}
        </small>
        <small v-else>里程碑与资金均已满足，可以扩充连续挑战上限。</small>
      </div>
      <button
        type="button"
        :disabled="game.commandPending || !planning.runCapacityUpgrade.canPurchase"
        @click="purchaseRunCapacity"
      >
        {{
          `升级至 ${planning.runCapacityUpgrade.targetCapacity} 次 · ${planning.runCapacityUpgrade.cost} G`
        }}
      </button>
    </aside>

    <div class="planning-grid">
      <div class="party-column">
        <RosterPresetBar
          v-if="game.rosterPresets"
          :presets="game.rosterPresets.presets"
          :selected-preset-id="selectedPresetId"
          :selected-member-count="ui.selectedPartyMemberIds.length"
          :maximum-presets="game.rosterPresets.maximumPresets"
          :pending="game.commandPending"
          @select="selectedPresetId = $event"
          @apply="applyPreset"
          @save-current="namingOpen = true"
          @update-current="updateCurrent()"
          @manage="managerOpen = true"
        />
        <PartyBuilder
          :members="planning.members"
          :selected-member-ids="ui.selectedPartyMemberIds"
          :maximum-members="planning.selectedDungeon?.maximumMembers ?? 0"
          :class-id="ui.partyFilters.classId"
          :role="ui.partyFilters.role"
          :sort-by="ui.partyFilters.sortBy"
          :class-options="planning.classOptions"
          :role-options="planning.roleOptions"
          @toggle="ui.togglePartyMember"
          @update:class-id="ui.setPartyFilters({ classId: $event })"
          @update:role="ui.setPartyFilters({ role: $event })"
          @update:sort-by="ui.setPartyFilters({ sortBy: $event })"
        />
      </div>
      <PartyPreview
        :dungeon="planning.selectedDungeon"
        :preview="planning.preview"
        :mechanic-readiness="planning.mechanicReadiness"
        :optional-routes="planning.optionalRoutes"
        :rare-routes="planning.rareRoutes"
        :route-variants="planning.routeVariants"
        :quest-route-warnings="planning.questRouteWarnings"
        :issues="planning.issues"
        :requested-runs="ui.requestedExpeditionRuns"
        :can-start="planning.canStart"
        :pending="game.commandPending"
        @start="start"
        @toggle-optional="ui.toggleOptionalNode"
        @select-route-variant="ui.selectRouteVariant"
      />
    </div>
    <RosterPresetNameDialog
      v-if="game.rosterPresets"
      :open="namingOpen"
      :default-name="game.rosterPresets.defaultName"
      :pending="game.commandPending"
      @confirm="saveCurrent"
      @close="namingOpen = false"
    />
    <RosterPresetManager
      v-if="game.rosterPresets"
      :open="managerOpen"
      :directory="game.rosterPresets"
      :initial-preset-id="selectedPresetId"
      :members="planning.members"
      :class-options="planning.classOptions"
      :role-options="planning.roleOptions"
      :pending="game.commandPending"
      @close="managerOpen = false"
      @create="createFromManager"
      @update="updateFromManager"
      @rename="renamePreset"
      @delete="deletePreset"
    />
    <RosterPresetReductionDialog
      :open="reductionOpen"
      :preset="selectedPreset"
      :maximum-members="planning.selectedDungeon?.maximumMembers ?? 0"
      @apply="applyMembers"
      @close="reductionOpen = false"
    />
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 17px;
}
.page-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
}
.page-heading h2 {
  margin: 3px 0 0;
  color: #f0dfbf;
  font-family: Georgia, serif;
  font-size: 2rem;
}
.kicker {
  margin: 0;
  color: #9b7438;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.page-heading label {
  display: grid;
  gap: 4px;
  color: #8f8575;
  font-size: 0.68rem;
}
select {
  min-width: 120px;
  padding: 8px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  color: #e2d5bb;
  background: #0b0e10;
}
.notice {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #3f7045;
  border-radius: 6px;
  color: #91cc96;
  background: #112016;
  font-size: 0.72rem;
}
.quest-summary {
  padding: 11px 13px;
  border: 1px solid #66502d;
  border-radius: 7px;
  background: #1a170f;
}
.quest-summary > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}
.quest-summary > summary span {
  color: #9e907c;
}
.quest-summary > summary small {
  color: #b08d50;
}
.quest-summary > summary em {
  color: #d1aa5b;
  font-size: 0.68rem;
  font-style: normal;
}
.quest-summary strong {
  color: #d7bd87;
}
.quest-summary p {
  margin: 3px 0 0;
  color: #958877;
  font-size: 0.7rem;
}
.development-benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.development-benefits span {
  padding: 5px 7px;
  border: 1px solid #4d432f;
  color: #bba77f;
  background: #11100c;
  font-size: 0.64rem;
}
.commission-preview {
  display: grid;
  gap: 7px;
  margin-top: 9px;
}
.commission-preview article {
  padding: 9px 10px;
  border: 1px solid #3c3529;
  background: #0c0e0e;
}
.commission-preview header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.commission-preview header span {
  color: #8f7f65;
  font-size: 0.62rem;
}
.commission-preview header span.covered {
  color: #8fb17c;
}
.commission-preview > article > small {
  display: block;
  margin-top: 4px;
  color: #837969;
  font-size: 0.62rem;
}
.commission-preview .route-hint {
  color: #c0964c;
}
.reward-pool {
  margin-top: 7px;
  color: #ae8a4a;
  font-size: 0.63rem;
}
.reward-pool span {
  display: inline-block;
  margin: 6px 6px 0 0;
  padding: 4px 6px;
  color: #bfb096;
  background: #17140f;
}
.run-upgrade {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid #4a4133;
  border-radius: 7px;
  background: #141411;
}
.run-upgrade strong {
  color: #d9c396;
}
.run-upgrade p {
  margin: 3px 0;
  color: #918777;
  font-size: 0.72rem;
}
.run-upgrade small {
  color: #b08e67;
}
.run-upgrade button {
  flex: 0 0 auto;
  padding: 9px 12px;
  border: 1px solid #9b793f;
  border-radius: 6px;
  color: #1b160f;
  background: #c99b4d;
  font-weight: 800;
  cursor: pointer;
}
.run-upgrade button:disabled {
  color: #777066;
  background: #282620;
  cursor: not-allowed;
}
.planning-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.8fr);
  align-items: start;
  gap: 12px;
}
.party-column {
  display: grid;
  gap: 12px;
  min-width: 0;
}
@media (max-width: 820px) {
  .planning-grid {
    grid-template-columns: 1fr;
  }
  .quest-summary {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
