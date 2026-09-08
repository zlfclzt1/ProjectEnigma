<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "../../stores/game-store";
import RecruitCandidateCard from "../components/RecruitCandidateCard.vue";

const game = useGameStore();
const countdown = computed(() => {
  const milliseconds = game.recruitment?.remainingMilliseconds;
  if (milliseconds === undefined) return "停止积累";
  const seconds = Math.ceil(milliseconds / 1_000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
});
</script>

<template>
  <section v-if="game.recruitment" class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">招募大厅</p>
        <h2>今天谁在找公会？</h2>
        <p>职业、专精、定位和入会装等均为准确数据。</p>
      </div>
      <div class="timer" :class="{ stopped: game.recruitment.recruitmentFull }">
        <span>{{ game.recruitment.recruitmentFull ? "候选区已满" : "下位候选人" }}</span>
        <strong>{{ countdown }}</strong>
      </div>
    </header>

    <div class="toolbar">
      <span
        >候选 {{ game.recruitment.candidateCount }} / {{ game.recruitment.candidateCapacity }}</span
      >
      <span>成员 {{ game.recruitment.memberCount }} / {{ game.recruitment.memberCapacity }}</span>
      <button
        type="button"
        :disabled="game.commandPending || !game.recruitment.canPaidRefresh"
        :title="game.recruitment.paidRefreshReason"
        @click="game.paidRefreshCandidate()"
      >
        立即物色新人 · {{ game.recruitment.paidRefreshCost }} G
      </button>
    </div>

    <div v-if="game.recruitment.candidates.length" class="candidate-grid">
      <RecruitCandidateCard
        v-for="candidate in game.recruitment.candidates"
        :key="candidate.id"
        :candidate="candidate"
        :busy="game.commandPending"
        :can-recruit="game.recruitment.canRecruit"
        @recruit="game.recruitCandidate(candidate.id)"
        @reject="game.rejectCandidate(candidate.id)"
      />
    </div>
    <p v-else class="empty">招募官正在门口贴新告示。也许字写得太小了。</p>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 22px;
}
.page-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
}
.page-heading h2 {
  margin: 3px 0 7px;
  color: #f0dfbf;
  font-family: Georgia, serif;
  font-size: 2rem;
}
.page-heading p:last-child {
  margin: 0;
  color: #9c927f;
}
.kicker {
  margin: 0;
  color: #9b7438;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.timer {
  min-width: 128px;
  padding: 12px 15px;
  border: 1px solid #6f5731;
  border-radius: 8px;
  text-align: right;
  background: #17140f;
}
.timer span {
  display: block;
  color: #958873;
  font-size: 0.7rem;
}
.timer strong {
  display: block;
  margin-top: 4px;
  color: #f2cc72;
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
}
.timer.stopped {
  border-color: #514b42;
}
.timer.stopped strong {
  color: #9f9584;
  font-size: 0.9rem;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border: 1px solid #302e29;
  border-radius: 8px;
  background: #111416;
  color: #a59a87;
  font-size: 0.82rem;
}
.toolbar button {
  margin-left: auto;
  padding: 9px 12px;
  border: 1px solid #b48a43;
  border-radius: 6px;
  color: #18140e;
  background: #d8aa57;
  font-weight: 800;
  cursor: pointer;
}
.toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.candidate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
.empty {
  padding: 32px;
  border: 1px dashed #38342d;
  border-radius: 8px;
  color: #958a77;
  text-align: center;
}
@media (max-width: 650px) {
  .page-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .timer {
    text-align: left;
  }
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .toolbar button {
    margin-left: 0;
  }
}
</style>
