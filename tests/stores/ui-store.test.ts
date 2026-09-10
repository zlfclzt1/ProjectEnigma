import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { useUiStore } from "../../src/stores/ui-store";

describe("UI store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("keeps navigation selections, filters, modals, and tabs outside the game save", () => {
    const store = useUiStore();
    const dungeonId = asBrandedId<"DungeonId">("deadmines");
    const memberId = asBrandedId<"MemberId">("member_7");
    const classId = asBrandedId<"ClassId">("warrior");

    store.selectDungeon(dungeonId);
    store.togglePartyMember(memberId);
    store.setRequestedExpeditionRuns(3);
    store.selectMember(memberId);
    store.setMemberFilters({ classId, role: "tank", sortBy: "level" });
    store.setPartyFilters({ role: "healer", sortBy: "itemLevel" });
    store.openModal({ name: "member-management", entityId: memberId });
    store.setActiveTab("member-detail", "equipment");

    expect(store.selectedDungeonId).toBe(dungeonId);
    expect(store.selectedPartyMemberIds).toEqual([memberId]);
    expect(store.requestedExpeditionRuns).toBe(3);
    expect(store.selectedMemberId).toBe(memberId);
    expect(store.memberFilters).toEqual({ classId, role: "tank", sortBy: "level" });
    expect(store.partyFilters).toEqual({
      classId: null,
      role: "healer",
      sortBy: "itemLevel",
    });
    expect(store.activeModal).toEqual({ name: "member-management", entityId: memberId });
    expect(store.activeTabs["member-detail"]).toBe("equipment");

    store.closeModal();
    store.clearParty();
    store.resetFilters();
    expect(store.activeModal).toBeNull();
    expect(store.selectedPartyMemberIds).toEqual([]);
    expect(store.memberFilters).toEqual({ classId: null, role: null, sortBy: "default" });
    expect(store.partyFilters).toEqual({ classId: null, role: null, sortBy: "default" });
  });
});
