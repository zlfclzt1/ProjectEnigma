<script setup lang="ts">
defineProps<{ logs: readonly { readonly eventType: string; readonly text: string }[] }>();
</script>

<template>
  <ul class="combat-events">
    <li v-for="(log, index) in logs" :key="`${log.eventType}:${index}`">
      <span>{{ index + 1 }}</span>
      <p>{{ log.text }}</p>
    </li>
  </ul>
</template>

<style scoped>
.combat-events {
  display: grid;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}
li {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 9px;
  padding: 9px;
  background: #0a0d0f;
}
span {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 1px solid #5a4c32;
  border-radius: 50%;
  color: #ba914e;
  font-size: 0.58rem;
}
p {
  margin: 1px 0 0;
  color: #b5aa97;
  font-size: 0.72rem;
  line-height: 1.45;
}
</style>
