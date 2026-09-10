<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useGameStore } from "../../stores/game-store";
import { useUiStore } from "../../stores/ui-store";
import type { MemberId, QuestId, RosterPresetId } from "../../domain/shared/ids";
import type { MemberDungeonQuestClaim } from "../../application/commands/claim-member-dungeon-quests";
import QuestSettlementMeeting from "../components/QuestSettlementMeeting.vue";

type HallSection = "pending" | "active" | "claim" | "catalog";

const game = useGameStore();
const ui = useUiStore();
const notice = ref("");
const section = ref<HallSection>("pending");
const scope = ref(ui.selectedPartyMemberIds.length > 0 ? "party" : "all");
const search = ref("");
const selectedAcceptanceKeys = ref<Set<string>>(new Set());
const expandedQuestIds = ref<Set<QuestId>>(new Set());
const settlementOpen = ref(
  typeof window !== "undefined" && window.location.hash.includes("settlement=1"),
);

const scopeMemberIds = computed<readonly MemberId[]>(() => {
  if (scope.value === "party") return ui.selectedPartyMemberIds;
  if (scope.value.startsWith("preset:")) {
    const presetId = scope.value.slice("preset:".length) as RosterPresetId;
    return (
      game.rosterPresets?.presets.find((preset) => preset.id === presetId)?.currentMemberIds ?? []
    );
  }
  return game.members?.members.map((member) => member.id) ?? [];
});
const hall = computed(() => game.dungeonQuestHall(scopeMemberIds.value));
const settlement = computed(() => game.questSettlement(scopeMemberIds.value));
const filteredQuests = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase();
  return (hall.value?.quests ?? []).filter((quest) => {
    const statusMatch =
      section.value === "catalog" ||
      (section.value === "pending" && quest.counts.available > 0) ||
      (section.value === "active" && quest.counts.accepted > 0) ||
      (section.value === "claim" && quest.counts.completed > 0);
    const searchMatch =
      !keyword ||
      `${quest.name} ${quest.dungeonName} ${quest.description}`
        .toLocaleLowerCase()
        .includes(keyword);
    return statusMatch && searchMatch;
  });
});
const selectedAcceptanceCount = computed(() => selectedAcceptanceKeys.value.size);

watch(
  () =>
    hall.value?.quests.flatMap((quest) =>
      quest.members
        .filter((member) => member.canAccept)
        .map((member) => `${member.id}:${quest.id}`),
    ) ?? [],
  (availableKeys) => {
    selectedAcceptanceKeys.value = new Set(availableKeys);
  },
  { immediate: true },
);

function acceptanceKey(memberId: MemberId, questId: QuestId): string {
  return `${memberId}:${questId}`;
}

