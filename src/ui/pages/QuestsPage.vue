<script setup lang="ts">
import { computed, ref } from "vue";
import { useGameStore } from "../../stores/game-store";
import type { MemberId } from "../../domain/shared/ids";

const game = useGameStore();
const selectedMemberId = ref<MemberId | null>(null);
const notice = ref("");
const selectedMember = computed(() => {
  const members = game.members?.members ?? [];
  return members.find((member) => member.id === selectedMemberId.value) ?? members[0] ?? null;
});
const quests = computed(() =>
  selectedMember.value ? (game.memberDungeonQuests(selectedMember.value.id)?.quests ?? []) : [],
);

async function accept(questId: string): Promise<void> {
  if (!selectedMember.value) return;
  const result = await game.acceptMemberDungeonQuest(selectedMember.value.id, questId as never);
  notice.value = result.ok ? "任务已接取。" : result.error.message;
}

async function claim(questId: string, itemId: string): Promise<void> {
  if (!selectedMember.value) return;
  const result = await game.claimMemberDungeonQuest(
    selectedMember.value.id,
    questId as never,
    itemId as never,
  );
  notice.value = result.ok ? "任务奖励已装备并记录到装备图鉴。" : result.error.message;
}
</script>

<template>
  <section v-if="game.members" class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">成员任务</p>
        <h2>副本任务</h2>
      </div>
      <label>
        <span>查看成员</span>
        <select v-model="selectedMemberId">
          <option v-for="member in game.members.members" :key="member.id" :value="member.id">
            {{ member.name }} · Lv{{ member.level }}
          </option>
        </select>
      </label>
    </header>

    <p v-if="notice" class="notice">{{ notice }}</p>
    <div class="quest-grid">
      <article
        v-for="quest in quests"
        :key="quest.id"
        class="quest-card"
        :data-status="quest.status"
      >
        <header>
          <div>
            <span class="status">{{ quest.statusLabel }}</span>
            <h3>{{ quest.name }}</h3>
            <p>{{ quest.dungeonName }} · {{ quest.description }}</p>
          </div>
        </header>
        <dl>
          <div>
            <dt>目标</dt>
            <dd>{{ quest.objective.label }}</dd>
          </div>
          <div>
            <dt>奖励</dt>
            <dd>
              {{ quest.rewards.itemChoices.map((item) => item.name).join(" / ") }}
            </dd>
          </div>
        </dl>
        <p v-if="quest.blockedReasons.length && quest.status === 'locked'" class="blocked">
          {{ quest.blockedReasons.join("；") }}
        </p>
        <div v-if="quest.status === 'completed'" class="reward-choices">
          <strong>选择一件奖励并装备给 {{ selectedMember?.name }}</strong>
          <button
            v-for="item in quest.rewards.itemChoices"
            :key="item.id"
            type="button"
            :disabled="game.commandPending"
            @click="claim(quest.id, item.id)"
          >
            领取 {{ item.name }}
          </button>
        </div>
        <button
          v-else-if="quest.canAccept"
          type="button"
          :disabled="game.commandPending"
          @click="accept(quest.id)"
        >
          接取任务
        </button>
        <p v-else-if="quest.status === 'accepted'" class="accepted">
          已接取。组队时会自动带入活动快照。
        </p>
        <p v-else-if="quest.status === 'claimed'" class="claimed">奖励已领取。</p>
      </article>
    </div>
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
.page-heading label {
  display: grid;
  gap: 4px;
  color: #8f8575;
  font-size: 0.68rem;
}
select {
  min-width: 190px;
  padding: 8px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  color: #e2d5bb;
  background: #0b0e10;
}
.kicker {
  margin: 0;
  color: #9b7438;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.notice {
  padding: 10px 12px;
  border: 1px solid #3f7045;
  border-radius: 6px;
  color: #91cc96;
  background: #112016;
  font-size: 0.72rem;
}
.quest-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}
.quest-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #403a30;
  border-radius: 8px;
  background: #111416;
}
.quest-card[data-status="completed"] {
  border-color: #92723b;
}
.status {
  color: #d19f48;
  font-size: 0.64rem;
  font-weight: 800;
}
h3,
p {
  margin: 0;
}
h3 {
  margin-top: 3px;
  color: #e5d2af;
  font-family: Georgia, serif;
}
header p {
  margin-top: 5px;
  color: #968b7b;
  font-size: 0.7rem;
  line-height: 1.45;
}
dl {
  display: grid;
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
.blocked {
  color: #c98578;
  font-size: 0.68rem;
}
.accepted,
.claimed {
  color: #8fb18a;
  font-size: 0.7rem;
}
.reward-choices {
  display: grid;
  gap: 6px;
}
.reward-choices strong {
  color: #d6bb7e;
  font-size: 0.68rem;
}
button {
  padding: 9px 12px;
  border: 1px solid #b08743;
  border-radius: 6px;
  color: #18130c;
  background: #d4a653;
  font-weight: 800;
  cursor: pointer;
}
button:disabled {
  color: #777066;
  background: #282620;
  cursor: not-allowed;
}
</style>
