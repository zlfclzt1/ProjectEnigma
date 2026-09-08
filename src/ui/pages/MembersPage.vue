<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useGameStore } from "../../stores/game-store";
import { useUiStore } from "../../stores/ui-store";
import MemberFilterBar from "../components/MemberFilterBar.vue";

const game = useGameStore();
const ui = useUiStore();
const filteredMembers = computed(() =>
  (game.members?.members ?? []).filter(
    (member) =>
      (!ui.memberFilters.classId || member.classId === ui.memberFilters.classId) &&
      (!ui.memberFilters.role || member.role === ui.memberFilters.role),
  ),
);
</script>

<template>
  <section v-if="game.members" class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">公会名册</p>
        <h2>公会成员</h2>
      </div>
      <span>{{ filteredMembers.length }} / {{ game.members.members.length }} 人</span>
    </header>

    <MemberFilterBar
      :class-id="ui.memberFilters.classId"
      :role="ui.memberFilters.role"
      :class-options="game.members.classOptions"
      :role-options="game.members.roleOptions"
      @update:class-id="ui.setMemberFilters({ classId: $event })"
      @update:role="ui.setMemberFilters({ role: $event })"
    />

    <div class="member-grid">
      <RouterLink
        v-for="member in filteredMembers"
        :key="member.id"
        class="member-card"
        :data-role="member.role"
        :to="`/members/${member.id}`"
        @click="ui.selectMember(member.id)"
      >
        <div class="avatar">{{ member.name.slice(0, 1) }}</div>
        <div class="member-copy">
          <strong>{{ member.name }}</strong>
          <span>{{ member.className }} · {{ member.specName }} · {{ member.roleName }}</span>
          <small>{{ member.personalityName }} · 装等 {{ member.itemLevel.toFixed(1) }}</small>
        </div>
        <div class="level"><span>LV</span>{{ member.level }}</div>
        <i v-if="member.active">活动中</i>
      </RouterLink>
    </div>
    <p v-if="filteredMembers.length === 0" class="empty">没有符合这组职业与定位条件的成员。</p>
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
}
.page-heading h2 {
  margin: 3px 0 0;
  color: #f0dfbf;
  font-family: Georgia, serif;
  font-size: 2rem;
}
.page-heading > span {
  color: #998e7a;
}
.kicker {
  margin: 0;
  color: #9b7438;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 10px;
}
.member-card {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid #38342c;
  border-left: 3px solid #aa5d50;
  border-radius: 8px;
  color: inherit;
  background: #121518;
  text-decoration: none;
}
.member-card[data-role="tank"] {
  border-left-color: #5786ad;
}
.member-card[data-role="healer"] {
  border-left-color: #65a56c;
}
.member-card:hover {
  border-color: #9c7940;
  transform: translateY(-1px);
}
.avatar {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid #745d35;
  border-radius: 50%;
  color: #e2c681;
  background: #242017;
  font-family: Georgia, serif;
  font-size: 1.3rem;
}
.member-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.member-copy strong {
  overflow: hidden;
  color: #e8d9bd;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.member-copy span {
  color: #aaa08e;
  font-size: 0.75rem;
}
.member-copy small {
  color: #776f63;
}
.level {
  color: #e9c66e;
  font-size: 1.25rem;
  font-weight: 850;
  text-align: center;
}
.level span {
  display: block;
  color: #766d5f;
  font-size: 0.55rem;
}
.member-card i {
  position: absolute;
  top: 5px;
  right: 6px;
  color: #78a9d1;
  font-size: 0.58rem;
  font-style: normal;
}
.empty {
  padding: 28px;
  border: 1px dashed #39352e;
  color: #908675;
  text-align: center;
}
</style>
