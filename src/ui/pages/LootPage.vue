<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { LootPlanOverride } from "../../application/queries/get-loot-plan";
import type { MemberId, PendingLootId } from "../../domain/shared/ids";
import { useGameStore } from "../../stores/game-store";
import ItemTooltip from "../components/ItemTooltip.vue";
import UpgradeComparison from "../components/UpgradeComparison.vue";

const game = useGameStore();
const overrides = ref<Record<string, LootPlanOverride>>({});
const selectedLootId = ref<PendingLootId | null>(null);
const notice = ref("");
const confirmingNoUpgradeSale = ref(false);

const plan = computed(() => game.lootPlan(Object.values(overrides.value)));
const selectedEntry = computed(() =>
  plan.value?.entries.find((entry) => entry.pendingLootId === selectedLootId.value),
);

watch(
  plan,
  (next) => {
    if (!next) return;
    if (!next.entries.some((entry) => entry.pendingLootId === selectedLootId.value)) {
      selectedLootId.value = next.entries[0]?.pendingLootId ?? null;
    }
  },
  { immediate: true },
);

function chooseMember(pendingLootId: PendingLootId, memberId: MemberId): void {
  overrides.value = {
    ...overrides.value,
    [pendingLootId]: { pendingLootId, action: "assign", memberId },
  };
}

function chooseSale(pendingLootId: PendingLootId): void {
  overrides.value = {
    ...overrides.value,
    [pendingLootId]: { pendingLootId, action: "sell" },
  };
}

function restoreRecommendation(pendingLootId: PendingLootId): void {
  const next = { ...overrides.value };
  delete next[pendingLootId];
  overrides.value = next;
}

async function executePlan(): Promise<void> {
  if (!plan.value?.entries.length) return;
  const outcome = await game.executeLootPlan(
    plan.value.entries.map((entry) =>
      entry.action === "assign"
        ? { pendingLootId: entry.pendingLootId, action: "assign", memberId: entry.memberId! }
        : { pendingLootId: entry.pendingLootId, action: "sell" },
    ),
  );
  if (!outcome.ok) return;
  const result = outcome.result as {
    assigned: number;
    sold: number;
    replaced: number;
    saleProceeds: number;
  };
  overrides.value = {};
  notice.value = `方案已执行：分配 ${result.assigned} 件，出售 ${result.sold} 件，替换旧装备 ${result.replaced} 件，回收 ${result.saleProceeds} G。`;
}

async function confirmNoUpgradeSale(): Promise<void> {
  const outcome = await game.sellNoUpgradeLoot();
  if (!outcome.ok) return;
  const result = outcome.result as { sold: number; saleProceeds: number };
  confirmingNoUpgradeSale.value = false;
  overrides.value = {};
  notice.value = `已出售 ${result.sold} 件无主职责提升装备，回收 ${result.saleProceeds} G。`;
}

