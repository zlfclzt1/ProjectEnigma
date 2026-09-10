<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type {
  RosterPresetDirectoryView,
  RosterPresetView,
} from "../../application/queries/get-roster-presets-view";
import type { PartyMemberOptionView } from "../../application/queries/get-dungeons-view";
import type { ClassId, MemberId, RosterPresetId } from "../../domain/shared/ids";

const props = defineProps<{
  open: boolean;
  directory: RosterPresetDirectoryView;
  initialPresetId?: RosterPresetId | null;
  members: readonly PartyMemberOptionView[];
  classOptions: readonly { readonly id: ClassId; readonly name: string }[];
  roleOptions: readonly { readonly id: "tank" | "healer" | "dps"; readonly name: string }[];
  pending: boolean;
}>();

const emit = defineEmits<{
  close: [];
  create: [name: string, memberIds: readonly MemberId[]];
  update: [presetId: RosterPresetId, memberIds: readonly MemberId[]];
  rename: [presetId: RosterPresetId, name: string];
  delete: [presetId: RosterPresetId];
}>();

const selectedPresetId = ref<RosterPresetId | null>(null);
const editingNew = ref(false);
const name = ref("");
const selectedMemberIds = ref<MemberId[]>([]);
const search = ref("");
const classId = ref<ClassId | null>(null);
const role = ref<"tank" | "healer" | "dps" | null>(null);

const selectedPreset = computed(
  () => props.directory.presets.find((preset) => preset.id === selectedPresetId.value) ?? null,
);
const filteredMembers = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase();
  return props.members.filter(
    (member) =>
      (!needle || member.name.toLocaleLowerCase().includes(needle)) &&
      (!classId.value || member.classId === classId.value) &&
      (!role.value || member.role === role.value),
  );
});
const departedMembers = computed(
  () => selectedPreset.value?.members.filter((member) => member.departed) ?? [],
);

function loadPreset(preset: RosterPresetView): void {
  editingNew.value = false;
  selectedPresetId.value = preset.id;
  name.value = preset.name;
  selectedMemberIds.value = [...preset.currentMemberIds];
}

function beginCreate(): void {
  editingNew.value = true;
  selectedPresetId.value = null;
  name.value = props.directory.defaultName;
  selectedMemberIds.value = [];
}

function toggle(memberId: MemberId): void {
  if (selectedMemberIds.value.includes(memberId)) {
    selectedMemberIds.value = selectedMemberIds.value.filter((id) => id !== memberId);
  } else if (selectedMemberIds.value.length < props.directory.maximumMembers) {
    selectedMemberIds.value = [...selectedMemberIds.value, memberId];
  }
}

function selectVisible(): void {
  const next = [...selectedMemberIds.value];
  for (const member of filteredMembers.value) {
    if (next.length >= props.directory.maximumMembers) break;
    if (!next.includes(member.id)) next.push(member.id);
  }
  selectedMemberIds.value = next;
}

function saveMembers(): void {
  if (editingNew.value) emit("create", name.value, selectedMemberIds.value);
  else if (selectedPresetId.value) emit("update", selectedPresetId.value, selectedMemberIds.value);
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const initial =
      props.directory.presets.find((preset) => preset.id === props.initialPresetId) ??
      props.directory.presets[0];
    if (initial) loadPreset(initial);
    else beginCreate();
  },
  { immediate: true },
);