function toggleAcceptance(memberId: MemberId, questId: QuestId): void {
  const key = acceptanceKey(memberId, questId);
  const next = new Set(selectedAcceptanceKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  selectedAcceptanceKeys.value = next;
}

function toggleQuestMembers(questId: QuestId, memberIds: readonly MemberId[]): void {
  const keys = memberIds.map((memberId) => acceptanceKey(memberId, questId));
  const allSelected = keys.every((key) => selectedAcceptanceKeys.value.has(key));
  const next = new Set(selectedAcceptanceKeys.value);
  for (const key of keys) {
    if (allSelected) next.delete(key);
    else next.add(key);
  }
  selectedAcceptanceKeys.value = next;
}

function toggleExpanded(questId: QuestId): void {
  const next = new Set(expandedQuestIds.value);
  if (next.has(questId)) next.delete(questId);
  else next.add(questId);
  expandedQuestIds.value = next;
}

async function approveSelected(onlyQuestId?: QuestId): Promise<void> {
  const acceptances = (hall.value?.quests ?? []).flatMap((quest) =>
    onlyQuestId && quest.id !== onlyQuestId
      ? []
      : quest.members.flatMap((member) =>
          member.canAccept && selectedAcceptanceKeys.value.has(acceptanceKey(member.id, quest.id))
            ? [{ memberId: member.id, questId: quest.id }]
            : [],
        ),
  );
  const result = await game.acceptMemberDungeonQuests(acceptances);
  notice.value = result.ok
    ? `已批准 ${acceptances.length} 项成员任务，任务已进入进行中。`
    : result.error.message;
}

async function claim(memberId: MemberId, questId: QuestId, itemId?: string): Promise<void> {
  const result = await game.claimMemberDungeonQuest(memberId, questId, itemId as never);
  notice.value = result.ok ? "任务奖励已装备并记录到装备图鉴。" : result.error.message;
}

async function settleAll(claims: readonly MemberDungeonQuestClaim[]): Promise<void> {
  const result = await game.claimMemberDungeonQuests(claims);
  if (!result.ok) {
    notice.value = result.error.message;
    return;
  }
  settlementOpen.value = false;
  notice.value = `结算会完成，已为 ${claims.length} 项任务发放奖励。`;
}

async function setTracking(memberId: MemberId, questId: QuestId, paused: boolean): Promise<void> {
  const result = await game.setMemberDungeonQuestTracking(memberId, questId, paused);
  notice.value = result.ok
    ? paused
      ? "任务已暂缓跟踪，出征简报不会再主动推荐。"
      : "任务已恢复跟踪。"
    : result.error.message;
}

async function abandon(
  memberId: MemberId,
  memberName: string,
  questId: QuestId,
  questName: string,
): Promise<void> {
  if (!window.confirm(`确定让${memberName}放弃“${questName}”并清除现有进度吗？`)) return;
  const result = await game.abandonMemberDungeonQuest(memberId, questId);
  notice.value = result.ok ? "任务进度已清除，之后可以重新接取。" : result.error.message;
}
</script>

<template>
  <section v-if="hall" class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">公会任务大厅</p>
        <h2>副本任务</h2>
        <p class="subtitle">按委托集中审批，成员不再逐个翻找任务。</p>
      </div>
      <label class="scope-picker">
        <span>管理范围</span>
        <select v-model="scope">
          <option value="all">全部成员</option>
          <option value="party">当前阵容（{{ ui.selectedPartyMemberIds.length }} 人）</option>
          <option
            v-for="preset in game.rosterPresets?.presets ?? []"
            :key="preset.id"
            :value="`preset:${preset.id}`"
          >
            固定队伍 · {{ preset.name }}（{{ preset.currentMemberIds.length }} 人）
          </option>
        </select>
      </label>
    </header>

    <p v-if="notice" class="notice">{{ notice }}</p>
    <p v-if="hall.memberCount === 0" class="empty-scope">
      当前范围内没有成员。请先在作战室选择阵容，或切换到全部成员/固定队伍。
    </p>

    <nav class="status-board" aria-label="任务状态">
      <button :class="{ active: section === 'pending' }" @click="section = 'pending'">
        <span>待批准</span><strong>{{ hall.totals.pendingApproval }}</strong
        ><small>成员申请</small>
      </button>
      <button :class="{ active: section === 'active' }" @click="section = 'active'">
        <span>进行中</span><strong>{{ hall.totals.inProgress }}</strong
        ><small>成员任务</small>
      </button>
      <button :class="{ active: section === 'claim' }" @click="section = 'claim'">
        <span>待结算</span><strong>{{ hall.totals.pendingClaim }}</strong
        ><small>成员奖励</small>
      </button>
      <button :class="{ active: section === 'catalog' }" @click="section = 'catalog'">
        <span>副本目录</span><strong>{{ hall.quests.length }}</strong
        ><small>全部委托</small>
      </button>
    </nav>

    <div class="toolbar">
      <label>
        <span>搜索任务或副本</span>
        <input v-model="search" type="search" placeholder="例如：血色修道院" />
      </label>
      <button
        v-if="section === 'pending'"
        class="approve-button"
        type="button"
        :disabled="game.commandPending || selectedAcceptanceCount === 0"
        @click="approveSelected()"
      >
        {{ game.commandPending ? "正在登记……" : `批准选中申请（${selectedAcceptanceCount}）` }}
      </button>
      <button
        v-else-if="section === 'claim' && settlement?.entries.length"
        class="approve-button"
        type="button"
        :disabled="game.commandPending"
        @click="settlementOpen = true"
      >
        召开任务结算会（{{ settlement.entries.length }}）
      </button>
    </div>

    <div class="quest-list">
      <article v-for="quest in filteredQuests" :key="quest.id" class="quest-card">
        <header class="quest-heading">
          <div>
            <p class="dungeon-name">{{ quest.dungeonName }}</p>
            <h3>{{ quest.name }}</h3>
            <p>{{ quest.description }}</p>
          </div>
          <div class="counts">
            <span v-if="quest.counts.available">待批 {{ quest.counts.available }}</span>
            <span v-if="quest.counts.accepted">进行中 {{ quest.counts.accepted }}</span>
            <span v-if="quest.counts.completed">待结算 {{ quest.counts.completed }}</span>
          </div>
        </header>

        <aside class="publisher">
          <span>{{ quest.publisher.name }}</span>
          <strong>{{ quest.publisher.location }}</strong>
          <p>{{ quest.publisher.context }}</p>
        </aside>

        <dl>
          <div>
            <dt>目标</dt>
            <dd>{{ quest.objective.label }}</dd>
          </div>
          <div>
            <dt>奖励</dt>
            <dd>
              <span v-if="quest.rewards.fixedItems.length">
                固定：{{ quest.rewards.fixedItems.map((item) => item.name).join("、") }}
              </span>
              <span v-if="quest.rewards.fixedItems.length && quest.rewards.itemChoices.length"
                >；</span
              >
              <span v-if="quest.rewards.itemChoices.length">
                选择：{{ quest.rewards.itemChoices.map((item) => item.name).join(" / ") }}
              </span>
            </dd>
          </div>
        </dl>

        <section v-if="quest.counts.available" class="applications">
          <header>
            <strong>待批准成员</strong>
            <button
              type="button"
              @click="
                toggleQuestMembers(
                  quest.id,
                  quest.members.filter((member) => member.canAccept).map((member) => member.id),
                )
              "
            >
              全选 / 取消
            </button>
          </header>
          <div class="member-chips">
            <label
              v-for="member in quest.members.filter((entry) => entry.canAccept)"
              :key="member.id"
            >
              <input
                type="checkbox"
                :checked="selectedAcceptanceKeys.has(acceptanceKey(member.id, quest.id))"
                @change="toggleAcceptance(member.id, quest.id)"
              />
              <span
                >{{ member.name }} <small>Lv{{ member.level }}</small></span
              >
            </label>
          </div>
          <blockquote v-if="quest.members.find((member) => member.canAccept)">
            {{ quest.members.find((member) => member.canAccept)?.applicationLine }}
            <small v-if="quest.counts.available > 1">
              另有 {{ quest.counts.available - 1 }} 名同行申请者
            </small>
          </blockquote>
          <button
            class="approve-quest-button"
            type="button"
            :disabled="
              game.commandPending ||
              !quest.members.some(
                (member) =>
                  member.canAccept &&
                  selectedAcceptanceKeys.has(acceptanceKey(member.id, quest.id)),
              )
            "
            @click="approveSelected(quest.id)"
          >
            批准此委托的成员申请
          </button>
        </section>

        <button class="details-toggle" type="button" @click="toggleExpanded(quest.id)">
          {{ expandedQuestIds.has(quest.id) ? "收起成员详情" : "展开成员详情" }}
        </button>
        <section v-if="expandedQuestIds.has(quest.id)" class="member-details">
          <article v-for="member in quest.members" :key="member.id">
            <span>
              <strong>{{ member.name }}</strong>
              <small>
                Lv{{ member.level }} · {{ member.personalityName }} · {{ member.statusLabel }}
              </small>
              <q v-if="member.status === 'available'">{{ member.applicationLine }}</q>
            </span>
            <small v-if="member.blockedReasons.length && member.status === 'locked'">
              {{ member.blockedReasons.join("；") }}
            </small>
            <div v-if="member.status === 'completed'" class="claim-actions">
              <button
                v-for="item in quest.rewards.itemChoices"
                :key="item.id"
                type="button"
                :disabled="game.commandPending"
                @click="claim(member.id, quest.id, item.id)"
              >
                领取 {{ item.name }}
              </button>
              <button
                v-if="quest.rewards.itemChoices.length === 0"
                type="button"
                :disabled="game.commandPending"
                @click="claim(member.id, quest.id)"
              >
                领取奖励
              </button>
              <button
                type="button"
                class="secondary"
                :disabled="game.commandPending"
                @click="abandon(member.id, member.name, quest.id, quest.name)"
              >
                放弃并清除进度
              </button>
            </div>
            <div v-else-if="member.status === 'accepted'" class="tracking-actions">
              <button
                type="button"
                :disabled="game.commandPending"
                @click="setTracking(member.id, quest.id, !member.trackingPaused)"
              >
                {{ member.trackingPaused ? "恢复跟踪" : "暂缓跟踪" }}
              </button>
              <button
                type="button"
                class="danger"
                :disabled="game.commandPending"
                @click="abandon(member.id, member.name, quest.id, quest.name)"
              >
                放弃并清除进度
              </button>
            </div>
          </article>
        </section>
      </article>
      <p v-if="filteredQuests.length === 0" class="empty">当前栏目没有符合条件的任务。</p>
    </div>
    <QuestSettlementMeeting
      :open="settlementOpen"
      :settlement="settlement"
      :pending="game.commandPending"
      @confirm="settleAll"
      @close="settlementOpen = false"
    />
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
.kicker {
  margin: 0;
  color: #9b7438;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.subtitle {
  margin: 5px 0 0;
  color: #8f8575;
  font-size: 0.72rem;
}
.scope-picker,
.toolbar label {
  display: grid;
  gap: 4px;
  color: #8f8575;
  font-size: 0.68rem;
}
select,
input[type="search"] {
  min-width: 220px;
  padding: 8px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  color: #e2d5bb;
  background: #0b0e10;
}
.notice,
.empty-scope {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #3f7045;
  border-radius: 6px;
  color: #91cc96;
  background: #112016;
  font-size: 0.72rem;
}
.empty-scope {
  border-color: #6f5b35;
  color: #d0ae6c;
  background: #1c1810;
}
.status-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.status-board button {
  display: grid;
  gap: 2px;
  padding: 12px;
  border: 1px solid #37332c;
  border-radius: 7px;
  color: #a89b84;
  background: #111416;
  text-align: left;
  cursor: pointer;
}
.status-board button.active {
  border-color: #a27c3c;
  background: #211d16;
}
.status-board strong {
  color: #e5bd62;
  font-size: 1.35rem;
}
.status-board small {
  color: #756e62;
}
.toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}
.approve-button,
.claim-actions button {
  padding: 9px 12px;
  border: 1px solid #b08743;
  border-radius: 6px;
  color: #18130c;
  background: #d4a653;
  font-weight: 800;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.quest-list {
  display: grid;
  gap: 12px;
}
.quest-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #403a30;
  border-radius: 8px;
  background: #111416;
}
.quest-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
}
.quest-heading h3,
.quest-heading p {
  margin: 0;
}
.quest-heading h3 {
  margin-top: 3px;
  color: #e5d2af;
  font-family: Georgia, serif;
}
.quest-heading > div > p:last-child {
  margin-top: 5px;
  color: #968b7b;
  font-size: 0.7rem;
  line-height: 1.45;
}
.publisher {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 9px;
  padding: 9px 10px;
  border-left: 2px solid #80602e;
  background: #17140f;
}
.publisher span {
  color: #d0a75c;
  font-size: 0.66rem;
  font-weight: 800;
}
.publisher strong {
  color: #9d917d;
  font-size: 0.63rem;
  font-weight: 500;
}
.publisher p {
  grid-column: 1 / -1;
  margin: 2px 0 0;
  color: #827867;
  font-size: 0.62rem;
}
.dungeon-name {
  color: #b48743;
  font-size: 0.63rem;
  font-weight: 800;
}
.counts {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  gap: 5px;
}
.counts span {
  padding: 4px 6px;
  border: 1px solid #5a4930;
  border-radius: 999px;
  color: #d5b26b;
  font-size: 0.61rem;
  white-space: nowrap;
}
dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  margin: 0;
}
dl div {
  padding: 9px 10px;
  background: #0b0e10;
}
dt {
  color: #756e62;
  font-size: 0.6rem;
}
dd {
  margin: 3px 0 0;
  color: #cfc0a5;
  font-size: 0.72rem;
}
.applications {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #3d3529;
  background: #0b0e10;
}
.applications > header {
  display: flex;
  justify-content: space-between;
}
.applications strong {
  color: #cdb98e;
  font-size: 0.7rem;
}
.applications button,
.details-toggle {
  padding: 0;
  border: 0;
  color: #c99b4d;
  background: transparent;
  font-size: 0.65rem;
  cursor: pointer;
}
.applications .approve-quest-button {
  justify-self: start;
  padding: 7px 9px;
  border: 1px solid #8c6b37;
  border-radius: 5px;
  color: #17120c;
  background: #c99b4d;
  font-weight: 800;
}
.applications blockquote {
  display: grid;
  gap: 3px;
  margin: 0;
  padding: 8px 10px;
  border-left: 2px solid #6e5935;
  color: #b6a78d;
  background: #13120f;
  font-size: 0.66rem;
}
.applications blockquote small {
  color: #766e62;
}
.member-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.member-chips label {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 8px;
  border: 1px solid #37332c;
  border-radius: 5px;
  color: #d5c7ad;
  font-size: 0.68rem;
  cursor: pointer;
}
.member-chips input {
  accent-color: #c89543;
}
.member-chips small {
  color: #7f776b;
}
.details-toggle {
  justify-self: start;
}
.member-details {
  display: grid;
  gap: 5px;
}
.member-details > article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #302e29;
  background: #090c0d;
}
.member-details span {
  display: grid;
}
.member-details q {
  margin-top: 3px;
  color: #a4947a;
  font-size: 0.6rem;
}
.member-details strong {
  color: #d6c8ae;
  font-size: 0.7rem;
}
.member-details small {
  color: #847b6d;
  font-size: 0.61rem;
}
.claim-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  gap: 5px;
}
.claim-actions button {
  padding: 5px 7px;
  font-size: 0.61rem;
}
.tracking-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  gap: 5px;
}
.tracking-actions button {
  padding: 5px 7px;
  border: 1px solid #685837;
  border-radius: 5px;
  color: #c9ad73;
  background: #211d16;
  font-size: 0.61rem;
  cursor: pointer;
}
.tracking-actions button.danger,
.claim-actions button.secondary {
  border-color: #654039;
  color: #c9877b;
  background: #211513;
}
.empty {
  margin: 0;
  padding: 30px;
  border: 1px dashed #403a30;
  color: #8b8273;
  text-align: center;
}
@media (max-width: 720px) {
  .page-heading,
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .status-board {
    grid-template-columns: repeat(2, 1fr);
  }
  dl {
    grid-template-columns: 1fr;
  }
  .quest-heading {
    flex-direction: column;
  }
  .counts {
    justify-content: start;
  }
  select,
  input[type="search"] {
    width: 100%;
    min-width: 0;
  }
}
</style>
