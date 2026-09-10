<script setup lang="ts">
import type { GuildUpgradeView } from "../../application/queries/get-guild-upgrade-view";

defineProps<{
  view: GuildUpgradeView;
  busy: boolean;
}>();

defineEmits<{
  close: [];
  purchase: [];
}>();
</script>

<template>
  <div class="upgrade-backdrop" @click.self="$emit('close')">
    <section
      class="upgrade-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guild-upgrade-title"
    >
      <header>
        <div>
          <p class="kicker">公会事务</p>
          <h3 id="guild-upgrade-title">成员容量扩建</h3>
        </div>
        <button
          class="close-button"
          type="button"
          aria-label="关闭扩建面板"
          @click="$emit('close')"
        >
          ×
        </button>
      </header>

      <div class="capacity-line">
        <span>当前名册</span>
        <strong>{{ view.memberCount }} / {{ view.memberCapacity }}</strong>
      </div>

      <div v-if="view.nextUpgrade" class="upgrade-offer">
        <div class="offer-heading">
          <div>
            <p>下一项扩建</p>
            <h4>{{ view.nextUpgrade.name }}</h4>
          </div>
          <strong
            >{{ view.memberCapacity }} → {{ view.nextUpgrade.targetMemberCapacity }} 人</strong
          >
        </div>

        <p class="description">{{ view.nextUpgrade.description }}</p>

        <dl class="requirements">
          <div v-for="requirement in view.nextUpgrade.requirements" :key="requirement.dungeonId">
            <dt>{{ requirement.label }}</dt>
            <dd :class="{ met: requirement.met }">
              {{ requirement.current }} / {{ requirement.target }}
            </dd>
          </div>
          <div>
            <dt>扩建费用</dt>
            <dd :class="{ met: view.nextUpgrade.fundsAvailable }">{{ view.nextUpgrade.cost }} G</dd>
          </div>
        </dl>

        <p v-if="view.nextUpgrade.blockedReasons.length" class="blocked-reasons">
          尚需：{{ view.nextUpgrade.blockedReasons.join("；") }}
        </p>
        <p v-else class="ready-message">手续齐全。地精施工队已经在门外量窗户了。</p>

        <button
          class="purchase-button"
          type="button"
          :disabled="busy || !view.nextUpgrade.canPurchase"
          @click="$emit('purchase')"
        >
          {{ busy ? "正在签字……" : `确认扩建 · ${view.nextUpgrade.cost} G` }}
        </button>
      </div>

      <div v-else class="maximum-state">
        <strong>当前版本已达最大容量：{{ view.memberCapacity }} 人</strong>
        <p>公会大厅暂时没有更多墙可以拆。未来开放新副本时会追加扩建项目。</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.upgrade-backdrop {
  position: fixed;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #050607d9;
  backdrop-filter: blur(3px);
}
.upgrade-panel {
  width: min(540px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 22px;
  border: 1px solid #80622f;
  border-radius: 10px;
  background: linear-gradient(145deg, #1b1a17, #0e1113 70%);
  box-shadow: 0 24px 80px #000c;
}
header,
.offer-heading,
.capacity-line,
.requirements div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
h3,
h4,
p {
  margin: 0;
}
h3 {
  margin-top: 3px;
  color: #f0dfbf;
  font-family: Georgia, serif;
  font-size: 1.55rem;
}
.kicker,
.offer-heading p {
  color: #9b7438;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}
.close-button {
  display: grid;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid #474138;
  border-radius: 50%;
  color: #bdb19e;
  background: #111416;
  font-size: 1.35rem;
  cursor: pointer;
}
.capacity-line {
  padding: 16px 0;
  margin: 18px 0;
  border-top: 1px solid #343129;
  border-bottom: 1px solid #343129;
  color: #9f9481;
}
.capacity-line strong,
.offer-heading > strong {
  color: #f2cc72;
}
.offer-heading h4 {
  margin-top: 4px;
  color: #e8d8b9;
  font-size: 1.15rem;
}
.description {
  margin-top: 10px;
  color: #a99e8b;
  line-height: 1.55;
}
.requirements {
  display: grid;
  gap: 8px;
  margin: 18px 0 0;
}
.requirements div {
  padding: 10px 12px;
  border: 1px solid #302e29;
  border-radius: 6px;
  background: #101315;
}
.requirements dt {
  color: #b4a995;
}
.requirements dd {
  margin: 0;
  color: #c9877e;
  font-weight: 800;
}
.requirements dd.met {
  color: #86b77a;
}
.blocked-reasons,
.ready-message,
.maximum-state {
  margin-top: 14px;
  padding: 12px;
  border-radius: 6px;
  font-size: 0.82rem;
  line-height: 1.5;
}
.blocked-reasons {
  color: #caa184;
  background: #251b15;
}
.ready-message {
  color: #a9c89e;
  background: #152016;
}
.purchase-button {
  width: 100%;
  margin-top: 16px;
  padding: 11px 14px;
  border: 1px solid #b48a43;
  border-radius: 6px;
  color: #18140e;
  background: #d8aa57;
  font-weight: 800;
  cursor: pointer;
}
.purchase-button:disabled {
  cursor: not-allowed;
  filter: grayscale(0.5);
  opacity: 0.45;
}
.maximum-state {
  color: #a99e8b;
  text-align: center;
  background: #111416;
}
.maximum-state strong {
  color: #f0dfbf;
}
.maximum-state p {
  margin-top: 7px;
}
</style>
