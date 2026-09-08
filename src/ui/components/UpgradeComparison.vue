<script setup lang="ts">
defineProps<{
  label: string;
  current: number;
  candidate: number;
  unit?: string;
}>();
</script>

<template>
  <div class="upgrade-comparison" :class="{ gain: candidate > current, loss: candidate < current }">
    <span>{{ label }}</span>
    <span>{{ current.toFixed(2) }}{{ unit }}</span>
    <strong
      >{{ candidate >= current ? "+" : "" }}{{ (candidate - current).toFixed(2) }}{{ unit }}</strong
    >
  </div>
</template>

<style scoped>
.upgrade-comparison {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  color: #aca18d;
  font-size: 0.76rem;
}
strong {
  color: #aaa;
}
.gain strong {
  color: #68bd70;
}
.loss strong {
  color: #cc7064;
}
</style>
