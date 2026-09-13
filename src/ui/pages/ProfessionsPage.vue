<script setup lang="ts">
import { computed, ref } from "vue";
import { useGameStore } from "../../stores/game-store";
import type {
  GatheringSiteId,
  MemberId,
  ProfessionDefinitionId,
  RecipeId,
} from "../../domain/shared/ids";

const game = useGameStore();
const notice = ref("");
const bankFilter = ref<"all" | "material" | "consumable">("all");
const bankSearch = ref("");
const economyWindow = ref<"all" | "7d" | "30d">("all");
const selectedMemberId = ref<MemberId | null>(null);
const selectedMember = computed(() => {
  const members = game.snapshot ? Object.values(game.snapshot.members) : [];
  return members.find((member) => member.id === selectedMemberId.value) ?? members[0];
});
const selectedMemberProfessions = computed(
  () =>
    game.professionView?.members.find((member) => member.id === selectedMember.value?.id)
      ?.professions ?? [],
);
const filteredMaterials = computed(() => {
  const search = bankSearch.value.trim().toLocaleLowerCase();
  return (game.professionView?.materials ?? []).filter(
    (material) =>
      (bankFilter.value === "all" || material.kind === bankFilter.value) &&
      (!search || material.name.toLocaleLowerCase().includes(search)),
  );
});
const filteredEconomyReport = computed(() => {
  if (economyWindow.value === "all") return game.economyReport;
  const days = economyWindow.value === "7d" ? 7 : 30;
  return game.economyReportFor(game.now - days * 24 * 60 * 60 * 1_000);
});
function hasLearnedRecipe(recipeId: RecipeId): boolean {
  return selectedMemberProfessions.value.some((profession) =>
    profession.learnedRecipeIds.includes(recipeId),
  );
}

async function learn(professionId: ProfessionDefinitionId): Promise<void> {
  const member = selectedMember.value;
  if (!member) return;
  const result = await game.learnProfession(member.id, professionId);
  if (result.ok) notice.value = `${member.identity.name} 已学习该专业。`;
}

async function gather(siteId: GatheringSiteId): Promise<void> {
  const member = selectedMember.value;
  if (!member) return;
  const result = await game.startGathering(member.id, siteId, 1);
  if (result.ok) notice.value = `${member.identity.name} 已开始采集。`;
}

async function craft(recipeId: RecipeId): Promise<void> {
  const member = selectedMember.value;
  if (!member) return;
  const result = await game.startCrafting(member.id, recipeId, 1);
  if (result.ok) notice.value = `${member.identity.name} 已开始制造。`;
}

async function learnRecipe(recipeId: RecipeId): Promise<void> {
  const member = selectedMember.value;
  if (!member) return;
  const result = await game.learnRecipe(member.id, recipeId);
  if (result.ok) notice.value = `${member.identity.name} 已学习配方。`;
}

async function train(professionId: ProfessionDefinitionId): Promise<void> {
  const member = selectedMember.value;
  if (!member) return;
  const result = await game.trainProfession(member.id, professionId);
  if (result.ok) notice.value = `${member.identity.name} 的专业训练等级已提升。`;
}

async function upgradeFacility(facilityId: string): Promise<void> {
  const result = await game.upgradeProfessionFacility(facilityId as never);
  if (result.ok) notice.value = "专业设施已升级。";
}

async function organizeBank(): Promise<void> {
  const result = await game.organizeGuildBank();
  if (result.ok) notice.value = "公会仓库已按物品名称整理。";
}
</script>

