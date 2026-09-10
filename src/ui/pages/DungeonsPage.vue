<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useGameStore } from "../../stores/game-store";
import { useUiStore } from "../../stores/ui-store";
import DungeonSelector from "../components/DungeonSelector.vue";
import PartyBuilder from "../components/PartyBuilder.vue";
import PartyPreview from "../components/PartyPreview.vue";

const game = useGameStore();
const ui = useUiStore();
const notice = ref("");
const planning = computed(() =>
  game.dungeonPlanning(
    ui.selectedDungeonId,
    ui.selectedPartyMemberIds,
    ui.requestedExpeditionRuns,
    ui.selectedOptionalNodeIds,
  ),
);

watchEffect(() => {
  const selected = planning.value?.selectedDungeon;
  if (selected && ui.selectedDungeonId !== selected.id) ui.selectDungeon(selected.id);
});

async function start(): Promise<void> {
  const dungeon = planning.value?.selectedDungeon;
  if (!dungeon) return;
  notice.value = "";
  const outcome = await game.startExpedition(
    dungeon.id,
    ui.selectedPartyMemberIds,
    ui.requestedExpeditionRuns,
    ui.selectedOptionalNodeIds,
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
      @select="ui.selectDungeon"
    />
    <p v-if="notice" class="notice">{{ notice }}</p>
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
      <PartyPreview
        :dungeon="planning.selectedDungeon"
        :preview="planning.preview"
        :mechanic-readiness="planning.mechanicReadiness"
        :optional-routes="planning.optionalRoutes"
        :rare-routes="planning.rareRoutes"
        :issues="planning.issues"
        :requested-runs="ui.requestedExpeditionRuns"
        :can-start="planning.canStart"
        :pending="game.commandPending"
        @start="start"
        @toggle-optional="ui.toggleOptionalNode"
      />
    </div>
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
@media (max-width: 820px) {
  .planning-grid {
    grid-template-columns: 1fr;
  }
}
</style>