watch(
  () => props.directory.presets,
  (presets) => {
    if (!props.open) return;
    const current = presets.find((preset) => preset.id === selectedPresetId.value);
    if (current && !editingNew.value) loadPreset(current);
    else if (!editingNew.value && presets[0]) loadPreset(presets[0]);
  },
);
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <section
      class="modal roster-manager"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-manager-title"
    >
      <header>
        <div>
          <p class="kicker">阵容档案</p>
          <h3 id="roster-manager-title">管理固定队伍</h3>
        </div>
        <button type="button" class="quiet" @click="emit('close')">关闭</button>
      </header>

      <div class="manager-grid">
        <aside class="preset-list">
          <button
            v-for="preset in directory.presets"
            :key="preset.id"
            type="button"
            :class="{ selected: !editingNew && preset.id === selectedPresetId }"
            @click="loadPreset(preset)"
          >
            <strong>{{ preset.name }}</strong>
            <small
              >{{ preset.members.length }} 人<span v-if="preset.departedCount">
                · {{ preset.departedCount }} 人离队</span
              ></small
            >
          </button>
          <button
            type="button"
            class="new-preset"
            :disabled="directory.presets.length >= directory.maximumPresets"
            @click="beginCreate"
          >
            ＋ 新建固定队伍
          </button>
          <small class="capacity"
            >{{ directory.presets.length }} / {{ directory.maximumPresets }} 支</small
          >
        </aside>

        <main class="editor">
          <div class="name-row">
            <label>
              <span>队伍名称</span>
              <input v-model="name" maxlength="30" />
            </label>
            <button
              v-if="!editingNew && selectedPresetId"
              type="button"
              class="quiet"
              :disabled="pending || !name.trim() || name === selectedPreset?.name"
              @click="emit('rename', selectedPresetId, name)"
            >
              重命名
            </button>
            <button
              v-if="!editingNew && selectedPresetId"
              type="button"
              class="danger"
              :disabled="pending"
              @click="emit('delete', selectedPresetId)"
            >
              删除
            </button>
          </div>

          <div class="filters">
            <input v-model="search" aria-label="搜索成员" placeholder="搜索成员姓名" />
            <select v-model="classId" aria-label="按职业筛选">
              <option :value="null">全部职业</option>
              <option v-for="option in classOptions" :key="option.id" :value="option.id">
                {{ option.name }}
              </option>
            </select>
            <select v-model="role" aria-label="按职责筛选">
              <option :value="null">全部职责</option>
              <option v-for="option in roleOptions" :key="option.id" :value="option.id">
                {{ option.name }}
              </option>
            </select>
          </div>

          <div class="selection-tools">
            <strong>{{ selectedMemberIds.length }} / {{ directory.maximumMembers }} 人</strong>
            <span>
              <button type="button" class="quiet compact" @click="selectVisible">
                选择当前筛选
              </button>
              <button type="button" class="quiet compact" @click="selectedMemberIds = []">
                清空
              </button>
            </span>
          </div>

          <div class="member-grid">
            <label
              v-for="member in filteredMembers"
              :key="member.id"
              :class="{ selected: selectedMemberIds.includes(member.id) }"
            >
              <input
                type="checkbox"
                :checked="selectedMemberIds.includes(member.id)"
                :disabled="
                  !selectedMemberIds.includes(member.id) &&
                  selectedMemberIds.length >= directory.maximumMembers
                "
                @change="toggle(member.id)"
              />
              <span class="member-copy"
                ><strong>{{ member.name }}</strong
                ><small
                  >{{ member.className }} · {{ member.roleName }} · LV {{ member.level }}</small
                ></span
              >
              <em v-if="member.active">活动中</em>
            </label>
          </div>
          <p v-if="filteredMembers.length === 0" class="empty">没有符合筛选条件的成员。</p>

          <div v-if="departedMembers.length" class="departed">
            <strong>已离队成员</strong>
            <p>这些姓名快照仍保留在预设中；保存成员组合后将从该预设移除。</p>
            <span v-for="member in departedMembers" :key="member.id">{{ member.nameAtSave }}</span>
          </div>

          <footer>
            <small v-if="editingNew">新建后会保存当前勾选的成员。</small>
            <small v-else>“保存成员组合”会以当前勾选结果覆盖原组合。</small>
            <button
              type="button"
              :disabled="pending || !name.trim() || selectedMemberIds.length === 0"
              @click="saveMembers"
            >
              {{ pending ? "保存中……" : editingNew ? "创建固定队伍" : "保存成员组合" }}
            </button>
          </footer>
        </main>
      </div>
    </section>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  z-index: 50;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgb(0 0 0 / 76%);
}
.modal {
  width: min(1120px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  border: 1px solid #5c503d;
  border-radius: 10px;
  background: #111416;
  box-shadow: 0 24px 70px #000;
}
header {
  position: sticky;
  z-index: 2;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #37332c;
  background: #111416;
}
h3,
p {
  margin: 0;
}
h3 {
  color: #e0cda7;
  font-size: 1.25rem;
}
.kicker {
  color: #9b7438;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.15em;
}
.manager-grid {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  min-height: 600px;
}
.preset-list {
  display: grid;
  align-content: start;
  gap: 7px;
  padding: 14px;
  border-right: 1px solid #37332c;
  background: #0d1011;
}
.preset-list > button {
  display: grid;
  gap: 3px;
  padding: 10px;
  border: 1px solid #302e29;
  border-radius: 6px;
  color: #cfc1a8;
  background: #151718;
  text-align: left;
  cursor: pointer;
}
.preset-list > button.selected {
  border-color: #a27c3c;
  background: #211d16;
}
.preset-list small {
  color: #81796c;
}
.preset-list .new-preset {
  color: #d8b25a;
  border-style: dashed;
}
.capacity {
  padding: 4px;
  text-align: center;
}
.editor {
  min-width: 0;
  padding: 16px;
}
.name-row {
  display: flex;
  align-items: end;
  gap: 8px;
}
.name-row label {
  flex: 1;
  display: grid;
  gap: 5px;
  color: #9e9381;
  font-size: 0.68rem;
}
input,
select {
  padding: 9px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  color: #e5d9c2;
  background: #090c0e;
}
.filters {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 150px 150px;
  gap: 8px;
  margin-top: 14px;
}
.selection-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 8px;
  color: #d8b25a;
}
.selection-tools span {
  display: flex;
  gap: 6px;
}
.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px;
  max-height: 390px;
  overflow: auto;
  padding-right: 3px;
}
.member-grid label {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 9px;
  border: 1px solid #302e29;
  border-radius: 6px;
  background: #0b0e10;
  cursor: pointer;
}
.member-grid label.selected {
  border-color: #a27c3c;
  background: #211d16;
}
.member-copy {
  display: grid;
  min-width: 0;
}
.member-copy strong {
  overflow: hidden;
  color: #ded1b8;
  font-size: 0.74rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.member-copy small {
  color: #7f776b;
  font-size: 0.58rem;
}
em {
  position: absolute;
  top: 3px;
  right: 5px;
  color: #72a7d0;
  font-size: 0.52rem;
  font-style: normal;
}
.departed {
  margin-top: 13px;
  padding: 11px;
  border: 1px solid #644238;
  border-radius: 6px;
  background: #1e1513;
}
.departed > strong {
  color: #d6a28f;
}
.departed p {
  margin: 3px 0 8px;
  color: #997d73;
  font-size: 0.65rem;
}
.departed span {
  display: inline-block;
  margin: 2px 5px 2px 0;
  padding: 4px 7px;
  border-radius: 4px;
  color: #c69786;
  background: #321e19;
  font-size: 0.64rem;
}
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 15px;
  color: #81796c;
}
button {
  padding: 8px 11px;
  border: 1px solid #9b793f;
  border-radius: 6px;
  color: #1b160f;
  background: #c99b4d;
  font-weight: 800;
  cursor: pointer;
}
button.quiet {
  color: #cdbb98;
  background: #1b1b18;
  border-color: #514a3d;
}
button.compact {
  padding: 5px 8px;
  font-size: 0.62rem;
}
button.danger {
  color: #e1a694;
  background: #271612;
  border-color: #713d31;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.empty {
  padding: 24px;
  color: #81796c;
  text-align: center;
}
@media (max-width: 760px) {
  .manager-grid {
    grid-template-columns: 1fr;
  }
  .preset-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-right: 0;
    border-bottom: 1px solid #37332c;
  }
  .filters {
    grid-template-columns: 1fr;
  }
  .member-grid {
    max-height: 330px;
  }
  footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