<template>
  <section class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">工匠大厅</p>
        <h2>专业与生产</h2>
      </div>
      <span v-if="game.snapshot"
        >仓库 {{ Object.keys(game.snapshot.guildBank.stackCounts).length }} 类材料</span
      >
    </header>
    <p v-if="notice" class="notice">{{ notice }}</p>
    <section class="panel selector">
      <label
        >执行成员
        <select v-model="selectedMemberId">
          <option
            v-for="member in Object.values(game.snapshot?.members ?? {})"
            :key="member.id"
            :value="member.id"
          >
            {{ member.identity.name }}{{ member.activeActivityId ? "（活动中）" : "" }}
          </option>
        </select>
      </label>
      <span v-if="selectedMember">当前：{{ selectedMember.identity.name }}</span>
    </section>
    <section v-if="game.professionView" class="panel bank-summary">
      <div class="bank-heading">
        <strong>公会仓库</strong>
        <button type="button" class="quiet" :disabled="game.commandPending" @click="organizeBank">
          整理仓库
        </button>
      </div>
      <span
        >槽位 {{ game.professionView.bank.usedSlots }} /
        {{ game.professionView.bank.capacitySlots }}</span
      >
      <span v-if="game.professionView.bank.reservedEquipmentSlots"
        >预留装备槽 {{ game.professionView.bank.reservedEquipmentSlots }}</span
      >
      <div class="bank-controls">
        <input v-model="bankSearch" placeholder="搜索材料或消耗品" />
        <select v-model="bankFilter">
          <option value="all">全部</option>
          <option value="material">材料</option>
          <option value="consumable">消耗品</option>
        </select>
      </div>
      <span v-for="material in filteredMaterials" :key="material.id">
        {{ material.name }} {{ material.availableQuantity }}
        <small v-if="material.reservedInputQuantity"
          >（输入预留 {{ material.reservedInputQuantity }}）</small
        >
        <small v-if="material.reservedOutputQuantity"
          >（待产出 {{ material.reservedOutputQuantity }}）</small
        >
        <small v-if="material.quantity === 0">（尚未入库）</small>
      </span>
      <span v-if="!filteredMaterials.length" class="muted">没有匹配的库存物品</span>
    </section>
    <section v-if="game.professionView" class="panel bank-summary">
      <strong>经济观测</strong>
      <span>进行中专业活动 {{ game.professionView.economy.activeProfessionActivities }}</span>
      <span>已完成 {{ game.professionView.economy.completedProfessionActivities }}</span>
      <span>采集 {{ game.professionView.economy.gatheringActivities }}</span>
      <span>制造 {{ game.professionView.economy.craftingActivities }}</span>
      <span>制造装备 {{ game.professionView.economy.craftedEquipmentInstances }}</span>
      <span
        >补给 {{ game.professionView.economy.supplyConsumed }} 消耗 /
        {{ game.professionView.economy.supplyAllocated }} 分配 /
        {{ game.professionView.economy.supplyReleased }} 释放</span
      >
      <span>公会资金 {{ game.professionView.economy.guildFunds }} G</span>
      <span>累计收入 {{ game.professionView.economy.goldIncome }} G</span>
      <span>累计支出 {{ game.professionView.economy.goldExpense }} G</span>
    </section>
    <section v-if="game.professionView?.economy.recentLedger.length" class="panel ledger">
      <strong>最近经济流水</strong>
      <div v-for="entry in game.professionView.economy.recentLedger" :key="entry.id">
        <span>#{{ entry.id }} · {{ entry.source }}</span>
        <span v-if="entry.amount"
          >{{ entry.kind === "gold-expense" ? "-" : "+" }}{{ entry.amount }} G</span
        >
        <span v-else-if="entry.quantity">{{ entry.kind }} · {{ entry.quantity }}</span>
      </div>
    </section>
    <section v-if="filteredEconomyReport" class="panel ledger">
      <div class="bank-heading">
        <strong>经济报表</strong>
        <select v-model="economyWindow">
          <option value="all">全部历史</option>
          <option value="30d">最近 30 天</option>
          <option value="7d">最近 7 天</option>
        </select>
      </div>
      <div class="economy-metrics">
        <span>收入 {{ filteredEconomyReport.goldIncome }} G</span>
        <span>支出 {{ filteredEconomyReport.goldExpense }} G</span>
        <span>净变化 {{ filteredEconomyReport.goldNet }} G</span>
        <span>流水 {{ filteredEconomyReport.entries.length }} 条</span>
        <span
          >专业活动 {{ filteredEconomyReport.professionActivities.total }} 次 ·
          {{ Math.round(filteredEconomyReport.professionActivities.durationSeconds) }} 秒</span
        >
        <span
          >远征 {{ filteredEconomyReport.expedition.total }} 次 · 胜
          {{ filteredEconomyReport.expedition.victories }} / 负
          {{ filteredEconomyReport.expedition.defeats }}</span
        >
        <span
          >远征成功率 {{ Math.round(filteredEconomyReport.expedition.successRate * 100) }}% · 耗时
          {{ Math.round(filteredEconomyReport.expedition.durationSeconds) }} 秒</span
        >
        <span
          >补给使用率 {{ Math.round(filteredEconomyReport.supply.consumptionRate * 100) }}% · 降级率
          {{ Math.round(filteredEconomyReport.supply.downgradeRate * 100) }}%</span
        >
      </div>
      <div v-if="filteredEconomyReport.materialNet.length" class="economy-materials">
        <span
          v-for="material in filteredEconomyReport.materialNet.slice(0, 8)"
          :key="material.itemId"
        >
          {{ material.itemId }} {{ material.quantity > 0 ? "+" : "" }}{{ material.quantity }}
        </span>
      </div>
      <div v-for="source in filteredEconomyReport.bySource.slice(0, 8)" :key="source.source">
        <span>{{ source.source }} · {{ source.count }} 次</span>
        <span
          >{{ source.amount ? `${source.amount} G` : ""
          }}{{ source.quantity ? ` · ${source.quantity} 件` : "" }}</span
        >
      </div>
    </section>
    <section v-if="game.professionView?.bank.equipment.length" class="grid">
      <article
        v-for="equipment in game.professionView.bank.equipment"
        :key="equipment.id"
        class="panel card"
      >
        <h3>{{ equipment.name }}</h3>
        <p>{{ equipment.quality }} · 装等 {{ equipment.itemLevel }}</p>
        <button
          type="button"
          :disabled="game.commandPending || !selectedMember"
          @click="game.assignGuildBankEquipment(equipment.id, selectedMember!.id)"
        >
          装备给当前成员
        </button>
        <button
          type="button"
          :disabled="game.commandPending"
          @click="game.sellGuildBankEquipment(equipment.id)"
        >
          出售
        </button>
      </article>
    </section>
    <section v-if="game.professionView" class="grid">
      <article
        v-for="facility in game.professionView.facilities"
        :key="facility.id"
        class="panel card"
      >
        <h3>{{ facility.name }}设施</h3>
        <p>等级 {{ facility.level }}</p>
        <button
          v-if="facility.nextLevel"
          type="button"
          :disabled="game.commandPending"
          @click="upgradeFacility(facility.id)"
        >
          升级至 {{ facility.nextLevel }} · {{ facility.nextCost }} G
        </button>
      </article>
    </section>
    <section class="grid">
      <article v-for="profession in game.professions" :key="profession.id" class="panel card">
        <header>
          <h3>{{ profession.name.zhCN }}</h3>
          <span>{{ profession.status }}</span>
        </header>
        <p>
          最高技能 {{ profession.maxSkill }} · 训练等级 {{ profession.trainingTiers[0]?.skillCap }}
        </p>
        <button
          v-if="profession.status === 'available'"
          type="button"
          :disabled="
            game.commandPending ||
            !selectedMember ||
            selectedMemberProfessions.some((entry) => entry.id === profession.id)
          "
          @click="learn(profession.id)"
        >
          学习专业
        </button>
      </article>
    </section>
    <section v-if="selectedMemberProfessions.length" class="grid">
      <article
        v-for="profession in selectedMemberProfessions"
        :key="profession.id"
        class="panel card"
      >
        <h3>{{ profession.name }}</h3>
        <p>技能 {{ profession.skill }} · 训练等级 {{ profession.trainingRank }}</p>
        <button
          v-if="profession.nextTrainingRank"
          type="button"
          :disabled="game.commandPending"
          @click="train(profession.id)"
        >
          训练至等级 {{ profession.nextTrainingRank }} · {{ profession.nextTrainingCost }} G
        </button>
      </article>
    </section>
    <section class="grid">
      <article v-for="site in game.gatheringSites" :key="site.id" class="panel card">
        <h3>{{ site.name.zhCN }}</h3>
        <p>采集耗时 {{ site.durationSeconds }} 秒 · 最多 {{ site.batchLimit }} 批</p>
        <button
          type="button"
          :disabled="game.commandPending || !selectedMember"
          @click="gather(site.id)"
        >
          开始采集
        </button>
      </article>
      <article v-for="recipe in game.recipes" :key="recipe.id" class="panel card">
        <h3>{{ recipe.name.zhCN }}</h3>
        <p>{{ recipe.category }} · 制造耗时 {{ recipe.durationSeconds }} 秒</p>
        <button
          type="button"
          :disabled="game.commandPending || !selectedMember || hasLearnedRecipe(recipe.id)"
          @click="learnRecipe(recipe.id)"
        >
          {{ hasLearnedRecipe(recipe.id) ? "已学习" : "学习配方" }}
        </button>
        <button
          type="button"
          :disabled="
            game.commandPending ||
            !selectedMember ||
            recipe.status !== 'available' ||
            !hasLearnedRecipe(recipe.id)
          "
          @click="craft(recipe.id)"
        >
          {{ recipe.status === "preview" ? "预览内容" : "开始制造" }}
        </button>
      </article>
    </section>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 18px;
}
.page-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
}
.page-heading h2 {
  margin: 3px 0 0;
  color: #f0dfbf;
  font-family: Georgia, serif;
  font-size: 2rem;
}
.page-heading > span,
.kicker {
  color: #9b7438;
  font-size: 0.72rem;
}
.kicker {
  margin: 0;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.selector {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #b8ad99;
}
.bank-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  color: #b8ad99;
}
.bank-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}
.bank-controls {
  display: flex;
  gap: 8px;
  width: 100%;
}
.bank-controls input,
.bank-controls select {
  margin-left: 0;
}
.bank-controls input {
  min-width: 180px;
  flex: 1;
  padding: 8px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  background: #141719;
  color: #eadbbd;
}
.economy-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}
.bank-summary span {
  padding: 4px 7px;
  border: 1px solid #3d3528;
  color: #c5aa79;
  font-size: 0.7rem;
}
.bank-summary small {
  color: #8f826d;
}
.ledger {
  display: grid;
  gap: 6px;
  color: #b8ad99;
}
.ledger > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #2f2a22;
  padding-top: 5px;
  font-size: 0.75rem;
}
select {
  margin-left: 8px;
  padding: 8px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  background: #141719;
  color: #eadbbd;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.card {
  display: grid;
  gap: 8px;
}
.card header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
h3 {
  margin: 0;
  color: #dfc898;
}
.card p {
  margin: 0;
  color: #958a79;
  font-size: 0.76rem;
}
button {
  width: fit-content;
  padding: 8px 12px;
  border: 1px solid #886b38;
  border-radius: 6px;
  background: #2b2112;
  color: #edc968;
  cursor: pointer;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.notice {
  margin: 0;
  color: #d2b675;
}
</style>
