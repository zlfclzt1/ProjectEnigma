<script setup lang="ts">
import type { ActivitySummaryView } from "../../application/queries/get-overview-view";

defineProps<{ activity: ActivitySummaryView; now: number }>();

function remainingLabel(nextSettlementAt: number | undefined, now: number): string {
  if (nextSettlementAt === undefined) return "等待结算";
  const seconds = Math.max(0, Math.ceil((nextSettlementAt - now) / 1_000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
</script>

<template>
  <article class="activity-card">
    <div>
      <strong>{{ activity.type === "expedition" ? "副本队伍" : activity.type }}</strong>
      <p>{{ activity.progressLabel }} · {{ activity.participantCount }} 人</p>
    </div>
    <time>{{ remainingLabel(activity.nextSettlementAt, now) }}</time>
  </article>
</template>

<style scoped>
.activity-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 15px 16px;
  border: 1px solid #343129;
  border-radius: 8px;
  background: #121518;
}
p {
  margin: 4px 0 0;
  color: #9e9484;
  font-size: 0.85rem;
}
time {
  color: #f2cc72;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}
</style>
