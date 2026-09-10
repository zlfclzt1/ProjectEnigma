<script setup lang="ts">
import { ref, watch } from "vue";
import type { MemberDungeonQuestClaim } from "../../application/commands/claim-member-dungeon-quests";
import type { QuestSettlementView } from "../../application/queries/get-quest-settlement-view";
import type { ItemDefinitionId } from "../../domain/shared/ids";

const props = defineProps<{
  open: boolean;
  settlement: QuestSettlementView | null;
  pending: boolean;
}>();

const emit = defineEmits<{
  confirm: [claims: readonly MemberDungeonQuestClaim[]];
  close: [];
}>();

const selectedRewards = ref<Record<string, ItemDefinitionId>>({});

watch(
  () => [props.open, props.settlement?.entries] as const,
  ([open, entries]) => {
    if (!open || !entries) return;
    selectedRewards.value = Object.fromEntries(
      entries.flatMap((entry) =>
        entry.recommendedItemId ? [[entry.key, entry.recommendedItemId]] : [],
      ),
    );
  },
  { immediate: true },
);

function confirm(): void {
  const claims = (props.settlement?.entries ?? []).map((entry) => ({
    memberId: entry.memberId,
    questId: entry.questId,
    ...(selectedRewards.value[entry.key]
      ? { itemDefinitionId: selectedRewards.value[entry.key] }
      : {}),
  }));
  emit("confirm", claims);
}
</script>

<template>
  <div
    v-if="open && settlement"
    class="meeting-backdrop"
    role="presentation"
    @click.self="$emit('close')"
  >
    <section
      class="settlement-meeting"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-title"
    >
      <header class="meeting-heading">
        <div>
          <p>公会任务结算会</p>
          <h2 id="settlement-title">集中确认任务奖励</h2>
          <small>
            {{ settlement.entries.length }} 项任务 ·
            {{ settlement.memberCount }} 名成员；系统已按专精、愿望单和即时提升给出建议。
          </small>
        </div>
        <button type="button" aria-label="关闭结算会" @click="$emit('close')">×</button>
      </header>

      <div class="settlement-list">
        <article v-for="entry in settlement.entries" :key="entry.key">
          <header>
            <div>
              <span>{{ entry.dungeonName }} · {{ entry.questName }}</span>
              <strong>{{ entry.memberName }}</strong>
              <small
                >{{ entry.specName }} · 经验 +{{ entry.experienceFraction.toFixed(2) }} 级</small
              >
            </div>
            <em v-if="entry.funds">{{ entry.funds }} G</em>
          </header>
          <p v-if="entry.fixedItemNames.length">固定奖励：{{ entry.fixedItemNames.join("、") }}</p>
          <label v-if="entry.choices.length">
            <span>选择装备奖励</span>
            <select v-model="selectedRewards[entry.key]">
              <option v-for="choice in entry.choices" :key="choice.id" :value="choice.id">
                {{ choice.recommended ? "推荐 · " : "" }}{{ choice.name }} · 装等
                {{ choice.itemLevel }}
              </option>
            </select>
          </label>
          <div v-if="entry.choices.length" class="recommendation">
            <template v-for="choice in entry.choices" :key="choice.id">
              <p v-if="selectedRewards[entry.key] === choice.id">
                <strong>{{ choice.recommended ? "系统推荐" : "当前选择" }}</strong>
                {{ choice.reasons.join(" · ") }}
              </p>
            </template>
          </div>
        </article>
      </div>

      <footer>
        <button type="button" :disabled="pending" @click="$emit('close')">稍后处理</button>
        <button
          class="primary"
          type="button"
          :disabled="pending || settlement.entries.length === 0"
          @click="confirm"
        >
          {{ pending ? "正在发放奖励……" : `确认并领取 ${settlement.entries.length} 项奖励` }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.meeting-backdrop {
  position: fixed;
  inset: 0;
  z-index: 85;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(0 0 0 / 74%);
}
.settlement-meeting {
  display: grid;
  gap: 14px;
  width: min(800px, 100%);
  max-height: min(850px, calc(100vh - 40px));
  overflow: auto;
  padding: 18px;
  border: 1px solid #8b6b36;
  border-radius: 9px;
  background: #111416;
  box-shadow: 0 24px 70px #000;
}
.meeting-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.meeting-heading p,
.meeting-heading h2,
.meeting-heading small {
  margin: 0;
}
.meeting-heading p {
  color: #a87d3c;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.meeting-heading h2 {
  margin-top: 3px;
  color: #ead8b8;
  font-family: Georgia, serif;
}
.meeting-heading small {
  color: #8d8373;
}
.meeting-heading > button {
  align-self: start;
  border: 0;
  color: #b8aa91;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
}
.settlement-list {
  display: grid;
  gap: 8px;
}
.settlement-list > article {
  display: grid;
  gap: 8px;
  padding: 11px;
  border: 1px solid #3d382f;
  background: #0b0e10;
}
.settlement-list article > header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
}
.settlement-list header div {
  display: grid;
}
.settlement-list header span {
  color: #ad8950;
  font-size: 0.61rem;
}
.settlement-list header strong {
  color: #dcc9a7;
}
.settlement-list header small,
.settlement-list p {
  color: #887e6e;
  font-size: 0.63rem;
}
.settlement-list em {
  color: #d4aa54;
  font-size: 0.7rem;
  font-style: normal;
}
.settlement-list p {
  margin: 0;
}
.settlement-list label {
  display: grid;
  gap: 4px;
  color: #958b7b;
  font-size: 0.62rem;
}
select {
  width: 100%;
  padding: 8px;
  border: 1px solid #514a3d;
  border-radius: 5px;
  color: #e2d5bb;
  background: #111416;
}
.recommendation {
  padding: 7px 9px;
  border-left: 2px solid #9f7737;
  background: #18150f;
}
.recommendation strong {
  margin-right: 5px;
  color: #d9b76d;
}
footer {
  display: flex;
  justify-content: end;
  gap: 7px;
}
footer button {
  padding: 9px 11px;
  border: 1px solid #5b5141;
  border-radius: 6px;
  color: #d0c1a8;
  background: #24231f;
  font-weight: 800;
  cursor: pointer;
}
footer button.primary {
  border-color: #b08743;
  color: #18130c;
  background: #d4a653;
}
footer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