function percent(value: number | undefined): string {
  if (value === undefined) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
</script>

<template>
  <section v-if="plan" class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">战利品议事厅</p>
        <h2>装备分配</h2>
        <p class="summary">
          {{ plan.entries.length }} 件待审核 · {{ plan.locked.length }} 件锁定 · 预计回收
          {{ plan.projectedSaleProceeds }} G
        </p>
      </div>
      <div class="heading-actions">
        <button
          type="button"
          class="secondary"
          :disabled="game.commandPending || plan.immediateNoUpgradeCount === 0"
          @click="confirmingNoUpgradeSale = true"
        >
          出售无主职责提升装备（{{ plan.immediateNoUpgradeCount }}）
        </button>
        <button
          type="button"
          :disabled="game.commandPending || plan.entries.length === 0"
          @click="executePlan"
        >
          执行分配方案
        </button>
      </div>
    </header>

    <p v-if="notice" class="notice">{{ notice }}</p>

    <div v-if="plan.entries.length || plan.locked.length" class="loot-workbench">
      <aside class="loot-queue" aria-label="装备审核队列">
        <header>
          <strong>审核队列</strong>
          <span>分配 {{ plan.assignedCount }} · 出售 {{ plan.soldCount }}</span>
        </header>
        <button
          v-for="entry in plan.entries"
          :key="entry.pendingLootId"
          type="button"
          class="queue-entry"
          :class="{
            selected: entry.pendingLootId === selectedLootId,
            changed: entry.manuallyChanged,
          }"
          @click="selectedLootId = entry.pendingLootId"
        >
          <span class="queue-icon" :class="`quality-${entry.item.quality}`">
            <img v-if="entry.item.iconUrl" :src="entry.item.iconUrl" :alt="entry.item.name" />
            <span v-else>{{ entry.item.name.slice(0, 1) }}</span>
          </span>
          <span class="queue-copy">
            <strong :class="`quality-${entry.item.quality}`">{{ entry.item.name }}</strong>
            <small>{{ entry.dungeonName }} · {{ entry.encounterName }}</small>
          </span>
          <span v-if="entry.action === 'assign'" class="queue-decision">
            <strong>{{ entry.selectedCandidate?.name }}</strong>
            <small>{{ percent(entry.selectedCandidate?.primaryPercent) }}</small>
          </span>
          <span v-else class="queue-decision sell-decision">
            <strong>出售</strong>
            <small>+{{ entry.saleValue }} G</small>
          </span>
          <em v-if="entry.manuallyChanged">已改派</em>
        </button>

        <details v-if="plan.locked.length" class="locked-group">
          <summary>锁定装备（{{ plan.locked.length }}）</summary>
          <div v-for="entry in plan.locked" :key="entry.id">
            <strong :class="`quality-${entry.item.quality}`">{{ entry.item.name }}</strong>
            <span>{{ entry.lockReason }}</span>
          </div>
        </details>
      </aside>

      <main v-if="selectedEntry" class="loot-detail">
        <header class="item-heading">
          <div class="item-icon" :class="`quality-${selectedEntry.item.quality}`">
            <img
              v-if="selectedEntry.item.iconUrl"
              :src="selectedEntry.item.iconUrl"
              :alt="selectedEntry.item.name"
            />
            <span v-else>{{ selectedEntry.item.name.slice(0, 1) }}</span>
            <ItemTooltip :item="selectedEntry.item" />
          </div>
          <div>
            <span>{{ selectedEntry.dungeonName }} · {{ selectedEntry.encounterName }}</span>
            <h3 :class="`quality-${selectedEntry.item.quality}`">
              {{ selectedEntry.item.name }}
            </h3>
            <p>
              物品等级 {{ selectedEntry.item.itemLevel }} · 出售 {{ selectedEntry.saleValue }} G
            </p>
          </div>
          <button
            v-if="selectedEntry.manuallyChanged"
            type="button"
            class="text-button"
            @click="restoreRecommendation(selectedEntry.pendingLootId)"
          >
            恢复系统推荐
          </button>
        </header>

        <section
          v-if="selectedEntry.action === 'assign' && selectedEntry.selectedCandidate"
          class="recommendation"
        >
          <div>
            <span>{{ selectedEntry.manuallyChanged ? "当前草稿" : "系统推荐" }}</span>
            <strong>{{ selectedEntry.selectedCandidate.name }}</strong>
            <small>
              {{ selectedEntry.selectedCandidate.specName }} ·
              {{ selectedEntry.selectedCandidate.roleName }}
            </small>
          </div>
          <div class="primary-gain">
            <span>主职责提升</span>
            <strong>{{ percent(selectedEntry.selectedCandidate.primaryPercent) }}</strong>
            <small>
              {{ selectedEntry.selectedCandidate.primaryBefore?.toFixed(2) }} →
              {{ selectedEntry.selectedCandidate.primaryAfter?.toFixed(2) }}
            </small>
          </div>
        </section>
        <section v-else class="sale-summary">
          <div>
            <span>{{ selectedEntry.manuallyChanged ? "当前草稿" : "系统推荐" }}</span>
            <strong>出售装备</strong>
          </div>
          <strong>+{{ selectedEntry.saleValue }} G</strong>
        </section>

        <section
          v-if="
            selectedEntry.selectedCandidate?.equippable &&
            selectedEntry.selectedCandidate.capabilityChanges
          "
          class="comparison"
        >
          <header>
            <div>
              <h4>换装影响</h4>
              <p>
                替换 {{ selectedEntry.selectedCandidate.replacementSlot }}：
                {{ selectedEntry.replacedItemNames.join("、") || "空栏位" }}
              </p>
            </div>
            <span v-if="selectedEntry.replacementSaleProceeds">
              旧装备出售 +{{ selectedEntry.replacementSaleProceeds }} G
            </span>
          </header>
          <div class="comparison-grid">
            <UpgradeComparison
              label="生存"
              :current="0"
              :candidate="selectedEntry.selectedCandidate.capabilityChanges.survivability"
            />
            <UpgradeComparison
              label="仇恨"
              :current="0"
              :candidate="selectedEntry.selectedCandidate.capabilityChanges.threat"
            />
            <UpgradeComparison
              label="治疗"
              :current="0"
              :candidate="selectedEntry.selectedCandidate.capabilityChanges.healing"
            />
            <UpgradeComparison
              label="伤害"
              :current="0"
              :candidate="selectedEntry.selectedCandidate.capabilityChanges.damage"
            />
          </div>
          <p class="reason-line">{{ selectedEntry.reasons.join("；") }}</p>
        </section>

        <section class="candidate-section">
          <header>
            <div>
              <h4>参战成员</h4>
              <p>按主职责相对提升百分比排序</p>
            </div>
            <button
              type="button"
              class="sell-button"
              :class="{ active: selectedEntry.action === 'sell' }"
              @click="chooseSale(selectedEntry.pendingLootId)"
            >
              改为出售 · {{ selectedEntry.saleValue }} G
            </button>
          </header>
          <button
            v-for="candidate in selectedEntry.candidates"
            :key="candidate.memberId"
            type="button"
            class="candidate-row"
            :class="{
              active:
                selectedEntry.action === 'assign' && candidate.memberId === selectedEntry.memberId,
              ineligible: !candidate.equippable,
            }"
            :disabled="!candidate.equippable"
            @click="chooseMember(selectedEntry.pendingLootId, candidate.memberId)"
          >
            <span>
              <strong>{{ candidate.name }}</strong>
              <small>{{ candidate.className }} · {{ candidate.specName }}</small>
            </span>
            <span>{{ candidate.roleName }}</span>
            <strong :class="{ negative: (candidate.primaryPercent ?? 0) <= 0 }">
              {{ candidate.equippable ? percent(candidate.primaryPercent) : "无法装备" }}
            </strong>
          </button>
        </section>
      </main>
      <main v-else class="loot-detail empty-detail">
        <p>当前只有锁定装备，连续副本结束后才能制定分配方案。</p>
      </main>
    </div>

    <p v-else class="empty">没有待分配装备。出发打副本通常能改善这个情况。</p>

    <div
      v-if="confirmingNoUpgradeSale && plan.immediateNoUpgradeCount > 0"
      class="modal-backdrop"
      @click.self="confirmingNoUpgradeSale = false"
    >
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sell-no-upgrade-title"
      >
        <h3 id="sell-no-upgrade-title">出售无主职责提升装备？</h3>
        <p>
          将出售 {{ plan.immediateNoUpgradeCount }} 件装备，获得
          {{ plan.immediateNoUpgradeSaleValue }} G。出售后无法撤销。
        </p>
        <footer>
          <button type="button" class="secondary" @click="confirmingNoUpgradeSale = false">
            取消
          </button>
          <button type="button" :disabled="game.commandPending" @click="confirmNoUpgradeSale">
            确认出售
          </button>
        </footer>
      </section>
    </div>
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
  gap: 18px;
}
.page-heading h2 {
  margin: 3px 0 4px;
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
.summary {
  margin: 0;
  color: #918777;
  font-size: 0.72rem;
}
.heading-actions {
  display: flex;
  gap: 9px;
}
button {
  min-height: 38px;
  padding: 8px 13px;
  border: 1px solid #ac8340;
  border-radius: 6px;
  color: #17130d;
  background: #d3a451;
  font-weight: 800;
  cursor: pointer;
}
button.secondary {
  border-color: #574d3c;
  color: #c8baa2;
  background: #171717;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
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
.loot-workbench {
  display: grid;
  grid-template-columns: minmax(360px, 42%) minmax(0, 1fr);
  min-height: 600px;
  overflow: hidden;
  border: 1px solid #37332c;
  border-radius: 9px;
  background: #0c0f11;
}
.loot-queue {
  overflow: auto;
  border-right: 1px solid #37332c;
  background: #0b0e10;
}
.loot-queue > header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  padding: 13px 14px;
  border-bottom: 1px solid #312e28;
  color: #d9c8a8;
  background: #101315;
  font-size: 0.72rem;
}
.loot-queue > header span {
  color: #8e8576;
}
.queue-entry {
  position: relative;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  width: 100%;
  min-height: 68px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid #282620;
  border-radius: 0;
  color: inherit;
  background: transparent;
  text-align: left;
}
.queue-entry:hover,
.queue-entry.selected {
  background: #171a1c;
}
.queue-entry.selected {
  box-shadow: inset 3px 0 #c59647;
}
.queue-entry.changed {
  background: #171710;
}
.queue-entry em {
  position: absolute;
  right: 10px;
  bottom: 4px;
  color: #c49a50;
  font-size: 0.58rem;
  font-style: normal;
}
.queue-icon,
.item-icon {
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 2px solid #555;
  border-radius: 5px;
  color: #d2c3a6;
  background: #20201c;
}
.queue-icon {
  width: 38px;
  height: 38px;
}
.queue-icon img,
.item-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.queue-copy,
.queue-decision {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.queue-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.queue-copy small,
.queue-decision small {
  color: #7f776b;
  font-size: 0.62rem;
}
.queue-decision {
  justify-items: end;
  padding-right: 2px;
}
.queue-decision strong {
  color: #d7c6a8;
  font-size: 0.72rem;
}
.queue-decision small {
  color: #6fbd78;
}
.sell-decision strong,
.sell-decision small {
  color: #b7aa94;
}
.locked-group {
  padding: 10px 12px;
  color: #8c8375;
  font-size: 0.68rem;
}
.locked-group summary {
  cursor: pointer;
  color: #ba746b;
}
.locked-group div {
  display: grid;
  gap: 3px;
  padding: 8px 4px;
  border-bottom: 1px solid #282620;
}
.locked-group span {
  color: #756f65;
}
.loot-detail {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 18px;
  overflow: auto;
}
.item-heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}
.item-icon {
  position: relative;
  width: 56px;
  height: 56px;
}
.item-icon :deep(.item-tooltip) {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  z-index: 30;
  display: none;
}
.item-icon:hover {
  overflow: visible;
}
.item-icon:hover :deep(.item-tooltip) {
  display: block;
}
.item-heading span,
.item-heading p {
  color: #81796d;
  font-size: 0.66rem;
}
.item-heading h3,
.item-heading p {
  margin: 3px 0 0;
}
.item-heading h3 {
  font-size: 1.2rem;
}
.text-button {
  align-self: start;
  min-height: auto;
  padding: 5px 8px;
  border-color: transparent;
  color: #a88a58;
  background: transparent;
  font-size: 0.65rem;
}
.recommendation,
.sale-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid #51452f;
  border-radius: 7px;
  background: #17150f;
}
.recommendation > div:first-child,
.primary-gain,
.sale-summary > div {
  display: grid;
  gap: 3px;
}
.recommendation span,
.sale-summary span,
.primary-gain span {
  color: #8c8375;
  font-size: 0.64rem;
}
.recommendation strong,
.sale-summary strong {
  color: #e0c895;
}
.recommendation small,
.primary-gain small {
  color: #8e8577;
  font-size: 0.66rem;
}
.primary-gain {
  justify-items: end;
}
.primary-gain strong {
  color: #73bd79;
  font-size: 1.35rem;
}
.comparison,
.candidate-section {
  padding: 13px;
  border: 1px solid #302d27;
  border-radius: 7px;
  background: #090c0e;
}
.comparison > header,
.candidate-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
h4 {
  margin: 0;
  color: #d7c4a1;
}
.comparison header p,
.candidate-section header p {
  margin: 3px 0 0;
  color: #837b6e;
  font-size: 0.65rem;
}
.comparison header > span {
  color: #b9a06d;
  font-size: 0.66rem;
}
.comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px 12px;
}
.reason-line {
  margin: 10px 0 0;
  color: #a99a79;
  font-size: 0.66rem;
}
.sell-button {
  min-height: 32px;
  padding: 6px 10px;
  border-color: #51473a;
  color: #bcae97;
  background: #171717;
  font-size: 0.66rem;
}
.sell-button.active {
  border-color: #a86a5c;
  color: #e0aaa0;
  background: #281513;
}
.candidate-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 70px 80px;
  width: 100%;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 5px;
  color: #958b7b;
  background: transparent;
  text-align: left;
}
.candidate-row:hover,
.candidate-row.active {
  border-color: #5b4d35;
  background: #17150f;
}
.candidate-row > span:first-child {
  display: grid;
  gap: 3px;
}
.candidate-row strong {
  color: #d4c5aa;
}
.candidate-row small {
  color: #787166;
  font-size: 0.62rem;
}
.candidate-row > strong {
  color: #6fbd78;
  text-align: right;
}
.candidate-row > strong.negative {
  color: #b7786e;
}
.candidate-row.ineligible {
  opacity: 0.42;
}
.quality-poor {
  color: #888;
  border-color: #777;
}
.quality-common {
  color: #ddd;
  border-color: #aaa;
}
.quality-uncommon {
  color: #55bf52;
  border-color: #279b32;
}
.quality-rare {
  color: #5e9bea;
  border-color: #357fcb;
}
.quality-epic {
  color: #b36ad8;
  border-color: #8e49bd;
}
.empty {
  padding: 35px;
  border: 1px dashed #39352e;
  color: #908675;
  text-align: center;
}
.empty-detail {
  place-items: center;
  color: #8f8575;
  text-align: center;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  padding: 20px;
  place-items: center;
  background: #000b;
}
.modal {
  width: min(440px, 100%);
  padding: 20px;
  border: 1px solid #805f38;
  border-radius: 9px;
  background: #121416;
  box-shadow: 0 24px 70px #000;
}
.modal h3 {
  margin-top: 0;
  color: #ebd9b9;
}
.modal p {
  color: #9f9584;
  line-height: 1.5;
}
.modal footer {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
}
@media (max-width: 900px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .heading-actions {
    justify-content: flex-end;
  }
  .loot-workbench {
    grid-template-columns: 1fr;
  }
  .loot-queue {
    max-height: 360px;
    border-right: 0;
    border-bottom: 1px solid #37332c;
  }
}
</style>
