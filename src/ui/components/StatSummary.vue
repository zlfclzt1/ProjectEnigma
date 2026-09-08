<script setup lang="ts">
import type {
  ItemStatLineView,
  MemberDetailView,
} from "../../application/queries/get-members-view";

defineProps<{
  stats: readonly ItemStatLineView[];
  capabilities: MemberDetailView["capabilities"];
}>();

const capabilityNames: Readonly<Record<keyof MemberDetailView["capabilities"], string>> = {
  survivability: "生存",
  threat: "仇恨",
  healing: "治疗",
  damage: "伤害",
};
</script>

<template>
  <section class="stat-summary">
    <div>
      <h3>装备面板属性</h3>
      <dl class="stat-grid">
        <div v-for="stat in stats" :key="stat.id">
          <dt>{{ stat.label }}</dt>
          <dd>{{ stat.value }}</dd>
        </div>
      </dl>
    </div>
    <div>
      <h3>派生战斗能力</h3>
      <dl class="capability-grid">
        <div v-for="(value, id) in capabilities" :key="id">
          <dt>{{ capabilityNames[id] }}</dt>
          <dd>{{ value.toFixed(2) }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.stat-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.stat-summary > div {
  padding: 16px;
  border: 1px solid #36322b;
  border-radius: 8px;
  background: #111416;
}
h3 {
  margin: 0 0 12px;
  color: #decba8;
  font-size: 0.95rem;
}
.stat-grid,
.capability-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px 12px;
  margin: 0;
}
.stat-grid div,
.capability-grid div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
dt {
  color: #948a79;
  font-size: 0.72rem;
}
dd {
  margin: 0;
  color: #73c879;
  font-size: 0.76rem;
  font-weight: 700;
}
.capability-grid dd {
  color: #f0c96d;
}
@media (max-width: 650px) {
  .stat-summary {
    grid-template-columns: 1fr;
  }
}
</style>
