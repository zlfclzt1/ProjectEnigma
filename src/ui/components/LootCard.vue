<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { PendingLootView } from "../../application/queries/get-loot-view";
import type { MemberId } from "../../domain/shared/ids";
import ItemTooltip from "./ItemTooltip.vue";
import UpgradeComparison from "./UpgradeComparison.vue";

const props = defineProps<{ loot: PendingLootView; pending: boolean }>();
const emit = defineEmits<{ assign: [memberId: MemberId]; sell: [] }>();
const selectedMemberId = ref<MemberId | null>(null);

watch(
  () => props.loot,
  (loot) => {
    selectedMemberId.value =
      loot.candidates.find((candidate) => candidate.equippable)?.memberId ??
      loot.candidates[0]?.memberId ??
      null;
  },
  { immediate: true },
);

const selectedCandidate = computed(() =>
  props.loot.candidates.find((candidate) => candidate.memberId === selectedMemberId.value),
);
</script>

<template>
  <article class="loot-card" :class="{ locked: loot.locked }">
    <header>
      <div class="item-icon">
        <img v-if="loot.item.iconUrl" :src="loot.item.iconUrl" :alt="loot.item.name" />
        <span v-else>{{ loot.item.name.slice(0, 1) }}</span>
        <ItemTooltip :item="loot.item" />
      </div>
      <div>
        <span>{{ loot.dungeonName }} · {{ loot.encounterName }}</span>
        <h3 :class="`quality-${loot.item.quality}`">{{ loot.item.name }}</h3>
        <p>物品等级 {{ loot.item.itemLevel }} · 出售 {{ loot.saleValue }} G</p>
      </div>
      <em v-if="loot.locked">锁定中</em>
    </header>

    <p v-if="loot.lockReason" class="lock-reason">{{ loot.lockReason }}</p>
    <template v-else>
      <label>
        <span>仅本次参战成员</span>
        <select v-model="selectedMemberId">
          <option
            v-for="candidate in loot.candidates"
            :key="candidate.memberId"
            :value="candidate.memberId"
          >
            {{ candidate.name }} · {{ candidate.className }} ·
            {{
              candidate.equippable
                ? `主职责 ${candidate.primaryDelta! >= 0 ? "+" : ""}${candidate.primaryDelta!.toFixed(2)}`
                : "无法装备"
            }}
          </option>
        </select>
      </label>

      <section
        v-if="selectedCandidate?.equippable && selectedCandidate.capabilityChanges"
        class="comparison"
      >
        <p>
          {{ selectedCandidate.specName }} · {{ selectedCandidate.roleName }} · 替换
          {{ selectedCandidate.replacementSlot }}
        </p>
        <UpgradeComparison
          label="生存"
          :current="0"
          :candidate="selectedCandidate.capabilityChanges.survivability"
        />
        <UpgradeComparison
          label="仇恨"
          :current="0"
          :candidate="selectedCandidate.capabilityChanges.threat"
        />
        <UpgradeComparison
          label="治疗"
          :current="0"
          :candidate="selectedCandidate.capabilityChanges.healing"
        />
        <UpgradeComparison
          label="伤害"
          :current="0"
          :candidate="selectedCandidate.capabilityChanges.damage"
        />
        <small>{{ selectedCandidate.reasons.join("；") }}</small>
      </section>
      <p v-else-if="selectedCandidate" class="not-eligible">
        {{ selectedCandidate.reasons.join("；") }}
      </p>

      <footer>
        <button
          type="button"
          :disabled="pending || !selectedCandidate?.equippable || !selectedMemberId"
          @click="selectedMemberId && $emit('assign', selectedMemberId)"
        >
          分配并装备
        </button>
        <button type="button" class="sell" :disabled="pending" @click="$emit('sell')">
          出售 {{ loot.saleValue }} G
        </button>
      </footer>
    </template>
  </article>
</template>

<style scoped>
.loot-card {
  padding: 15px;
  border: 1px solid #3d382f;
  border-radius: 8px;
  background: #111416;
}
.loot-card.locked {
  opacity: 0.72;
}
header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
}
.item-icon {
  position: relative;
  display: grid;
  width: 50px;
  height: 50px;
  place-items: center;
  border: 2px solid #4b7ec2;
  border-radius: 5px;
  color: #d2c3a6;
  background: #20201c;
}
.item-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.item-icon :deep(.item-tooltip) {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  z-index: 30;
  display: none;
}
.item-icon:hover :deep(.item-tooltip) {
  display: block;
}
header span,
header p {
  color: #81796d;
  font-size: 0.64rem;
}
h3,
header p {
  margin: 3px 0 0;
}
.quality-uncommon {
  color: #55bf52;
}
.quality-rare {
  color: #5e9bea;
}
.quality-epic {
  color: #b36ad8;
}
header em {
  color: #ca756a;
  font-size: 0.68rem;
  font-style: normal;
}
.lock-reason,
.not-eligible {
  margin: 12px 0 0;
  color: #be6e64;
  font-size: 0.7rem;
}
label {
  display: grid;
  gap: 5px;
  margin-top: 13px;
  color: #8e8576;
  font-size: 0.68rem;
}
select {
  width: 100%;
  padding: 8px;
  border: 1px solid #4a4439;
  border-radius: 5px;
  color: #ddd0b8;
  background: #090c0e;
}
.comparison {
  display: grid;
  gap: 4px;
  padding: 10px;
  margin-top: 10px;
  background: #090c0e;
}
.comparison p,
.comparison small {
  margin: 0 0 4px;
  color: #8c8375;
  font-size: 0.65rem;
}
.comparison small {
  margin: 5px 0 0;
  color: #b7a881;
}
footer {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
button {
  flex: 1;
  min-height: 37px;
  border: 1px solid #ae8440;
  border-radius: 5px;
  color: #18130c;
  background: #d0a04e;
  font-weight: 800;
  cursor: pointer;
}
button.sell {
  border-color: #574d3c;
  color: #bdb19c;
  background: #171717;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
</style>
