<script setup lang="ts">
import type {
  DungeonOptionView,
  PartyPreviewView,
  PartyMechanicReadinessView,
  OptionalRouteNodeView,
  RareRouteNodeView,
  DungeonRouteVariantView,
  QuestRouteWarningView,
} from "../../application/queries/get-dungeons-view";
import BossRoute from "./BossRoute.vue";

defineProps<{
  dungeon: DungeonOptionView | null;
  preview: PartyPreviewView | null;
  mechanicReadiness: readonly PartyMechanicReadinessView[];
  optionalRoutes: readonly OptionalRouteNodeView[];
  rareRoutes: readonly RareRouteNodeView[];
  routeVariants?: readonly DungeonRouteVariantView[];
  questRouteWarnings?: readonly QuestRouteWarningView[];
  issues: readonly string[];
  requestedRuns: number;
  canStart: boolean;
  pending: boolean;
}>();

defineEmits<{
  start: [];
  toggleOptional: [nodeId: OptionalRouteNodeView["id"]];
  selectRouteVariant: [variantId: DungeonRouteVariantView["id"]];
}>();

function probabilityLabel(probability: number): string {
  return `${(probability * 100).toFixed(2)}%`;
}

function durationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
</script>

<template>
  <aside class="party-preview panel">
    <header>
      <div>
        <h3>出发预览</h3>
        <p v-if="preview">公式 {{ preview.formulaVersion }}</p>
      </div>
      <strong v-if="preview">全通 {{ probabilityLabel(preview.clearProbability) }}</strong>
    </header>

    <template v-if="preview">
      <section v-if="routeVariants?.length" class="route-variants">
        <h4>副本路线</h4>
        <label v-for="variant in routeVariants" :key="variant.id">
          <input
            type="radio"
            name="dungeon-route-variant"
            :value="variant.id"
            :checked="variant.selected"
            @change="$emit('selectRouteVariant', variant.id)"
          />
          <span>
            <strong>{{ variant.name }}</strong>
            <small>{{ variant.description }}</small>
          </span>
        </label>
      </section>
      <dl class="metrics">
        <div>
          <dt>坦克</dt>
          <dd>{{ preview.contribution.tank.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>治疗</dt>
          <dd>{{ preview.contribution.healing.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>输出</dt>
          <dd>{{ preview.contribution.damage.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>单次耗时</dt>
          <dd>{{ durationLabel(preview.durationSeconds) }}</dd>
        </div>
      </dl>
      <BossRoute :stages="preview.encounters" />
      <section v-if="optionalRoutes.length || rareRoutes.length" class="route-options">
        <h4>路线安排</h4>
        <label v-for="route in optionalRoutes" :key="route.id">
          <input
            type="checkbox"
            :checked="route.selected"
            @change="$emit('toggleOptional', route.id)"
          />
          <span>
            <strong>可选 · {{ route.name }}</strong>
            <small>{{ route.description }}</small>
            <small>
              额外 {{ route.durationSeconds ? durationLabel(route.durationSeconds) : "待评估" }} ·
              胜率
              {{ route.probability === null ? "待评估" : probabilityLabel(route.probability) }} ·
              掉落池 {{ route.lootItemCount }} 件
            </small>
          </span>
        </label>
        <article v-for="route in rareRoutes" :key="route.id">
          <span>
            <strong>稀有 · {{ route.name }}</strong>
            <small>
              出现率 {{ probabilityLabel(route.spawnProbability) }} · 条件胜率
              {{
                route.conditionalProbability === null
                  ? "待评估"
                  : probabilityLabel(route.conditionalProbability)
              }}
              · 最多增加
              {{ route.durationSeconds ? durationLabel(route.durationSeconds) : "待评估" }} · 掉落池
              {{ route.lootItemCount }} 件
            </small>
          </span>
        </article>
      </section>
      <p class="total-time">
        连续 {{ requestedRuns }} 次预计占用
        <strong
          v-if="preview.durationRange.minimumSeconds === preview.durationRange.maximumSeconds"
        >
          {{ durationLabel(preview.durationSeconds * requestedRuns) }}
        </strong>
        <strong v-else>
          {{ durationLabel(preview.durationRange.minimumSeconds * requestedRuns) }}–{{
            durationLabel(preview.durationRange.maximumSeconds * requestedRuns)
          }}
        </strong>
      </p>
      <section v-if="preview.experience.length" class="experience-preview">
        <h4>预计经验</h4>
        <p>按所选路线全部取胜计算 {{ requestedRuns }} 次；实际经验随灭团位置结算。</p>
        <article v-for="member in preview.experience" :key="member.memberId">
          <span>
            <strong>{{ member.memberName }}</strong>
            <small v-if="member.boostMultiplier < 1 && member.experienceFraction > 0">
              等级差衰减 {{ Math.round(member.boostMultiplier * 100) }}%
            </small>
          </span>
          <span>
            <strong>+{{ member.experienceFraction.toFixed(2) }} 级</strong>
            <small>
              {{ member.currentLevel }} 级 → {{ member.projectedLevel }} 级
              <template v-if="member.projectedLevel < preview.levelCap">
                {{ Math.round(member.projectedExperience * 100) }}%
              </template>
            </small>
          </span>
        </article>
      </section>
    </template>
    <p v-else class="placeholder">选择成员后，会在这里显示每位 Boss 的精确胜率与固定出发耗时。</p>

    <section v-if="mechanicReadiness.length" class="mechanics">
      <h4>机制准备</h4>
      <article
        v-for="mechanic in mechanicReadiness"
        :key="`${mechanic.encounterId}:${mechanic.id}`"
        :class="mechanic.status"
      >
        <header>
          <strong>{{ mechanic.encounterName }} · {{ mechanic.name }}</strong>
          <em>{{
            { satisfied: "已满足", partial: "部分满足", missing: "缺失" }[mechanic.status]
          }}</em>
        </header>
        <p>{{ mechanic.description }}</p>
        <ul>
          <li v-for="requirement in mechanic.requirements" :key="requirement.capabilityName">
            {{ requirement.capabilityName }}
            {{ requirement.currentValue.toFixed(1) }}/{{ requirement.minimumValue.toFixed(1) }}
          </li>
        </ul>
        <small v-if="mechanic.impactLabels.length">{{ mechanic.impactLabels.join(" · ") }}</small>
        <small v-else-if="mechanic.status === 'satisfied'">无额外惩罚</small>
        <small v-else-if="mechanic.type === 'required'">必须满足后才能出发</small>
      </article>
    </section>

    <ul v-if="issues.length" class="issues">
      <li v-for="issue in issues" :key="issue">{{ issue }}</li>
    </ul>
    <ul v-if="questRouteWarnings?.length" class="quest-warnings">
      <li v-for="warning in questRouteWarnings" :key="`${warning.memberId}:${warning.questId}`">
        {{ warning.message }}请手动勾选后再出发。
      </li>
    </ul>
    <button type="button" :disabled="!canStart || pending" @click="$emit('start')">
      {{ pending ? "正在登记队伍……" : `出发：${dungeon?.name ?? "副本"}` }}
    </button>
  </aside>
</template>

<style scoped>
.panel {
  padding: 16px;
  border: 1px solid #51452f;
  border-radius: 8px;
  background: #12130f;
}
header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
h3,
p {
  margin: 0;
}
h3 {
  color: #dfcca6;
}
header p {
  margin-top: 3px;
  color: #80786a;
  font-size: 0.66rem;
}
header > strong {
  color: #e6bd5d;
  font-size: 1.05rem;
}
.route-variants {
  display: grid;
  gap: 5px;
  margin-bottom: 12px;
}
.route-variants h4 {
  margin: 0 0 2px;
  color: #bca87f;
  font-size: 0.72rem;
}
.route-variants label {
  display: flex;
  align-items: start;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #3d3529;
  background: #090c0d;
  cursor: pointer;
}
.route-variants input {
  margin-top: 3px;
  accent-color: #c89543;
}
.route-variants span {
  display: grid;
  gap: 2px;
}
.route-variants strong {
  color: #d6c39f;
  font-size: 0.68rem;
}
.route-variants small {
  color: #8f8575;
  font-size: 0.61rem;
  line-height: 1.4;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
  margin: 0 0 12px;
}
.metrics div {
  padding: 8px;
  background: #090c0d;
  text-align: center;
}
dt {
  color: #7e7669;
  font-size: 0.58rem;
}
dd {
  margin: 3px 0 0;
  color: #d9c9a9;
  font-size: 0.72rem;
  font-weight: 800;
}
.total-time,
.placeholder {
  margin-top: 12px;
  color: #948a79;
  font-size: 0.72rem;
  line-height: 1.5;
}
.total-time strong {
  color: #e2b85c;
}
.experience-preview {
  display: grid;
  gap: 5px;
  margin-top: 12px;
}
.experience-preview h4,
.experience-preview p {
  margin: 0;
}
.experience-preview h4 {
  color: #bca87f;
  font-size: 0.72rem;
}
.experience-preview > p {
  color: #756e61;
  font-size: 0.62rem;
}
.experience-preview article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 9px;
  background: #090c0d;
}
.experience-preview article > span {
  display: grid;
  gap: 2px;
}
.experience-preview article > span:last-child {
  text-align: right;
}
.experience-preview strong {
  color: #d9c9a9;
  font-size: 0.68rem;
}
.experience-preview small {
  color: #8e8577;
  font-size: 0.58rem;
}
.placeholder {
  padding: 35px 10px;
  text-align: center;
}
.issues {
  display: grid;
  gap: 3px;
  padding: 0;
  margin: 12px 0;
  color: #c97569;
  font-size: 0.68rem;
  list-style: none;
}
.quest-warnings {
  padding: 10px 12px 10px 28px;
  margin: 12px 0;
  border: 1px solid #725d35;
  border-radius: 6px;
  color: #d3b77c;
  background: #211b10;
  font-size: 0.68rem;
}
.mechanics {
  display: grid;
  gap: 6px;
  margin-top: 12px;
}
.route-options {
  display: grid;
  gap: 5px;
  margin-top: 12px;
}
.route-options h4 {
  margin: 0 0 2px;
  color: #bca87f;
  font-size: 0.72rem;
}
.route-options label,
.route-options article {
  display: flex;
  align-items: start;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #343027;
  background: #090c0d;
}
.route-options input {
  margin-top: 3px;
}
.route-options span {
  display: grid;
  gap: 2px;
}
.route-options strong {
  color: #d6c39f;
  font-size: 0.68rem;
}
.route-options small {
  color: #8f8575;
  font-size: 0.61rem;
  line-height: 1.4;
}
.route-options article {
  border-color: #4a3b5c;
}
.route-options article strong {
  color: #baa3d2;
}
.mechanics h4 {
  margin: 0;
  color: #bca87f;
  font-size: 0.72rem;
}
.mechanics article {
  padding: 8px 10px;
  border-left: 2px solid #a75249;
  background: #0a0d0f;
}
.mechanics article.satisfied {
  border-left-color: #5e9d65;
}
.mechanics article.partial {
  border-left-color: #b08743;
}
.mechanics article header {
  align-items: center;
  margin: 0 0 4px;
}
.mechanics article em {
  color: #c97569;
  font-size: 0.62rem;
  font-style: normal;
}
.mechanics article.satisfied em {
  color: #77bd7d;
}
.mechanics article.partial em {
  color: #d4a653;
}
.mechanics article p,
.mechanics article li,
.mechanics article small {
  color: #918777;
  font-size: 0.62rem;
  line-height: 1.45;
}
.mechanics article ul {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding: 0;
  margin: 4px 0;
  list-style: none;
}
button {
  width: 100%;
  min-height: 42px;
  margin-top: 12px;
  border: 1px solid #b08743;
  border-radius: 6px;
  color: #18130c;
  background: #d4a653;
  font-weight: 850;
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
@media (max-width: 500px) {
  .metrics {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
