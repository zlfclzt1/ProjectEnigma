<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type {
  CatalogItemView,
  DungeonCatalogView,
  EncounterCatalogView,
  RouteRewardCatalogView,
} from "../../application/queries/get-item-catalog-view";
import type { EquipmentSlot } from "../../domain/equipment/equipment-slot";
import type { CollectionRewardId } from "../../domain/shared/ids";
import { useGameStore } from "../../stores/game-store";
import CatalogItemCard from "../components/CatalogItemCard.vue";
import ItemCatalogFilters, {
  type CatalogAcquiredFilter,
  type CatalogQualityFilter,
} from "../components/ItemCatalogFilters.vue";

const game = useGameStore();
const dungeonId = ref("");
const encounterId = ref("");
const itemSetId = ref("");
const suffixId = ref("");
const quality = ref<CatalogQualityFilter>("");
const slot = ref<"" | EquipmentSlot>("");
const acquired = ref<CatalogAcquiredFilter>("all");
const pendingRewardId = ref<CollectionRewardId | null>(null);
const rewardMessage = ref("");

const encounterOptions = computed(() => {
  const dungeons = game.itemCatalog?.dungeons ?? [];
  return dungeons
    .filter(
      (dungeon) => dungeon.unlocked && (dungeonId.value === "" || dungeon.id === dungeonId.value),
    )
    .flatMap((dungeon) =>
      dungeon.unlocked
        ? dungeon.encounters.map((encounter) => ({
            id: encounter.id,
            name: `${dungeon.name} · ${encounter.name}`,
          }))
        : [],
    );
});

watch(encounterOptions, (options) => {
  if (encounterId.value && !options.some((option) => option.id === encounterId.value)) {
    encounterId.value = "";
  }
});

const setOptions = computed(
  () => game.itemCatalog?.itemSets.map((set) => ({ id: set.id, name: set.name })) ?? [],
);

const suffixOptions = computed(() => {
  const suffixes = new Map<string, string>();
  for (const dungeon of game.itemCatalog?.dungeons ?? []) {
    if (!dungeon.unlocked) continue;
    for (const item of dungeon.encounters.flatMap((encounter) => encounter.items)) {
      for (const suffix of item.possibleRandomSuffixes) suffixes.set(suffix.id, suffix.name);
    }
  }
  return [...suffixes].map(([id, name]) => ({ id, name }));
});

const filteredDungeons = computed<readonly DungeonCatalogView[]>(() => {
  const dungeons = game.itemCatalog?.dungeons ?? [];
  return dungeons
    .filter((dungeon) => dungeonId.value === "" || dungeon.id === dungeonId.value)
    .map((dungeon): DungeonCatalogView => {
      if (!dungeon.unlocked) return dungeon;
      return {
        ...dungeon,
        encounters: dungeon.encounters
          .filter((encounter) => encounterId.value === "" || encounter.id === encounterId.value)
          .map((encounter): EncounterCatalogView => ({
            ...encounter,
            items: encounter.items.filter(itemMatchesFilters),
          })),
        routeRewards:
          encounterId.value === ""
            ? dungeon.routeRewards.map((reward): RouteRewardCatalogView => ({
                ...reward,
                items: reward.items.filter(itemMatchesFilters),
              }))
            : [],
      };
    });
});

const displayedItemCount = computed(() =>
  filteredDungeons.value.reduce(
    (total, dungeon) =>
      total +
      (dungeon.unlocked
        ? dungeon.encounters.reduce((sum, encounter) => sum + encounter.items.length, 0) +
          dungeon.routeRewards.reduce((sum, reward) => sum + reward.items.length, 0)
        : 0),
    0,
  ),
);

function itemMatchesFilters(item: CatalogItemView): boolean {
  if (quality.value && item.quality !== quality.value) return false;
  if (slot.value && item.slot !== slot.value) return false;
  if (acquired.value === "acquired" && !item.acquired) return false;
  if (acquired.value === "missing" && item.acquired) return false;
  if (itemSetId.value && !item.itemSetIds.some((id) => id === itemSetId.value)) return false;
  if (
    suffixId.value &&
    !item.possibleRandomSuffixes.some((suffix) => suffix.id === suffixId.value)
  ) {
    return false;
  }
  return true;
}

