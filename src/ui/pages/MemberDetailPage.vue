<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import type { MemberDetailView } from "../../application/queries/get-members-view";
import type { SpecId } from "../../domain/shared/ids";
import { useGameStore } from "../../stores/game-store";
import { useUiStore } from "../../stores/ui-store";
import CharacterSheet from "../components/CharacterSheet.vue";
import StatSummary from "../components/StatSummary.vue";

const route = useRoute();
const router = useRouter();
const game = useGameStore();
const ui = useUiStore();
const detail = computed<MemberDetailView | null>(() => {
  const entry = game.members?.members.find((member) => member.id === route.params.memberId);
  return entry ? game.memberDetail(entry.id) : null;
});
const selectedSpecId = ref<SpecId | null>(null);
const respecPreview = computed(() =>
  detail.value && selectedSpecId.value
    ? game.respecPreview(detail.value.id, selectedSpecId.value)
    : null,
);

watch(
  detail,
  (member) => {
    if (!member) return;
    ui.selectMember(member.id);
    selectedSpecId.value = member.availableSpecs.find((spec) => spec.current)?.id ?? null;
  },
  { immediate: true },
);

function changeSpec(): void {
  if (!detail.value || !selectedSpecId.value || !respecPreview.value) return;
  ui.openModal({ name: "respec-member", entityId: detail.value.id });
}

async function confirmRespec(): Promise<void> {
  if (!detail.value || !selectedSpecId.value) return;
  const outcome = await game.respecMember(detail.value.id, selectedSpecId.value);
  if (outcome.ok) ui.closeModal();
}

async function confirmDismiss(): Promise<void> {
  if (!detail.value) return;
  const outcome = await game.dismissMember(detail.value.id);
  if (!outcome.ok || !outcome.result) return;
  ui.closeModal();
  ui.selectMember(null);
  await router.push("/members");
}

function contributionName(capability: string | undefined): string {
  return (
    { survivability: "生存", threat: "仇恨", healing: "治疗", damage: "伤害" }[capability ?? ""] ??
    "面板"
  );
}
</script>

