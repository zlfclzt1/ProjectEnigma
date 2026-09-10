import { ref } from "vue";
import { defineStore } from "pinia";
import type { ClassId, DungeonId, MemberId } from "../domain/shared/ids";
import type { MemberSortKey } from "../ui/member-list-sorting";

export type RoleFilter = "tank" | "healer" | "dps" | null;

export interface MemberFilters {
  readonly classId: ClassId | null;
  readonly role: RoleFilter;
  readonly sortBy: MemberSortKey;
}

export interface UiModal {
  readonly name: string;
  readonly entityId?: string;
}

const EMPTY_FILTERS: MemberFilters = { classId: null, role: null, sortBy: "default" };

export const useUiStore = defineStore("ui", () => {
  const memberFilters = ref<MemberFilters>({ ...EMPTY_FILTERS });
  const partyFilters = ref<MemberFilters>({ ...EMPTY_FILTERS });
  const selectedDungeonId = ref<DungeonId | null>(null);
  const selectedPartyMemberIds = ref<MemberId[]>([]);
  const requestedExpeditionRuns = ref(1);
  const selectedMemberId = ref<MemberId | null>(null);
  const activeModal = ref<UiModal | null>(null);
  const activeTabs = ref<Record<string, string>>({});

  function setMemberFilters(filters: Partial<MemberFilters>): void {
    memberFilters.value = { ...memberFilters.value, ...filters };
  }

  function setPartyFilters(filters: Partial<MemberFilters>): void {
    partyFilters.value = { ...partyFilters.value, ...filters };
  }

  function selectDungeon(dungeonId: DungeonId | null): void {
    selectedDungeonId.value = dungeonId;
  }

  function togglePartyMember(memberId: MemberId): void {
    selectedPartyMemberIds.value = selectedPartyMemberIds.value.includes(memberId)
      ? selectedPartyMemberIds.value.filter((id) => id !== memberId)
      : [...selectedPartyMemberIds.value, memberId];
  }

  function clearParty(): void {
    selectedPartyMemberIds.value = [];
  }

  function setRequestedExpeditionRuns(runs: number): void {
    requestedExpeditionRuns.value = runs;
  }

  function selectMember(memberId: MemberId | null): void {
    selectedMemberId.value = memberId;
  }

  function openModal(modal: UiModal): void {
    activeModal.value = modal;
  }

  function closeModal(): void {
    activeModal.value = null;
  }

  function setActiveTab(scope: string, tab: string): void {
    activeTabs.value = { ...activeTabs.value, [scope]: tab };
  }

  function resetFilters(): void {
    memberFilters.value = { ...EMPTY_FILTERS };
    partyFilters.value = { ...EMPTY_FILTERS };
  }

  return {
    memberFilters,
    partyFilters,
    selectedDungeonId,
    selectedPartyMemberIds,
    requestedExpeditionRuns,
    selectedMemberId,
    activeModal,
    activeTabs,
    setMemberFilters,
    setPartyFilters,
    selectDungeon,
    togglePartyMember,
    clearParty,
    setRequestedExpeditionRuns,
    selectMember,
    openModal,
    closeModal,
    setActiveTab,
    resetFilters,
  };
});
