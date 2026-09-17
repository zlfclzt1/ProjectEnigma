<script setup lang="ts">
import { computed, ref } from "vue";
import { useGameStore } from "../../stores/game-store";
import type {
  GatheringSiteId,
  MemberId,
  ProfessionDefinitionId,
  RecipeId,
} from "../../domain/shared/ids";

type WorkspaceTab = "overview" | "production" | "bank" | "economy";

const game = useGameStore();
const notice = ref("");
const activeTab = ref<WorkspaceTab>("overview");
const selectedMemberId = ref<MemberId | null>(null);
const bankFilter = ref<"all" | "material" | "consumable">("all");
const bankSearch = ref("");
const recipeSearch = ref("");
const recipeProfession = ref<"all" | ProfessionDefinitionId>("all");
const recipeStatus = ref<"all" | "available" | "learned">("available");
const recipeLimit = ref(36);
const economyWindow = ref<"all" | "7d" | "30d">("all");

const members = computed(() => (game.snapshot ? Object.values(game.snapshot.members) : []));
const selectedMember = computed(
  () => members.value.find((member) => member.id === selectedMemberId.value) ?? members.value[0],
);
const selectedMemberProfessions = computed(
  () =>
    game.professionView?.members.find((member) => member.id === selectedMember.value?.id)
      ?.professions ?? [],
);
const activeProduction = computed(() =>
  (game.snapshot ? Object.values(game.snapshot.activities) : []).filter(
    (activity) =>
      (activity.type === "gathering" || activity.type === "crafting") &&
      (activity.status === "active" || activity.status === "scheduled"),
  ),
);
const filteredMaterials = computed(() => {
  const search = bankSearch.value.trim().toLocaleLowerCase();
  return (game.professionView?.materials ?? []).filter(
    (material) =>
      (bankFilter.value === "all" || material.kind === bankFilter.value) &&
      (!search || material.name.toLocaleLowerCase().includes(search)),
  );
});
const filteredRecipes = computed(() => {
  const search = recipeSearch.value.trim().toLocaleLowerCase();
  const learnedIds = new Set(
    selectedMemberProfessions.value.flatMap((profession) => profession.learnedRecipeIds),
  );
  return game.recipes.filter((recipe) => {
    const matchesText =
      !search ||
      recipe.name.zhCN.toLocaleLowerCase().includes(search) ||
      recipe.name.enUS.toLocaleLowerCase().includes(search);
    const matchesProfession =
      recipeProfession.value === "all" || recipe.professionId === recipeProfession.value;
    const matchesStatus =
      recipeStatus.value === "all" ||
      (recipeStatus.value === "learned" && learnedIds.has(recipe.id)) ||
      (recipeStatus.value === "available" && recipe.status === "available");
    return matchesText && matchesProfession && matchesStatus;
  });
});
const displayedRecipes = computed(() => filteredRecipes.value.slice(0, recipeLimit.value));
const filteredEconomyReport = computed(() => {
  if (economyWindow.value === "all") return game.economyReport;
  const days = economyWindow.value === "7d" ? 7 : 30;
  return game.economyReportFor(game.now - days * 24 * 60 * 60 * 1_000);
});
const bankUsagePercent = computed(() => {
  const bank = game.professionView?.bank;
  if (!bank || bank.capacitySlots <= 0) return 0;
  return Math.min(100, Math.round((bank.usedSlots / bank.capacitySlots) * 100));
});
const availableProfessions = computed(() =>
  game.professions.filter((profession) => profession.status === "available"),
);

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} 分钟${seconds % 60 ? ` ${seconds % 60} 秒` : ""}`;
}

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
  <section v-if="game.professionView" class="profession-workspace">
    <header class="workspace-hero">
      <div>
        <p class="kicker">工匠大厅 · GUILD CRAFTING DESK</p>
        <h2>专业与生产</h2>
        <p class="hero-copy">安排成员、转化材料，把公会库存变成下一次远征的准备。</p>
      </div>
      <div class="member-picker panel">
        <span class="eyebrow">当前执行成员</span>
        <select v-model="selectedMemberId" aria-label="当前执行成员">
          <option v-for="member in members" :key="member.id" :value="member.id">
            {{ member.identity.name }}{{ member.activeActivityId ? " · 活动中" : "" }}
          </option>
        </select>
        <small v-if="selectedMember">{{ selectedMember.identity.name }} · 可安排生产</small>
      </div>
    </header>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <nav class="workspace-tabs" aria-label="专业工作台区域">
      <button
        type="button"
        :class="{ active: activeTab === 'overview' }"
        @click="activeTab = 'overview'"
      >
        总览 <small>Overview</small>
      </button>
      <button
        type="button"
        :class="{ active: activeTab === 'production' }"
        @click="activeTab = 'production'"
      >
        生产队列 <small>Production</small>
      </button>
      <button type="button" :class="{ active: activeTab === 'bank' }" @click="activeTab = 'bank'">
        公会仓库 <small>Guild Bank</small>
      </button>
      <button
        type="button"
        :class="{ active: activeTab === 'economy' }"
        @click="activeTab = 'economy'"
      >
        经济观测 <small>Economy</small>
      </button>
    </nav>

    <section class="metric-strip">
      <article class="metric-card accent">
        <span class="eyebrow">仓库容量</span
        ><strong
          >{{ game.professionView.bank.usedSlots
          }}<small> / {{ game.professionView.bank.capacitySlots }}</small></strong
        >
        <div class="meter"><i :style="{ width: `${bankUsagePercent}%` }" /></div>
        <em>{{ bankUsagePercent }}% 已使用</em>
      </article>
      <article class="metric-card">
        <span class="eyebrow">生产中</span><strong>{{ activeProduction.length }}</strong
        ><em>采集与制造活动</em>
      </article>
      <article class="metric-card">
        <span class="eyebrow">配方目录</span><strong>{{ game.recipes.length }}</strong
        ><em
          >{{
            game.professionView.recipes.filter((recipe) => recipe.status === "available").length
          }}
          条可用</em
        >
      </article>
      <article class="metric-card gold">
        <span class="eyebrow">公会资金</span
        ><strong>{{ game.professionView.economy.guildFunds }}<small> G</small></strong
        ><em>累计支出 {{ game.professionView.economy.goldExpense }} G</em>
      </article>
    </section>

    <section v-if="activeTab === 'overview'" class="overview-layout">
      <div class="overview-main">
        <section class="panel member-console">
          <div class="section-heading">
            <div>
              <p class="section-kicker">CURRENT OPERATOR</p>
              <h3>成员专业状态</h3>
            </div>
            <span v-if="selectedMember" class="status-pill">{{
              selectedMember.identity.name
            }}</span>
          </div>
          <div v-if="selectedMemberProfessions.length" class="profession-status-list">
            <article
              v-for="profession in selectedMemberProfessions"
              :key="profession.id"
              class="profession-status-card"
            >
              <div class="profession-mark">{{ profession.name.slice(0, 1) }}</div>
              <div class="profession-status-copy">
                <strong>{{ profession.name }}</strong
                ><span>技能 {{ profession.skill }} · 训练等级 {{ profession.trainingRank }}</span>
                <div class="skill-track">
                  <i :style="{ width: `${Math.min(100, (profession.skill / 300) * 100)}%` }" />
                </div>
              </div>
              <button
                v-if="profession.nextTrainingRank"
                type="button"
                class="quiet"
                :disabled="game.commandPending"
                @click="train(profession.id)"
              >
                训练 {{ profession.nextTrainingRank }} · {{ profession.nextTrainingCost }} G
              </button>
            </article>
          </div>
          <div v-else class="empty-state">
            <strong>还没有学习专业</strong
            ><span>从下方的专业目录开始，为当前成员安排第一项生产能力。</span>
          </div>
        </section>
        <section class="panel facilities-panel">
          <div class="section-heading">
            <div>
              <p class="section-kicker">GUILD FACILITIES</p>
              <h3>公会设施</h3>
            </div>
            <span>升级扩大可用范围</span>
          </div>
          <div class="facility-list">
            <article
              v-for="facility in game.professionView.facilities.filter(
                (entry) => entry.level > 0 || entry.nextLevel,
              )"
              :key="facility.id"
              class="facility-row"
            >
              <div>
                <strong>{{ facility.name }}设施</strong
                ><span>Lv {{ facility.level }} · {{ facility.professionId }}</span>
              </div>
              <button
                v-if="facility.nextLevel"
                type="button"
                class="quiet"
                :disabled="game.commandPending"
                @click="upgradeFacility(facility.id)"
              >
                升级至 {{ facility.nextLevel }} · {{ facility.nextCost }} G</button
              ><span v-else class="completed-tag">已达上限</span>
            </article>
          </div>
        </section>
      </div>
      <aside class="overview-side">
        <section class="panel production-focus">
          <div class="section-heading">
            <div>
              <p class="section-kicker">ACTIVE WORK</p>
              <h3>生产队列</h3>
            </div>
            <button type="button" class="text-button" @click="activeTab = 'production'">
              查看全部 →
            </button>
          </div>
          <div v-if="activeProduction.length" class="queue-list">
            <div
              v-for="activity in activeProduction.slice(0, 4)"
              :key="activity.id"
              class="queue-item"
            >
              <span class="queue-dot" :data-type="activity.type" />
              <div>
                <strong>{{ activity.type === "gathering" ? "采集活动" : "制造活动" }}</strong
                ><small
                  >预计完成
                  {{
                    formatDuration(
                      Math.max(0, Math.round((activity.nextSettlementAt - game.now) / 1000)),
                    )
                  }}</small
                >
              </div>
            </div>
          </div>
          <div v-else class="empty-state compact">
            <strong>队列是空的</strong><span>选择生产队列，安排一次采集或制造。</span
            ><button type="button" class="quiet" @click="activeTab = 'production'">开始安排</button>
          </div>
        </section>
        <section class="panel catalog-focus">
          <div class="section-heading">
            <div>
              <p class="section-kicker">PROFESSION CATALOG</p>
              <h3>专业目录</h3>
            </div>
            <span>{{ availableProfessions.length }} 项可用</span>
          </div>
          <div class="catalog-mini-list">
            <div
              v-for="profession in game.professions"
              :key="profession.id"
              class="catalog-mini-row"
            >
              <span class="profession-mark small">{{ profession.name.zhCN.slice(0, 1) }}</span>
              <div>
                <strong>{{ profession.name.zhCN }}</strong
                ><small>{{ profession.status === "available" ? "可学习" : "Preview 内容" }}</small>
              </div>
              <button
                v-if="profession.status === 'available'"
                type="button"
                class="text-button"
                :disabled="
                  game.commandPending ||
                  !selectedMember ||
                  selectedMemberProfessions.some((entry) => entry.id === profession.id)
                "
                @click="learn(profession.id)"
              >
                {{
                  selectedMemberProfessions.some((entry) => entry.id === profession.id)
                    ? "已学"
                    : "学习"
                }}
              </button>
            </div>
          </div>
        </section>
      </aside>
    </section>

    <section v-if="activeTab === 'production'" class="production-layout">
      <div class="panel production-panel">
        <div class="section-heading">
          <div>
            <p class="section-kicker">GATHERING NODES</p>
            <h3>采集与熔炼</h3>
          </div>
          <span>当前成员：{{ selectedMember?.identity.name ?? "未选择" }}</span>
        </div>
        <div class="production-grid">
          <article v-for="site in game.gatheringSites" :key="site.id" class="production-card">
            <div class="card-icon mining">⛏</div>
            <div>
              <strong>{{ site.name.zhCN }}</strong
              ><span
                >{{ formatDuration(site.durationSeconds) }} · 最多 {{ site.batchLimit }} 批</span
              >
            </div>
            <button
              type="button"
              :disabled="game.commandPending || !selectedMember"
              @click="gather(site.id)"
            >
              开始采集
            </button>
          </article>
        </div>
      </div>
      <div class="panel production-panel recipe-panel">
        <div class="section-heading">
          <div>
            <p class="section-kicker">RECIPE LIBRARY</p>
            <h3>配方库</h3>
          </div>
          <span>{{ filteredRecipes.length }} 条结果</span>
        </div>
        <div class="recipe-toolbar">
          <input v-model="recipeSearch" placeholder="搜索配方名称" /><select
            v-model="recipeProfession"
          >
            <option value="all">全部专业</option>
            <option
              v-for="profession in game.professions"
              :key="profession.id"
              :value="profession.id"
            >
              {{ profession.name.zhCN }}
            </option></select
          ><select v-model="recipeStatus">
            <option value="available">可用配方</option>
            <option value="learned">当前已学</option>
            <option value="all">全部目录</option>
          </select>
        </div>
        <div class="recipe-list">
          <article v-for="recipe in displayedRecipes" :key="recipe.id" class="recipe-row">
            <div class="recipe-type" :data-category="recipe.category">
              {{ recipe.category === "refining" ? "熔炼" : "锻造" }}
            </div>
            <div class="recipe-copy">
              <strong>{{ recipe.name.zhCN }}</strong
              ><span
                >技能 {{ recipe.requiredSkill }} ·
                {{ formatDuration(recipe.durationSeconds) }}</span
              >
            </div>
            <div class="recipe-actions">
              <button
                type="button"
                class="quiet"
                :disabled="
                  game.commandPending ||
                  !selectedMember ||
                  hasLearnedRecipe(recipe.id) ||
                  recipe.status !== 'available'
                "
                @click="learnRecipe(recipe.id)"
              >
                {{
                  hasLearnedRecipe(recipe.id)
                    ? "已学习"
                    : recipe.status === "preview"
                      ? "Preview"
                      : "学习"
                }}</button
              ><button
                type="button"
                :disabled="
                  game.commandPending ||
                  !selectedMember ||
                  recipe.status !== 'available' ||
                  !hasLearnedRecipe(recipe.id)
                "
                @click="craft(recipe.id)"
              >
                制造
              </button>
            </div>
          </article>
          <div v-if="!displayedRecipes.length" class="empty-state">
            <strong>没有匹配配方</strong><span>尝试更换专业、状态或搜索关键词。</span>
          </div>
        </div>
        <button
          v-if="displayedRecipes.length < filteredRecipes.length"
          type="button"
          class="load-more"
          @click="recipeLimit += 36"
        >
          显示更多配方（{{ filteredRecipes.length - displayedRecipes.length }}）
        </button>
      </div>
    </section>

    <section v-if="activeTab === 'bank'" class="bank-layout">
      <section class="panel bank-panel">
        <div class="section-heading">
          <div>
            <p class="section-kicker">STORAGE CONTROL</p>
            <h3>公会仓库</h3>
          </div>
          <button type="button" class="quiet" :disabled="game.commandPending" @click="organizeBank">
            整理仓库
          </button>
        </div>
        <div class="bank-capacity">
          <div>
            <strong
              >{{ game.professionView.bank.usedSlots }} /
              {{ game.professionView.bank.capacitySlots }}</strong
            ><span>已用槽位</span>
          </div>
          <div class="meter large"><i :style="{ width: `${bankUsagePercent}%` }" /></div>
          <small>预留装备槽 {{ game.professionView.bank.reservedEquipmentSlots }}</small>
        </div>
        <div class="bank-toolbar">
          <input v-model="bankSearch" placeholder="搜索材料或消耗品" />
          <div class="segmented">
            <button
              type="button"
              :class="{ active: bankFilter === 'all' }"
              @click="bankFilter = 'all'"
            >
              全部</button
            ><button
              type="button"
              :class="{ active: bankFilter === 'material' }"
              @click="bankFilter = 'material'"
            >
              材料</button
            ><button
              type="button"
              :class="{ active: bankFilter === 'consumable' }"
              @click="bankFilter = 'consumable'"
            >
              消耗品
            </button>
          </div>
        </div>
        <div class="inventory-list">
          <div v-for="material in filteredMaterials" :key="material.id" class="inventory-row">
            <span class="inventory-icon" :data-kind="material.kind">{{
              material.kind === "consumable" ? "✦" : "◆"
            }}</span>
            <div>
              <strong>{{ material.name }}</strong
              ><small
                ><template v-if="material.reservedInputQuantity"
                  >输入预留 {{ material.reservedInputQuantity }} · </template
                ><template v-if="material.reservedOutputQuantity"
                  >待产出 {{ material.reservedOutputQuantity }}</template
                ><template v-if="material.quantity === 0">尚未入库</template></small
              >
            </div>
            <strong class="inventory-quantity"
              >{{ material.availableQuantity }}<small> / {{ material.quantity }}</small></strong
            >
          </div>
          <div v-if="!filteredMaterials.length" class="empty-state">
            <strong>没有匹配的库存物品</strong><span>调整筛选条件或等待生产活动产出。</span>
          </div>
        </div>
      </section>
      <section v-if="game.professionView.bank.equipment.length" class="panel equipment-panel">
        <div class="section-heading">
          <div>
            <p class="section-kicker">EQUIPMENT HOLDING</p>
            <h3>待分配装备</h3>
          </div>
          <span>{{ game.professionView.bank.equipment.length }} 件</span>
        </div>
        <article
          v-for="equipment in game.professionView.bank.equipment"
          :key="equipment.id"
          class="equipment-row"
        >
          <div class="equipment-mark">{{ equipment.quality.slice(0, 1) }}</div>
          <div>
            <strong>{{ equipment.name }}</strong
            ><span>{{ equipment.quality }} · 装等 {{ equipment.itemLevel }}</span>
          </div>
          <button
            type="button"
            :disabled="game.commandPending || !selectedMember"
            @click="game.assignGuildBankEquipment(equipment.id, selectedMember!.id)"
          >
            装备</button
          ><button
            type="button"
            class="quiet"
            :disabled="game.commandPending"
            @click="game.sellGuildBankEquipment(equipment.id)"
          >
            出售
          </button>
        </article>
      </section>
    </section>

    <section v-if="activeTab === 'economy' && filteredEconomyReport" class="economy-layout">
      <section class="panel economy-panel">
        <div class="section-heading">
          <div>
            <p class="section-kicker">ECONOMIC OBSERVATORY</p>
            <h3>经济观测</h3>
          </div>
          <div class="segmented">
            <button
              type="button"
              :class="{ active: economyWindow === 'all' }"
              @click="economyWindow = 'all'"
            >
              全部</button
            ><button
              type="button"
              :class="{ active: economyWindow === '30d' }"
              @click="economyWindow = '30d'"
            >
              30 天</button
            ><button
              type="button"
              :class="{ active: economyWindow === '7d' }"
              @click="economyWindow = '7d'"
            >
              7 天
            </button>
          </div>
        </div>
        <div class="economy-hero-metrics">
          <div>
            <span>收入</span
            ><strong class="positive">+{{ filteredEconomyReport.goldIncome }} G</strong>
          </div>
          <div>
            <span>支出</span
            ><strong class="negative">-{{ filteredEconomyReport.goldExpense }} G</strong>
          </div>
          <div>
            <span>净变化</span
            ><strong
              >{{ filteredEconomyReport.goldNet > 0 ? "+" : ""
              }}{{ filteredEconomyReport.goldNet }} G</strong
            >
          </div>
          <div>
            <span>流水</span
            ><strong>{{ filteredEconomyReport.entries.length }} <small>条</small></strong>
          </div>
        </div>
        <div class="economy-detail-grid">
          <div>
            <span>专业活动</span
            ><strong>{{ filteredEconomyReport.professionActivities.total }} 次</strong
            ><small
              >{{
                Math.round(filteredEconomyReport.professionActivities.durationSeconds / 60)
              }}
              分钟累计耗时</small
            >
          </div>
          <div>
            <span>远征成功率</span
            ><strong>{{ Math.round(filteredEconomyReport.expedition.successRate * 100) }}%</strong
            ><small
              >{{ filteredEconomyReport.expedition.victories }} 胜 ·
              {{ filteredEconomyReport.expedition.defeats }} 负</small
            >
          </div>
          <div>
            <span>补给使用率</span
            ><strong>{{ Math.round(filteredEconomyReport.supply.consumptionRate * 100) }}%</strong
            ><small
              >降级率 {{ Math.round(filteredEconomyReport.supply.downgradeRate * 100) }}%</small
            >
          </div>
          <div>
            <span>材料净变化</span><strong>{{ filteredEconomyReport.materialNet.length }} 项</strong
            ><small>按库存流水统计</small>
          </div>
        </div>
      </section>
      <section class="panel ledger-panel">
        <div class="section-heading">
          <div>
            <p class="section-kicker">LEDGER</p>
            <h3>最近流水</h3>
          </div>
          <span>最近 {{ Math.min(20, filteredEconomyReport.entries.length) }} 条</span>
        </div>
        <div class="ledger-list">
          <div v-for="entry in filteredEconomyReport.entries.slice(0, 20)" :key="entry.id">
            <span
              ><b :data-kind="entry.kind">{{
                entry.kind === "gold-income"
                  ? "收入"
                  : entry.kind === "gold-expense"
                    ? "支出"
                    : "材料"
              }}</b
              >{{ entry.source }}</span
            ><strong
              v-if="entry.amount"
              :class="entry.kind === 'gold-expense' ? 'negative' : 'positive'"
              >{{ entry.kind === "gold-expense" ? "-" : "+" }}{{ entry.amount }} G</strong
            ><strong v-else-if="entry.quantity">{{ entry.quantity }} 件</strong>
          </div>
          <div v-if="!filteredEconomyReport.entries.length" class="empty-state">
            <strong>暂无经济流水</strong><span>完成生产、补给或远征后会在这里留下记录。</span>
          </div>
        </div>
      </section>
    </section>
  </section>
</template>

<style scoped>
.profession-workspace {
  display: grid;
  gap: 18px;
  color: #d8cdb8;
}
.panel {
  min-width: 0;
  border: 1px solid #3a352e;
  border-radius: 10px;
  background: linear-gradient(145deg, #15191b, #101315);
}
.workspace-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  padding: 6px 0 2px;
}
.kicker,
.section-kicker,
.eyebrow {
  margin: 0;
  color: #9f7c45;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.workspace-hero h2 {
  margin: 5px 0 7px;
  color: #f2dfb9;
  font:
    700 2.25rem Georgia,
    serif;
  letter-spacing: -0.03em;
}
.hero-copy {
  margin: 0;
  color: #92897b;
  font-size: 0.78rem;
}
.member-picker {
  display: grid;
  min-width: 220px;
  gap: 7px;
  padding: 13px 15px;
}
.member-picker select,
.recipe-toolbar select,
.recipe-toolbar input,
.bank-toolbar input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 10px;
  border: 1px solid #514b40;
  border-radius: 6px;
  background: #0c1011;
  color: #eadbbd;
}
.member-picker small {
  color: #8c958f;
  font-size: 0.65rem;
}
.notice {
  margin: 0;
  padding: 11px 13px;
  border: 1px solid #41694a;
  border-radius: 7px;
  color: #a5d2a2;
  background: #122119;
  font-size: 0.74rem;
}
.workspace-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px;
  border-bottom: 1px solid #302c26;
}
.workspace-tabs button {
  display: grid;
  gap: 3px;
  min-width: 112px;
  padding: 10px 13px;
  border: 1px solid transparent;
  border-radius: 7px 7px 0 0;
  color: #958c7e;
  background: transparent;
  font-weight: 700;
  cursor: pointer;
}
.workspace-tabs button small {
  color: #625f58;
  font-size: 0.55rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.workspace-tabs button.active {
  border-color: #51432f;
  color: #ebc978;
  background: #1a1814;
}
.workspace-tabs button.active small {
  color: #9b7c4a;
}
.metric-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.metric-card {
  display: grid;
  gap: 6px;
  min-height: 88px;
  padding: 14px 15px;
  border: 1px solid #38342e;
  border-radius: 9px;
  background: #131718;
}
.metric-card.accent {
  border-color: #665131;
}
.metric-card.gold {
  background: linear-gradient(135deg, #211b12, #151718);
}
.metric-card strong {
  color: #eee0c2;
  font-size: 1.45rem;
  line-height: 1;
}
.metric-card strong small {
  color: #8d8576;
  font-size: 0.72rem;
  font-weight: 500;
}
.metric-card em {
  color: #89847b;
  font-size: 0.63rem;
  font-style: normal;
}
.meter {
  height: 4px;
  overflow: hidden;
  border-radius: 4px;
  background: #282722;
}
.meter i,
.skill-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #8e6935, #d6ae5d);
}
.meter.large {
  height: 7px;
}
.overview-layout,
.production-layout,
.bank-layout,
.economy-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
  gap: 14px;
  align-items: start;
}
.overview-main,
.overview-side {
  display: grid;
  gap: 14px;
}
.panel {
  padding: 17px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.section-heading h3 {
  margin: 4px 0 0;
  color: #e8d6ae;
  font-size: 1rem;
}
.section-heading > span {
  color: #7f7c72;
  font-size: 0.65rem;
}
.section-heading > div {
  min-width: 0;
}
.status-pill,
.completed-tag {
  padding: 5px 8px;
  border: 1px solid #5a4930;
  border-radius: 99px;
  color: #d6ad62;
  background: #231d13;
  font-size: 0.62rem;
}
.completed-tag {
  border-color: #39483b;
  color: #8bb58e;
  background: #142119;
}
.profession-status-list,
.facility-list,
.queue-list,
.catalog-mini-list,
.inventory-list,
.ledger-list {
  display: grid;
  gap: 8px;
}
.profession-status-card,
.facility-row,
.queue-item,
.catalog-mini-row,
.inventory-row,
.equipment-row {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  padding: 10px;
  border: 1px solid #2f302c;
  border-radius: 7px;
  background: #111516;
}
.profession-mark,
.equipment-mark,
.inventory-icon,
.card-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 35px;
  height: 35px;
  border: 1px solid #6b542f;
  border-radius: 7px;
  color: #e1b865;
  background: #211b12;
  font-weight: 800;
}
.profession-mark.small {
  width: 27px;
  height: 27px;
  font-size: 0.72rem;
}
.profession-status-copy,
.facility-row > div,
.catalog-mini-row > div,
.inventory-row > div,
.equipment-row > div,
.queue-item > div {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.profession-status-copy {
  flex: 1;
}
.profession-status-copy strong,
.facility-row strong,
.catalog-mini-row strong,
.inventory-row strong,
.equipment-row strong,
.queue-item strong,
.production-card strong,
.recipe-copy strong {
  color: #ded0b5;
  font-size: 0.76rem;
}
.profession-status-copy span,
.facility-row span,
.catalog-mini-row small,
.inventory-row small,
.equipment-row span,
.queue-item small,
.production-card span,
.recipe-copy span {
  color: #89867d;
  font-size: 0.63rem;
}
.skill-track {
  height: 3px;
  margin-top: 2px;
  overflow: hidden;
  border-radius: 3px;
  background: #292a27;
}
.quiet,
.text-button,
.load-more,
button {
  border: 1px solid #624d2e;
  border-radius: 6px;
  color: #dcb665;
  background: #211a11;
  cursor: pointer;
}
.quiet {
  flex: 0 0 auto;
  padding: 7px 9px;
  font-size: 0.62rem;
}
.text-button {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 0.63rem;
}
.load-more {
  width: 100%;
  padding: 9px;
  font-size: 0.68rem;
}
.quiet:disabled,
button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.empty-state {
  display: grid;
  gap: 5px;
  padding: 24px 10px;
  text-align: center;
}
.empty-state strong {
  color: #bfb29c;
  font-size: 0.78rem;
}
.empty-state span {
  color: #777a74;
  font-size: 0.66rem;
}
.empty-state.compact {
  padding: 15px 5px;
}
.facility-row {
  justify-content: space-between;
}
.facility-row > div {
  flex: 1;
}
.facility-row span {
  color: #777a74;
}
.production-focus,
.catalog-focus {
  min-width: 0;
}
.queue-item {
  padding: 8px;
}
.queue-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #cf9d4d;
  box-shadow: 0 0 0 4px #352919;
}
.queue-dot[data-type="crafting"] {
  background: #89a5c1;
  box-shadow: 0 0 0 4px #202d39;
}
.catalog-mini-row {
  padding: 7px;
}
.catalog-mini-row > div {
  flex: 1;
}
.catalog-mini-row small {
  color: #777a74;
}
.production-layout {
  grid-template-columns: minmax(280px, 0.75fr) minmax(0, 1.25fr);
}
.production-grid {
  display: grid;
  gap: 8px;
}
.production-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #30312d;
  border-radius: 7px;
  background: #111516;
}
.card-icon {
  width: 31px;
  height: 31px;
  font-size: 0.95rem;
}
.card-icon.mining {
  color: #d5ab60;
}
.recipe-panel {
  min-width: 0;
}
.recipe-toolbar {
  display: grid;
  grid-template-columns: 1fr 150px 130px;
  gap: 7px;
  margin-bottom: 10px;
}
.recipe-list {
  display: grid;
  gap: 6px;
  max-height: 660px;
  overflow: auto;
  padding-right: 2px;
}
.recipe-row {
  display: grid;
  grid-template-columns: 45px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px;
  border: 1px solid #30312d;
  border-radius: 7px;
  background: #111516;
}
.recipe-type {
  padding: 5px 3px;
  border-radius: 4px;
  color: #d7ab58;
  background: #241c11;
  font-size: 0.58rem;
  text-align: center;
}
.recipe-type[data-category="crafting"] {
  color: #a6bdd1;
  background: #18242d;
}
.recipe-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.recipe-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recipe-actions {
  display: flex;
  gap: 5px;
}
.recipe-actions button {
  padding: 6px 8px;
  font-size: 0.6rem;
}
.bank-layout {
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.55fr);
}
.bank-panel {
  min-width: 0;
}
.bank-capacity {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}
.bank-capacity > div:first-child {
  display: flex;
  align-items: end;
  justify-content: space-between;
}
.bank-capacity strong {
  color: #eeddb7;
  font-size: 1.15rem;
}
.bank-capacity span,
.bank-capacity small {
  color: #85867f;
  font-size: 0.64rem;
}
.bank-toolbar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 11px;
}
.segmented {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid #393832;
  border-radius: 6px;
  background: #0e1112;
}
.segmented button {
  padding: 6px 8px;
  border: 0;
  color: #777970;
  background: transparent;
  font-size: 0.6rem;
}
.segmented button.active {
  color: #edc877;
  background: #282116;
}
.inventory-row {
  padding: 9px;
}
.inventory-icon {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 5px;
  color: #bd9c64;
  background: #292116;
  font-size: 0.65rem;
}
.inventory-icon[data-kind="consumable"] {
  color: #a8bed1;
  background: #1d2830;
}
.inventory-row > div {
  flex: 1;
}
.inventory-quantity {
  color: #e2c47e !important;
  font-size: 0.84rem !important;
  text-align: right;
}
.inventory-quantity small {
  color: #777970;
  font-size: 0.58rem;
  font-weight: 500;
}
.equipment-panel {
  min-width: 0;
}
.equipment-row {
  flex-wrap: wrap;
}
.equipment-row > div:nth-child(2) {
  flex: 1;
}
.equipment-mark {
  width: 28px;
  height: 28px;
  color: #bf9c5c;
  font-size: 0.65rem;
}
.economy-layout {
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
}
.economy-panel {
  min-width: 0;
}
.economy-hero-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 13px 0 16px;
  border-bottom: 1px solid #302e29;
}
.economy-hero-metrics div,
.economy-detail-grid div {
  display: grid;
  gap: 5px;
}
.economy-hero-metrics span,
.economy-detail-grid span {
  color: #85857d;
  font-size: 0.62rem;
}
.economy-hero-metrics strong {
  color: #e6d3aa;
  font-size: 1.1rem;
}
.positive {
  color: #8fca91 !important;
}
.negative {
  color: #d79083 !important;
}
.economy-hero-metrics small {
  color: #8c887e;
  font-size: 0.6rem;
}
.economy-detail-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding-top: 15px;
}
.economy-detail-grid strong {
  color: #ddc18a;
  font-size: 0.88rem;
}
.economy-detail-grid small {
  color: #777970;
  font-size: 0.6rem;
}
.ledger-list > div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #292a26;
  color: #a19a8b;
  font-size: 0.65rem;
}
.ledger-list b {
  margin-right: 6px;
  color: #9d947f;
  font-size: 0.57rem;
  font-weight: 700;
}
.ledger-list b[data-kind="gold-income"] {
  color: #8ec08f;
}
.ledger-list b[data-kind="gold-expense"] {
  color: #d28e80;
}
@media (max-width: 900px) {
  .overview-layout,
  .production-layout,
  .bank-layout,
  .economy-layout {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 680px) {
  .workspace-hero {
    align-items: stretch;
    flex-direction: column;
  }
  .member-picker {
    min-width: 0;
  }
  .metric-strip {
    grid-template-columns: repeat(2, 1fr);
  }
  .recipe-toolbar {
    grid-template-columns: 1fr 1fr;
  }
  .recipe-toolbar input {
    grid-column: 1 / -1;
  }
  .economy-hero-metrics,
  .economy-detail-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .bank-toolbar {
    grid-template-columns: 1fr;
  }
  .production-card {
    grid-template-columns: auto 1fr;
  }
  .production-card button {
    grid-column: 2;
    justify-self: start;
  }
  .recipe-row {
    grid-template-columns: 42px minmax(0, 1fr);
  }
  .recipe-actions {
    grid-column: 2;
  }
  .workspace-tabs button {
    min-width: 96px;
  }
}
</style>
