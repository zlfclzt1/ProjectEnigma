<script setup lang="ts">
import { ref } from "vue";
import { useGameStore } from "../../stores/game-store";
import type { MemberId, PendingLootId } from "../../domain/shared/ids";
import LootCard from "../components/LootCard.vue";

const game = useGameStore();
const notice = ref("");

async function assign(pendingLootId: PendingLootId, memberId: MemberId): Promise<void> {
  const outcome = await game.assignLoot(pendingLootId, memberId);
  if (outcome.ok) notice.value = "装备已经分配并立即穿上，被替换的装备已自动出售。";
}

async function sell(pendingLootId: PendingLootId): Promise<void> {
  const outcome = await game.sellLoot(pendingLootId);
  if (outcome.ok) notice.value = `装备已出售，公会资金增加 ${outcome.result} G。`;
}

async function autoAssign(): Promise<void> {
  const outcome = await game.autoAssignLoot();
  if (!outcome.ok) return;
  const result = outcome.result as { assigned: number; sold: number; locked: number };
  notice.value = `自动分配完成：装备 ${result.assigned} 件，出售 ${result.sold} 件，锁定 ${result.locked} 件。`;
}
</script>

<template>
  <section v-if="game.loot" class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">战利品议事厅</p>
        <h2>装备分配</h2>
      </div>
      <button
        type="button"
        :disabled="game.commandPending || game.loot.unlockedCount === 0"
        @click="autoAssign"
      >
        自动分配全部
      </button>
    </header>
    <p class="summary">
      {{ game.loot.pending.length }} 件待处理 · {{ game.loot.unlockedCount }} 件可分配 ·
      {{ game.loot.lockedCount }} 件等待连续副本结束
    </p>
    <p v-if="notice" class="notice">{{ notice }}</p>
    <div v-if="game.loot.pending.length" class="loot-grid">
      <LootCard
        v-for="entry in game.loot.pending"
        :key="entry.id"
        :loot="entry"
        :pending="game.commandPending"
        @assign="assign(entry.id, $event)"
        @sell="sell(entry.id)"
      />
    </div>
    <p v-else class="empty">没有待分配装备。出发打副本通常能改善这个情况。</p>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 14px;
}
.page-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
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
.page-heading button {
  min-height: 38px;
  padding: 8px 13px;
  border: 1px solid #ac8340;
  border-radius: 6px;
  color: #17130d;
  background: #d3a451;
  font-weight: 800;
  cursor: pointer;
}
.page-heading button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.summary {
  margin: 0;
  color: #918777;
  font-size: 0.72rem;
}
.notice {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #417047;
  border-radius: 6px;
  color: #8dcc93;
  background: #102016;
  font-size: 0.72rem;
}
.loot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 10px;
}
.empty {
  padding: 35px;
  border: 1px dashed #39352e;
  color: #908675;
  text-align: center;
}
</style>