<template>
  <section v-if="detail" class="page-stack">
    <header class="detail-heading">
      <div>
        <RouterLink to="/members">← 返回成员列表</RouterLink>
        <h2>{{ detail.name }}</h2>
        <p>
          {{ detail.raceName }} {{ detail.className }} · {{ detail.specName }} ·
          {{ detail.roleName }}
        </p>
      </div>
      <span :class="{ active: detail.active }">{{
        detail.active ? "正在参加活动" : "当前空闲"
      }}</span>
    </header>

    <CharacterSheet :member="detail" />
    <StatSummary :stats="detail.aggregateStats" :capabilities="detail.capabilities" />

    <section class="panel">
      <header>
        <div>
          <h3>战斗属性贡献</h3>
          <p>公式 {{ detail.formulaVersion }} 的可解释计算结果</p>
        </div>
      </header>
      <div class="contribution-list">
        <div v-for="entry in detail.contributions" :key="entry.id">
          <span>{{ contributionName(entry.capability) }}</span>
          <p>{{ entry.description }}</p>
          <strong :class="{ negative: entry.amount < 0 }"
            >{{ entry.amount >= 0 ? "+" : "" }}{{ entry.amount.toFixed(3) }}</strong
          >
        </div>
      </div>
    </section>

    <section class="panel management">
      <header>
        <div>
          <h3>成员管理</h3>
          <p>
            {{ detail.personalityName }}：{{ detail.personalityBenefit }}；{{
              detail.personalityDrawback
            }}
          </p>
        </div>
      </header>
      <div class="management-row">
        <label>
          <span>固定专精</span>
          <select v-model="selectedSpecId" :disabled="!detail.canManage || game.commandPending">
            <option v-for="spec in detail.availableSpecs" :key="spec.id" :value="spec.id">
              {{ spec.name }} · {{ spec.roleName }}
            </option>
          </select>
        </label>
        <button
          type="button"
          :disabled="
            !detail.canManage ||
            !detail.canAffordRespec ||
            game.commandPending ||
            detail.availableSpecs.find((spec) => spec.id === selectedSpecId)?.current
          "
          @click="changeSpec"
        >
          更改专精 · {{ detail.respecCost }} G
        </button>
        <button
          class="danger"
          type="button"
          :disabled="!detail.canManage || game.commandPending"
          @click="ui.openModal({ name: 'dismiss-member', entityId: detail.id })"
        >
          移出公会
        </button>
      </div>
      <p v-if="!detail.canManage" class="warning">活动中的成员不能更改专精或移出公会。</p>
    </section>

    <div
      v-if="
        ui.activeModal?.name === 'respec-member' &&
        ui.activeModal.entityId === detail.id &&
        respecPreview
      "
      class="modal-backdrop"
      @click.self="ui.closeModal()"
    >
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="respec-title">
        <h3 id="respec-title">确认改为 {{ respecPreview.targetSpecName }}？</h3>
        <p>本次转专精需要 {{ detail.respecCost }} G，不兼容装备仍按现有规则出售并补齐初始装备。</p>
        <footer>
          <button type="button" @click="ui.closeModal()">取消</button>
          <button type="button" :disabled="game.commandPending" @click="confirmRespec">
            确认转专精
          </button>
        </footer>
      </section>
    </div>

    <div
      v-if="ui.activeModal?.name === 'dismiss-member' && ui.activeModal.entityId === detail.id"
      class="modal-backdrop"
      @click.self="ui.closeModal()"
    >
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="dismiss-title">
        <h3 id="dismiss-title">确认移出 {{ detail.name }}？</h3>
        <p>移除没有资金代价，但该成员身上的装备也会一并离开公会。</p>
        <footer>
          <button type="button" @click="ui.closeModal()">取消</button
          ><button
            class="danger"
            type="button"
            :disabled="game.commandPending"
            @click="confirmDismiss"
          >
            确认移出
          </button>
        </footer>
      </section>
    </div>
  </section>
  <section v-else class="missing">
    <h2>找不到这名成员</h2>
    <RouterLink to="/members">返回公会名册</RouterLink>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 18px;
}
.detail-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}
.detail-heading a {
  color: #a88245;
  font-size: 0.75rem;
  text-decoration: none;
}
.detail-heading h2 {
  margin: 8px 0 2px;
  color: #f0dfbf;
  font-family: Georgia, serif;
  font-size: 2rem;
}
.detail-heading p {
  margin: 0;
  color: #988e7d;
}
.detail-heading > span {
  color: #73ac77;
  font-size: 0.78rem;
}
.detail-heading > span.active {
  color: #72a7d0;
}
.panel {
  padding: 17px;
  border: 1px solid #37332c;
  border-radius: 8px;
  background: #111416;
}
.panel header h3 {
  margin: 0;
  color: #ddcaa6;
}
.panel header p {
  margin: 4px 0 0;
  color: #837b6e;
  font-size: 0.72rem;
}
.contribution-list {
  display: grid;
  gap: 5px;
  margin-top: 14px;
}
.contribution-list > div {
  display: grid;
  grid-template-columns: 54px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 7px 9px;
  background: #0b0e10;
}
.contribution-list span {
  color: #caa454;
  font-size: 0.68rem;
}
.contribution-list p {
  margin: 0;
  color: #9f9584;
  font-size: 0.72rem;
}
.contribution-list strong {
  color: #6eba76;
  font-size: 0.72rem;
}
.contribution-list strong.negative {
  color: #ca6e63;
}
.management-row {
  display: flex;
  align-items: end;
  gap: 10px;
  margin-top: 15px;
}
label {
  display: grid;
  flex: 1;
  gap: 5px;
  color: #8f8575;
  font-size: 0.7rem;
}
select,
button {
  min-height: 38px;
  padding: 8px 11px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  color: #e2d5bb;
  background: #0b0e10;
}
button {
  border-color: #ad8541;
  color: #17130d;
  background: #d5a956;
  font-weight: 800;
  cursor: pointer;
}
button.danger {
  border-color: #824139;
  color: #e4b3ac;
  background: #2b1513;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.warning {
  margin-bottom: 0;
  color: #cc786c;
  font-size: 0.75rem;
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
  width: min(420px, 100%);
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
.missing {
  padding: 50px;
  text-align: center;
}
.missing a {
  color: #d1a658;
}
@media (max-width: 650px) {
  .management-row,
  .detail-heading {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
