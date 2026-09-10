<script setup lang="ts">
import type {
  ExpeditionQuestBriefEntryView,
  ExpeditionQuestBriefView,
} from "../../application/queries/get-expedition-quest-brief-view";
import type { QuestId } from "../../domain/shared/ids";

defineProps<{
  open: boolean;
  brief: ExpeditionQuestBriefView | null;
  selectedQuestIds: readonly QuestId[];
  currentProbability: number | null;
  currentDurationSeconds: number | null;
  plannedProbability: number | null;
  plannedDurationSeconds: number | null;
  addedRouteBossNames: readonly string[];
  pending: boolean;
}>();

defineEmits<{
  toggleQuest: [questId: QuestId];
  approveRoute: [];
  approveOnly: [];
  skip: [];
  close: [];
}>();

function memberLabel(entry: ExpeditionQuestBriefEntryView): string {
  return entry.applicantNames.join("、");
}

function probabilityLabel(value: number | null): string {
  return value === null ? "待评估" : `${(value * 100).toFixed(2)}%`;
}

function durationLabel(seconds: number | null): string {
  if (seconds === null) return "待评估";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
</script>

<template>
  <div v-if="open && brief" class="brief-backdrop" role="presentation" @click.self="$emit('close')">
    <section
      class="quest-brief"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quest-brief-title"
    >
      <header class="brief-heading">
        <div>
          <p>出征前任务简报</p>
          <h2 id="quest-brief-title">{{ brief.dungeonName }} · 行动审批</h2>
          <small>勾选要批准的委托，再决定是否把任务目标纳入本次路线。</small>
        </div>
        <button class="close-button" type="button" aria-label="关闭" @click="$emit('close')">
          ×
        </button>
      </header>

      <div class="brief-summary">
        <span
          ><strong>{{ brief.applicationCount }}</strong> 项成员申请</span
        >
        <span
          ><strong>{{ brief.acceptedCount }}</strong> 项进行中任务</span
        >
        <span
          ><strong>{{ brief.entries.length }}</strong> 个相关委托</span
        >
      </div>

      <div class="brief-entries">
        <article v-for="entry in brief.entries" :key="entry.questId">
          <label v-if="entry.applicantMemberIds.length">
            <input
              type="checkbox"
              :checked="selectedQuestIds.includes(entry.questId)"
              @change="$emit('toggleQuest', entry.questId)"
            />
            <span>
              <strong>{{ entry.questName }}</strong>
              <small>{{ entry.objectiveLabel }}</small>
            </span>
          </label>
          <div v-else class="accepted-title">
            <span class="seal">进行中</span>
            <span
              ><strong>{{ entry.questName }}</strong
              ><small>{{ entry.objectiveLabel }}</small></span
            >
          </div>
          <p v-if="entry.applicantMemberIds.length">申请成员：{{ memberLabel(entry) }}</p>
          <p v-if="entry.acceptedMemberIds.length">已接取：{{ entry.acceptedNames.join("、") }}</p>
          <blockquote v-if="entry.representativeApplicationLine">
            {{ entry.representativeApplicationLine }}
          </blockquote>
          <p class="publisher-line">{{ entry.publisher.name }} · {{ entry.publisher.location }}</p>
          <p v-if="entry.requiredOptionalBossNames.length" class="route-note">
            需要绕行：{{ entry.requiredOptionalBossNames.join("、") }}
          </p>
        </article>
      </div>

      <section class="route-impact">
        <header>
          <div><strong>路线影响确认</strong><small>不会未经确认改动当前路线</small></div>
          <span v-if="addedRouteBossNames.length">新增 {{ addedRouteBossNames.join("、") }}</span>
          <span v-else>无需额外绕行</span>
        </header>
        <div class="impact-grid">
          <div>
            <small>当前路线胜率</small><strong>{{ probabilityLabel(currentProbability) }}</strong>
          </div>
          <div>
            <small>任务路线胜率</small><strong>{{ probabilityLabel(plannedProbability) }}</strong>
          </div>
          <div>
            <small>当前单次耗时</small><strong>{{ durationLabel(currentDurationSeconds) }}</strong>
          </div>
          <div>
            <small>任务单次耗时</small><strong>{{ durationLabel(plannedDurationSeconds) }}</strong>
          </div>
        </div>
      </section>

      <footer>
        <button class="skip-button" type="button" :disabled="pending" @click="$emit('skip')">
          本次跳过并出发
        </button>
        <div>
          <button type="button" :disabled="pending" @click="$emit('approveOnly')">
            {{ brief.applicationCount ? "只接任务并出发" : "按当前路线出发" }}
          </button>
          <button class="primary" type="button" :disabled="pending" @click="$emit('approveRoute')">
            {{ brief.applicationCount ? "批准并纳入路线" : "纳入路线并出发" }}
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.brief-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(0 0 0 / 72%);
}
.quest-brief {
  display: grid;
  gap: 14px;
  width: min(760px, 100%);
  max-height: min(820px, calc(100vh - 40px));
  overflow: auto;
  padding: 18px;
  border: 1px solid #8b6b36;
  border-radius: 9px;
  background: #111416;
  box-shadow: 0 24px 70px #000;
}
.brief-heading {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}
.brief-heading p,
.brief-heading h2,
.brief-heading small {
  margin: 0;
}
.brief-heading p {
  color: #a87d3c;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.brief-heading h2 {
  margin-top: 3px;
  color: #ead8b8;
  font-family: Georgia, serif;
}
.brief-heading small {
  color: #8d8373;
}
.close-button {
  align-self: start;
  border: 0;
  color: #b8aa91;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
}
.brief-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.brief-summary span {
  padding: 9px;
  border: 1px solid #37332c;
  color: #958b7b;
  background: #0b0e10;
  font-size: 0.65rem;
  text-align: center;
}
.brief-summary strong {
  color: #dfb75d;
  font-size: 1rem;
}
.brief-entries {
  display: grid;
  gap: 7px;
}
.brief-entries article {
  padding: 10px;
  border: 1px solid #3d382f;
  background: #0b0e10;
}
.brief-entries label,
.accepted-title {
  display: flex;
  align-items: start;
  gap: 8px;
  cursor: pointer;
}
.brief-entries input {
  margin-top: 3px;
  accent-color: #c89543;
}
.brief-entries label span,
.accepted-title span:last-child {
  display: grid;
}
.brief-entries strong {
  color: #dcc9a7;
  font-size: 0.75rem;
}
.brief-entries small,
.brief-entries p {
  color: #887e6e;
  font-size: 0.62rem;
}
.brief-entries blockquote {
  margin: 6px 0 0 23px;
  padding-left: 8px;
  border-left: 2px solid #66502f;
  color: #b5a58b;
  font-size: 0.63rem;
}
.brief-entries .publisher-line {
  color: #9c7c4c;
}
.brief-entries p {
  margin: 5px 0 0 23px;
}
.brief-entries .route-note {
  color: #c69c54;
}
.seal {
  padding: 3px 5px;
  border: 1px solid #4b6849;
  color: #8eb68c;
  font-size: 0.57rem;
}
.route-impact {
  display: grid;
  gap: 8px;
  padding: 11px;
  border: 1px solid #6c552f;
  background: #19160f;
}
.route-impact header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 10px;
}
.route-impact header div {
  display: grid;
}
.route-impact header strong {
  color: #dbc18a;
  font-size: 0.76rem;
}
.route-impact header small {
  color: #827664;
  font-size: 0.6rem;
}
.route-impact header > span {
  color: #d5a653;
  font-size: 0.64rem;
  text-align: right;
}
.impact-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
}
.impact-grid div {
  display: grid;
  gap: 2px;
  padding: 8px;
  background: #0a0d0e;
  text-align: center;
}
.impact-grid small {
  color: #776f63;
  font-size: 0.58rem;
}
.impact-grid strong {
  color: #d9c9aa;
  font-size: 0.72rem;
}
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
footer > div {
  display: flex;
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
footer .skip-button {
  border: 0;
  color: #998c78;
  background: transparent;
}
footer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
@media (max-width: 620px) {
  .impact-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  footer {
    align-items: stretch;
    flex-direction: column-reverse;
  }
  footer > div {
    display: grid;
  }
}
</style>