function effectLabel(
  effect: NonNullable<typeof game.itemCatalog>["rewards"][number]["effects"][number],
): string {
  if (effect.type === "guild-funds") return `公会资金 ${effect.amount} G`;
  if (effect.type === "management-unlock") {
    return effect.featureId === "level_cap_60"
      ? "成员等级上限提高至 60 级"
      : `管理功能：${effect.featureId}`;
  }
  return `展示记录：${effect.recordId}`;
}

function progressLabel(acquiredCount: number, totalCount: number, percent: number): string {
  return `${acquiredCount} / ${totalCount} · ${percent.toFixed(1)}%`;
}

async function claimReward(rewardId: CollectionRewardId): Promise<void> {
  pendingRewardId.value = rewardId;
  rewardMessage.value = "";
  const outcome = await game.claimCollectionReward(rewardId);
  pendingRewardId.value = null;
  rewardMessage.value = outcome.ok ? "收藏奖励已领取。" : outcome.error.message;
}
</script>

<template>
  <section v-if="game.itemCatalog" class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">公会收藏室</p>
        <h2>装备图鉴</h2>
      </div>
      <div class="global-progress">
        <span>全部副本装备</span>
        <strong>
          {{
            progressLabel(
              game.itemCatalog.globalProgress.acquiredItemCount,
              game.itemCatalog.globalProgress.totalItemCount,
              game.itemCatalog.globalProgress.completionPercent,
            )
          }}
        </strong>
      </div>
    </header>

    <ItemCatalogFilters
      :dungeons="game.itemCatalog.dungeons"
      :encounter-options="encounterOptions"
      :set-options="setOptions"
      :suffix-options="suffixOptions"
      :dungeon-id="dungeonId"
      :encounter-id="encounterId"
      :item-set-id="itemSetId"
      :suffix-id="suffixId"
      :quality="quality"
      :slot="slot"
      :acquired="acquired"
      @update:dungeon-id="dungeonId = $event"
      @update:encounter-id="encounterId = $event"
      @update:item-set-id="itemSetId = $event"
      @update:suffix-id="suffixId = $event"
      @update:quality="quality = $event"
      @update:slot="slot = $event"
      @update:acquired="acquired = $event"
    />

    <p class="result-summary">当前筛选显示 {{ displayedItemCount }} 条 Boss 掉落</p>

    <section class="dungeon-list" aria-label="副本装备目录">
      <article
        v-for="dungeon in filteredDungeons"
        :key="dungeon.id"
        class="dungeon-catalog"
        :class="{ locked: !dungeon.unlocked }"
      >
        <header>
          <div>
            <span>{{ dungeon.unlocked ? "已解锁副本" : "尚未解锁" }}</span>
            <h3>{{ dungeon.name }}</h3>
          </div>
          <div v-if="dungeon.unlocked" class="dungeon-progress">
            <strong>
              {{
                progressLabel(
                  dungeon.acquiredItemCount,
                  dungeon.totalItemCount,
                  dungeon.completionPercent,
                )
              }}
            </strong>
            <template v-if="dungeon.development.totalCommissionCount">
              <span>副本开发 Lv.{{ dungeon.development.level }}</span>
              <small>
                经验 +{{ dungeon.development.experienceBonusPercent }}% · 额外装备
                {{ dungeon.development.extraLootPercent }}% / Boss
              </small>
              <small v-if="dungeon.development.unlockedItemCount">
                已纳入掉落池 {{ dungeon.development.unlockedItemCount }} 件开发装备
              </small>
            </template>
          </div>
          <strong v-else>装备资料封存中</strong>
        </header>

        <template v-if="dungeon.unlocked">
          <aside
            v-if="dungeon.development.hiddenItemCount"
            class="unresolved-development"
            aria-label="未查明的开发装备"
          >
            <span>?</span>
            <div>
              <strong>未查明的开发装备 ×{{ dungeon.development.hiddenItemCount }}</strong>
              <small>完成远征调查后，相关装备才会公开并纳入 Boss 掉落池。</small>
            </div>
          </aside>
          <section
            v-for="encounter in dungeon.encounters"
            :key="encounter.id"
            class="encounter-section"
          >
            <header class="encounter-heading">
              <h4>{{ encounter.name }}</h4>
              <span v-if="encounter.guaranteedEquipmentDrops">
                基础 {{ encounter.guaranteedEquipmentDrops }} 件
                <template v-if="encounter.extraLootPercent">
                  · {{ encounter.extraLootPercent }}% 额外一件 · 当前期望
                  {{ encounter.expectedEquipmentDrops.toFixed(2) }} 件
                </template>
              </span>
            </header>
            <div v-if="encounter.items.length" class="item-grid">
              <CatalogItemCard
                v-for="item in encounter.items"
                :key="`${encounter.id}:${item.id}`"
                :item="item"
              />
            </div>
            <p v-else class="empty">该 Boss 没有符合当前筛选的装备。</p>
          </section>
          <section
            v-for="reward in dungeon.routeRewards"
            :key="reward.id"
            class="encounter-section route-reward-section"
          >
            <header class="encounter-heading">
              <h4>{{ reward.name }}</h4>
              <span>路线全通后固定 {{ reward.guaranteedEquipmentDrops }} 件</span>
            </header>
            <div v-if="reward.items.length" class="item-grid">
              <CatalogItemCard
                v-for="item in reward.items"
                :key="`${reward.id}:${item.id}`"
                :item="item"
              />
            </div>
            <p v-else class="empty">该路线奖励没有符合当前筛选的装备。</p>
          </section>
          <p v-if="dungeon.encounters.length === 0" class="empty">
            没有符合当前 Boss 筛选的路线节点。
          </p>
        </template>
        <p v-else class="locked-copy">解锁副本后才会公开 Boss、掉落和可能随机词缀。</p>
      </article>
    </section>

    <section v-if="game.itemCatalog.itemSets.length" class="collection-section">
      <header class="section-heading">
        <div>
          <span>曾经获得即计入</span>
          <h3>套装收藏</h3>
        </div>
      </header>
      <div class="set-grid">
        <article v-for="set in game.itemCatalog.itemSets" :key="set.id" class="set-card">
          <header>
            <strong>{{ set.name }}</strong>
            <span>{{
              progressLabel(set.acquiredItemCount, set.totalItemCount, set.completionPercent)
            }}</span>
          </header>
          <p>{{ set.description }}</p>
          <ul>
            <li v-for="part in set.parts" :key="part.id" :class="{ acquired: part.acquired }">
              <span>{{ part.name }}</span>
              <em>{{ part.acquired ? `已获得 ${part.acquisitionCount}` : "未获得" }}</em>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section v-if="game.itemCatalog.rewards.length" class="collection-section">
      <header class="section-heading">
        <div>
          <span>收藏里程碑</span>
          <h3>奖励记录</h3>
        </div>
      </header>
      <div class="reward-grid">
        <article
          v-for="reward in game.itemCatalog.rewards"
          :key="reward.id"
          class="reward-card"
          :class="{ claimable: reward.claimable, claimed: reward.claimed }"
        >
          <header>
            <strong>{{ reward.name }}</strong>
            <span>{{ reward.claimed ? "已领取" : reward.claimable ? "可领取" : "进行中" }}</span>
          </header>
          <p>{{ reward.description }}</p>
          <small>
            {{ reward.condition.scopeName }}：{{ reward.condition.completionPercent.toFixed(1) }}% /
            {{ reward.condition.minimumPercent }}%
          </small>
          <ul>
            <li v-for="effect in reward.effects" :key="JSON.stringify(effect)">
              {{ effectLabel(effect) }}
            </li>
          </ul>
          <button
            v-if="reward.claimable"
            type="button"
            class="claim-reward"
            :disabled="game.commandPending"
            @click="claimReward(reward.id)"
          >
            {{ pendingRewardId === reward.id ? "领取中…" : "领取奖励" }}
          </button>
          <em v-else-if="reward.claimed">奖励效果已生效</em>
        </article>
      </div>
      <p v-if="rewardMessage" class="reward-message" role="status">{{ rewardMessage }}</p>
    </section>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 16px;
}
.page-heading,
.dungeon-catalog > header,
.section-heading,
.set-card header,
.reward-card header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}
.page-heading h2,
.dungeon-catalog h3,
.section-heading h3,
.encounter-section h4 {
  margin: 3px 0 0;
  color: #f0dfbf;
  font-family: Georgia, serif;
}
.page-heading h2 {
  font-size: 2rem;
}
.kicker,
.section-heading span,
.dungeon-catalog > header span {
  margin: 0;
  color: #9b7438;
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 0.13em;
}
.global-progress {
  display: grid;
  gap: 3px;
  text-align: right;
}
.global-progress span,
.result-summary {
  color: #8d8475;
  font-size: 0.68rem;
}
.global-progress strong {
  color: #d7b563;
}
.result-summary {
  margin: -4px 0 0;
}
.dungeon-list,
.collection-section {
  display: grid;
  gap: 12px;
}
.dungeon-catalog {
  padding: 14px;
  border: 1px solid #423b30;
  border-radius: 9px;
  background: #0e1113;
}
.dungeon-catalog > header {
  padding-bottom: 11px;
  border-bottom: 1px solid #312d27;
}
.dungeon-catalog > header strong {
  color: #c8aa63;
  font-size: 0.74rem;
}
.dungeon-progress {
  display: grid;
  justify-items: end;
  gap: 3px;
  text-align: right;
}
.dungeon-progress span {
  color: #d2ac5a;
  font-size: 0.68rem;
  font-weight: 800;
}
.dungeon-progress small {
  color: #918777;
  font-size: 0.62rem;
}
.dungeon-catalog.locked {
  border-style: dashed;
  opacity: 0.68;
}
.unresolved-development {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  margin-top: 12px;
  border: 1px dashed #5b4b30;
  border-radius: 7px;
  color: #9f927d;
  background: #15130f;
}
.unresolved-development > span {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #6d5933;
  border-radius: 5px;
  color: #c5a55f;
  background: #211a0e;
  font-family: Georgia, serif;
  font-size: 1.1rem;
}
.unresolved-development div {
  display: grid;
  gap: 2px;
}
.unresolved-development strong {
  color: #c9b58e;
  font-size: 0.7rem;
}
.unresolved-development small {
  color: #81796c;
  font-size: 0.62rem;
}
.locked-copy,
.empty {
  margin: 12px 0 0;
  color: #81796c;
  font-size: 0.7rem;
}
.encounter-section {
  margin-top: 13px;
}
.encounter-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.encounter-section h4 {
  color: #c9b58e;
  font-size: 0.9rem;
}
.encounter-heading span {
  color: #81796c;
  font-size: 0.62rem;
  text-align: right;
}
.item-grid,
.set-grid,
.reward-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.collection-section {
  padding-top: 4px;
}
.section-heading {
  padding-bottom: 9px;
  border-bottom: 1px solid #39342b;
}
.set-card,
.reward-card {
  padding: 12px;
  border: 1px solid #39352e;
  border-radius: 7px;
  background: #111416;
}
.set-card header span,
.reward-card header span {
  color: #9d8d6d;
  font-size: 0.68rem;
}
.set-card p,
.reward-card p,
.reward-card small {
  color: #8e8577;
  font-size: 0.7rem;
  line-height: 1.45;
}
.set-card ul,
.reward-card ul {
  display: grid;
  gap: 4px;
  padding: 0;
  margin: 8px 0 0;
  list-style: none;
}
.set-card li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: #736c61;
  font-size: 0.7rem;
}
.set-card li.acquired {
  color: #bca96f;
}
.set-card li em {
  font-size: 0.64rem;
  font-style: normal;
  white-space: nowrap;
}
.reward-card li {
  color: #b9a66d;
  font-size: 0.68rem;
}
.reward-card.claimable {
  border-color: #8d6e35;
}
.reward-card.claimed {
  border-color: #426448;
}
.reward-card > em {
  display: block;
  margin-top: 9px;
  color: #b18b43;
  font-size: 0.65rem;
  font-style: normal;
}
.claim-reward {
  width: 100%;
  padding: 8px 10px;
  margin-top: 10px;
  border: 1px solid #8d6e35;
  border-radius: 5px;
  color: #f1d28a;
  background: #2b2111;
  font: inherit;
  cursor: pointer;
}
.claim-reward:hover:not(:disabled),
.claim-reward:focus-visible {
  border-color: #c09849;
  background: #382a13;
}
.claim-reward:disabled {
  cursor: wait;
  opacity: 0.55;
}
.reward-message {
  margin: 0;
  color: #bca96f;
  font-size: 0.7rem;
}
@media (max-width: 720px) {
  .item-grid,
  .set-grid,
  .reward-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 430px) {
  .page-heading,
  .dungeon-catalog > header {
    align-items: start;
    flex-direction: column;
  }
  .global-progress {
    text-align: left;
  }
  .dungeon-progress {
    justify-items: start;
    text-align: left;
  }
  .encounter-heading {
    align-items: start;
    flex-direction: column;
    gap: 3px;
  }
  .encounter-heading span {
    text-align: left;
  }
  .dungeon-catalog {
    padding: 11px;
  }
}
</style>
