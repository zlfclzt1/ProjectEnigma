<script setup lang="ts">
import type { RecruitCandidateView } from "../../application/queries/get-recruitment-view";

defineProps<{
  candidate: RecruitCandidateView;
  busy: boolean;
  canRecruit: boolean;
}>();

defineEmits<{ recruit: []; reject: [] }>();
</script>

<template>
  <article class="candidate-card" :data-role="candidate.role">
    <header>
      <div>
        <span v-if="candidate.isHidden" class="rare">稀有访客</span>
        <h3>{{ candidate.name }}</h3>
      </div>
      <span class="role">{{ candidate.roleName }}</span>
    </header>

    <dl class="facts">
      <div>
        <dt>职业</dt>
        <dd>{{ candidate.className }} · {{ candidate.specName }}</dd>
      </div>
      <div>
        <dt>等级</dt>
        <dd>{{ candidate.level }}</dd>
      </div>
      <div>
        <dt>装等</dt>
        <dd>{{ candidate.itemLevel.toFixed(1) }}</dd>
      </div>
    </dl>

    <section class="personality">
      <strong>{{ candidate.personalityName }}</strong>
      <p class="benefit">优点：{{ candidate.personalityBenefit }}</p>
      <p class="drawback">缺点：{{ candidate.personalityDrawback }}</p>
    </section>

    <footer>
      <button class="secondary" type="button" :disabled="busy" @click="$emit('reject')">
        请他离开
      </button>
      <button type="button" :disabled="busy || !canRecruit" @click="$emit('recruit')">
        {{ canRecruit ? "加入公会" : "成员已满" }}
      </button>
    </footer>
  </article>
</template>

<style scoped>
.candidate-card {
  padding: 18px;
  border: 1px solid #39342c;
  border-top: 3px solid #8f6d39;
  border-radius: 9px;
  background: linear-gradient(155deg, #17191a, #101214);
}
.candidate-card[data-role="tank"] {
  border-top-color: #5786ad;
}
.candidate-card[data-role="healer"] {
  border-top-color: #65a56c;
}
.candidate-card[data-role="dps"] {
  border-top-color: #aa5d50;
}
header,
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
h3 {
  margin: 3px 0 0;
  color: #f0dfbf;
  font-family: Georgia, serif;
  font-size: 1.3rem;
}
.rare {
  color: #b87af0;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.role {
  padding: 4px 8px;
  border-radius: 999px;
  color: #d7cbb4;
  background: #292723;
  font-size: 0.76rem;
}
.facts {
  display: grid;
  grid-template-columns: 1.5fr 0.6fr 0.7fr;
  gap: 8px;
  margin: 16px 0;
}
.facts div {
  padding: 9px;
  border-radius: 6px;
  background: #0c0f11;
}
dt {
  color: #837b6e;
  font-size: 0.68rem;
}
dd {
  margin: 4px 0 0;
  color: #ddd0b8;
  font-size: 0.84rem;
}
.personality {
  min-height: 92px;
  padding: 12px;
  border-left: 2px solid #78623c;
  background: #17150f;
}
.personality p {
  margin: 5px 0 0;
  font-size: 0.78rem;
}
.benefit {
  color: #83b987;
}
.drawback {
  color: #bf7b70;
}
footer {
  margin-top: 16px;
}
button {
  padding: 9px 12px;
  border: 1px solid #b48a43;
  border-radius: 6px;
  color: #18140e;
  background: #d8aa57;
  font-weight: 800;
  cursor: pointer;
}
button.secondary {
  border-color: #4c4840;
  color: #b9ae9a;
  background: transparent;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
@media (max-width: 520px) {
  .facts {
    grid-template-columns: 1fr 1fr;
  }
  .facts div:first-child {
    grid-column: 1 / -1;
  }
}
</style>
