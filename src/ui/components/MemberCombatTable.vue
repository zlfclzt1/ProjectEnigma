<script setup lang="ts">
import type { MemberCombatRowView } from "../../application/queries/get-combat-reports-view";

defineProps<{ members: readonly MemberCombatRowView[] }>();
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>成员</th>
          <th>定位</th>
          <th>伤害</th>
          <th>治疗</th>
          <th>承伤</th>
          <th>贡献</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="member in members" :key="member.memberId" :class="{ defeated: member.defeated }">
          <th>{{ member.name }} <small v-if="member.defeated">倒地</small></th>
          <td>{{ member.roleName }}</td>
          <td>{{ member.damage.toLocaleString() }}</td>
          <td>{{ member.healing.toLocaleString() }}</td>
          <td>{{ member.damageTaken.toLocaleString() }}</td>
          <td>{{ member.contributionScore.toFixed(2) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.72rem;
}
th,
td {
  padding: 8px 9px;
  border-bottom: 1px solid #2c2a26;
  color: #aaa08f;
  text-align: right;
}
th:first-child {
  color: #d9cbb2;
  text-align: left;
}
thead th {
  color: #7f776b;
  font-size: 0.62rem;
}
tr.defeated {
  opacity: 0.58;
}
small {
  color: #cb7065;
}
</style>
