<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <nav class="game-navigation" aria-label="公会功能">
    <RouterLink to="/overview">公会总览</RouterLink>
    <RouterLink to="/recruitment">招募大厅</RouterLink>
    <RouterLink to="/members">公会成员</RouterLink>
    <RouterLink to="/dungeons">副本组队</RouterLink>
    <RouterLink to="/activities">活动进度</RouterLink>
    <RouterLink to="/loot">装备分配</RouterLink>
    <RouterLink to="/catalog">装备图鉴</RouterLink>
    <RouterLink to="/reports">战斗记录</RouterLink>
    <RouterLink to="/quests">副本任务</RouterLink>
  </nav>
</template>

<style scoped>
.game-navigation {
  display: flex;
  gap: 8px;
  margin: 20px 0 28px;
  overflow-x: auto;
}
a {
  padding: 10px 14px;
  border: 1px solid #37332b;
  border-radius: 7px;
  color: #b8ad99;
  text-decoration: none;
  white-space: nowrap;
}
a:hover,
a.router-link-active {
  border-color: #a67d39;
  color: #f2cc72;
  background: #211d16;
}
</style>
