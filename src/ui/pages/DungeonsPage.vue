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
import type { DungeonRouteNodeId, MemberId, RosterPresetId } from "../../domain/shared/ids";

const game = useGameStore();
const ui = useUiStore();
const notice = ref("");
const selectedPresetId = ref<RosterPresetId | null>(null);
const namingOpen = ref(false);
const managerOpen = ref(false);
const partyEditorOpen = ref(false);
const planning = computed(() =>
  game.dungeonPlanning(
    ui.selectedDungeonId,
    ui.selectedPartyMemberIds,
    ui.requestedExpeditionRuns,
    ui.selectedOptionalNodeIds,
    ui.selectedRouteVariantId,
    ui.routeSelections,
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
  const messages = [`已切换至“${preset.name}”，当前队伍 ${memberIds.length} 人。`];
  if (preset.activeCount) messages.push(`${preset.activeCount} 名成员正在参加其他活动。`);
  if (preset.departedCount) messages.push(`${preset.departedCount} 名已离队成员已跳过。`);
  return messages.join(" ");
}

function selectPreset(presetId: RosterPresetId | null): void {
  selectedPresetId.value = presetId;
  partyEditorOpen.value = false;
  if (!presetId) return;
  const preset = game.rosterPresets?.presets.find((entry) => entry.id === presetId);
  if (!preset) return;
  ui.setPartyMembers(preset.currentMemberIds);
  notice.value = appliedNotice(preset, preset.currentMemberIds);
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
      <div class="page-tools">
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
        <details v-if="planning.runCapacityUpgrade" class="run-upgrade">
          <summary>
            <span>连刷上限 {{ planning.maximumRuns }} 次</span>
            <em>{{ planning.runCapacityUpgrade.canPurchase ? "可升级" : "查看条件" }}</em>
          </summary>
          <div class="run-upgrade-body">
            <div>
              <strong>{{ planning.runCapacityUpgrade.name }}</strong>
              <p>{{ planning.runCapacityUpgrade.description }}</p>
              <small v-if="planning.runCapacityUpgrade.blockedReasons.length">
                {{ planning.runCapacityUpgrade.blockedReasons.join("；") }}
              </small>
              <small v-else>里程碑与资金均已满足，可以扩充连续挑战上限。</small>
            </div>
            <button
              type="button"
              :disabled="game.commandPending || !planning.runCapacityUpgrade.canPurchase"
              @click="purchaseRunCapacity"
            >
              升级至 {{ planning.runCapacityUpgrade.targetCapacity }} 次 ·
              {{ planning.runCapacityUpgrade.cost }} G
            </button>
          </div>
        </details>
      </div>
    </header>

    <RosterPresetBar
      v-if="game.rosterPresets"
      :presets="game.rosterPresets.presets"
      :selected-preset-id="selectedPresetId"
      :selected-member-count="ui.selectedPartyMemberIds.length"
      :maximum-presets="game.rosterPresets.maximumPresets"
      :pending="game.commandPending"
      @select="selectPreset"
      @save-current="namingOpen = true"
      @update-current="updateCurrent()"
      @manage="managerOpen = true"
    />
    <p v-if="notice" class="notice">{{ notice }}</p>

    <section class="party-summary panel">
      <div>
        <span class="summary-label">当前队伍</span>
        <strong v-if="ui.selectedPartyMemberIds.length">
          {{ ui.selectedPartyMemberIds.length }} 人
        </strong>
        <strong v-else class="muted">尚未选择成员</strong>
        <div v-if="ui.selectedPartyMemberIds.length" class="member-chips">
          <span
            v-for="member in planning.members.filter((entry) =>
              ui.selectedPartyMemberIds.includes(entry.id),
            )"
            :key="member.id"
          >
            {{ member.name }}
          </span>
        </div>
      </div>
      <button type="button" class="quiet" @click="partyEditorOpen = !partyEditorOpen">
        {{ partyEditorOpen ? "收起成员编辑" : "调整成员" }}
      </button>
    </section>

    <PartyBuilder
      v-if="partyEditorOpen"
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

    <div class="planning-grid">
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
      <PartyPreview
        :dungeon="planning.selectedDungeon"
        :preview="planning.preview"
        :mechanic-readiness="planning.mechanicReadiness"
        :optional-routes="planning.optionalRoutes"
        :rare-routes="planning.rareRoutes"
        :route-variants="planning.routeVariants"
        :quest-route-warnings="planning.questRouteWarnings"
        :quest-brief="questBrief"
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
.planning-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.86fr) minmax(0, 1.34fr);
  align-items: start;
  gap: 12px;
}
.page-tools {
  display: flex;
  align-items: end;
  gap: 10px;
}
.page-tools > label {
  display: grid;
  gap: 4px;
  color: #8f8575;
  font-size: 0.68rem;
}
.run-upgrade {
  min-width: 0;
  padding: 0;
  border-color: #51452f;
  background: #141411;
}
.run-upgrade > summary {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  color: #c9b17b;
  font-size: 0.63rem;
  cursor: pointer;
  list-style: none;
}
.run-upgrade > summary::-webkit-details-marker {
  display: none;
}
.run-upgrade > summary em {
  color: #8fb17c;
  font-size: 0.56rem;
  font-style: normal;
}
.run-upgrade-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;
  border-top: 1px solid #3c3529;
}
.run-upgrade-body strong {
  color: #d9c396;
  font-size: 0.68rem;
}
.run-upgrade-body p {
  margin: 3px 0;
  color: #918777;
  font-size: 0.63rem;
}
.run-upgrade-body small {
  color: #b08e67;
  font-size: 0.58rem;
}
.run-upgrade-body button {
  flex: 0 0 auto;
  padding: 7px 9px;
  border: 1px solid #9b793f;
  border-radius: 6px;
  color: #1b160f;
  background: #c99b4d;
  font-size: 0.62rem;
  font-weight: 800;
  cursor: pointer;
}
.run-upgrade-body button:disabled {
  color: #777066;
  background: #282620;
  cursor: not-allowed;
}
.panel {
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid #37332c;
  border-radius: 8px;
  background: #111416;
}
.party-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.summary-label {
  display: block;
  margin-bottom: 3px;
  color: #8f8575;
  font-size: 0.6rem;
}
.party-summary strong {
  color: #e2c57f;
  font-size: 0.8rem;
}
.party-summary strong.muted {
  color: #8f8575;
  font-weight: 500;
}
.member-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}
.member-chips span {
  padding: 3px 6px;
  border: 1px solid #40382c;
  border-radius: 4px;
  color: #b7aa91;
  background: #0b0e10;
  font-size: 0.58rem;
}
.party-summary button.quiet {
  flex: 0 0 auto;
  padding: 8px 10px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  color: #cdbb98;
  background: #1b1b18;
  cursor: pointer;
}
@media (max-width: 820px) {
  .planning-grid {
    grid-template-columns: 1fr;
  }
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .page-tools {
    align-items: stretch;
    flex-wrap: wrap;
  }
  .page-tools > label {
    flex: 1 1 150px;
  }
  .run-upgrade {
    flex: 1 1 100%;
  }
  .run-upgrade-body {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
