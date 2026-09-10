import { createPinia, setActivePinia } from "pinia";
import { isReadonly } from "vue";
import { beforeEach, describe, expect, it } from "vitest";
import type { SaveRepository, SaveResult } from "../../src/application/ports/save-repository";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { GameState } from "../../src/domain/game-state";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import { FakeClock } from "../helpers/runtime-fakes";

class MissingSaveRepository implements SaveRepository {
  async load(): Promise<GameState | null> {
    return null;
  }

  async create(): Promise<void> {}

  async save(_state: GameState, expectedRevision: number): Promise<SaveResult> {
    return { status: "not-found", expectedRevision };
  }
}

describe("game store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  function dependencies(saves: SaveRepository = new MemorySaveRepository()) {
    return {
      saves,
      content: loadBrowserContentRegistry(),
      clock: new FakeClock(1_000),
      slotId: asBrandedId<"SaveSlotId">("store-test"),
      seed: "store-test",
    };
  }

  it("initializes through the client application service and exposes a query snapshot", async () => {
    const store = useGameStore();
    const deps = dependencies();

    await expect(store.initialize(() => loadOrCreateV2Client(deps))).resolves.toBe(true);

    expect(store.status).toBe("ready");
    expect(store.snapshot?.guild.name).toBe("神秘公会");
    expect(isReadonly(store.snapshot)).toBe(true);
    expect(isReadonly(store.snapshot?.guild)).toBe(true);
    expect(store.diagnostics).toMatchObject({
      origin: "created",
      memberCount: 5,
      candidateCount: 3,
    });
  });

  it("runs application commands and refreshes its isolated snapshot after commit", async () => {
    const store = useGameStore();
    const deps = dependencies();
    await store.initialize(() => loadOrCreateV2Client(deps));
    const candidateId = Object.values(store.snapshot!.candidates)[0]!.id;

    const outcome = await store.rejectCandidate(candidateId);

    expect(outcome).toEqual({ ok: true, result: true });
    expect(store.snapshot?.revision).toBe(1);
    expect(store.snapshot?.candidates[candidateId]).toBeUndefined();
    expect(store.diagnostics?.candidateCount).toBe(2);

    const recruitId = Object.values(store.snapshot!.candidates)[0]!.id;
    const recruited = await store.recruitCandidate(recruitId);
    expect(recruited.ok).toBe(true);
    expect(store.snapshot?.revision).toBe(2);
    expect(store.overview).toMatchObject({ memberCount: 6, candidateCount: 1 });
  });

  it("keeps the recruitment clock outside persistence and settles all due offers until full", async () => {
    const store = useGameStore();
    const deps = dependencies();
    await store.initialize(() => loadOrCreateV2Client(deps));
    const initialRevision = store.snapshot!.revision;

    deps.clock.advance(1_000);
    await store.tick();
    expect(store.recruitment?.remainingMilliseconds).toBe(30 * 60 * 1_000 - 1_000);
    expect(store.snapshot?.revision).toBe(initialRevision);

    deps.clock.advance(7 * 30 * 60 * 1_000 - 1_000);
    await store.tick();
    expect(store.recruitment).toMatchObject({
      candidateCount: 10,
      candidateCapacity: 10,
      recruitmentFull: true,
    });
    expect(store.recruitment?.remainingMilliseconds).toBeUndefined();
    expect(store.snapshot?.recruitment.nextCandidateAt).toBeUndefined();
  });

  it("normalizes command failures without adopting partial mutations", async () => {
    const store = useGameStore();
    const deps = dependencies();
    await store.initialize(() => loadOrCreateV2Client(deps));

    const outcome = await store.execute({
      type: "broken-ui-command",
      execute(draft) {
        draft.guild.funds = 0;
        throw new Error("地精拒绝记账");
      },
    });

    expect(outcome).toEqual({
      ok: false,
      error: { kind: "command", commandType: "broken-ui-command", message: "地精拒绝记账" },
    });
    expect(store.snapshot?.guild.funds).toBe(100);
  });

  it("manages idle members through respec and dismissal application commands", async () => {
    const store = useGameStore();
    const deps = dependencies();
    await store.initialize(() => loadOrCreateV2Client(deps));
    await store.execute({
      type: "fund-member-management-test",
      execute(draft) {
        draft.guild.funds = 1_000;
      },
    });
    const member = store.members!.members.find((entry) =>
      store.memberDetail(entry.id)!.availableSpecs.some((spec) => !spec.current),
    )!;
    const detail = store.memberDetail(member.id)!;
    const alternative = detail.availableSpecs.find((spec) => !spec.current)!;

    const changed = await store.respecMember(member.id, alternative.id);
    expect(changed.ok).toBe(true);
    expect(store.memberDetail(member.id)?.availableSpecs.find((spec) => spec.current)?.id).toBe(
      alternative.id,
    );
    expect(store.snapshot?.guild.funds).toBe(700);

    const dismissed = await store.dismissMember(member.id);
    expect(dismissed).toEqual({ ok: true, result: true });
    expect(store.memberDetail(member.id)).toBeNull();
    expect(store.members?.members).toHaveLength(4);
  });

  it("starts parallel expeditions, locks participants, and settles due routes from tick", async () => {
    const store = useGameStore();
    const deps = dependencies();
    await store.initialize(() => loadOrCreateV2Client(deps));
    await store.execute({
      type: "prepare-expedition-store-test",
      execute(draft) {
        for (const member of Object.values(draft.members)) member.progression.level = 45;
      },
    });
    const [first, second] = store.members!.members;
    const dungeonId = asBrandedId<"DungeonId">("ragefire_chasm");

    const firstStart = await store.startExpedition(dungeonId, [first!.id], 1);
    const duplicateStart = await store.startExpedition(dungeonId, [first!.id], 1);
    const secondStart = await store.startExpedition(dungeonId, [second!.id], 1);

    expect(firstStart.ok).toBe(true);
    expect(duplicateStart).toMatchObject({ ok: false, error: { kind: "command" } });
    expect(secondStart.ok).toBe(true);
    expect(store.activities?.active).toHaveLength(2);
    expect(store.dungeonPlanning(dungeonId, [first!.id], 1)?.issues).toContain(
      "队伍中有成员正在参加其他活动。",
    );

    deps.clock.set(24 * 60 * 60 * 1_000);
    await store.tick();

    expect(store.activities?.active).toHaveLength(0);
    expect(store.activities?.history).toHaveLength(2);
    expect(Object.values(store.snapshot!.members).every((member) => !member.activeActivityId)).toBe(
      true,
    );
  });

  it("exposes loot distribution and persistent combat reports through application commands", async () => {
    const store = useGameStore();
    const deps = dependencies();
    await store.initialize(() => loadOrCreateV2Client(deps));
    await store.execute({
      type: "prepare-loot-store-test",
      execute(draft) {
        for (const member of Object.values(draft.members)) member.progression.level = 45;
      },
    });
    const memberIds = store.members!.members.map((member) => member.id);
    await store.startExpedition(asBrandedId<"DungeonId">("ragefire_chasm"), memberIds, 1);
    await store.execute({
      type: "guarantee-loot-store-test",
      execute(draft) {
        const activity = Object.values(draft.activities)[0]!;
        if (activity.type !== "expedition") throw new Error("Expected expedition");
        for (const stage of activity.runPlans[0]!.stages) stage.successRoll = 0;
      },
    });
    deps.clock.set(24 * 60 * 60 * 1_000);
    await store.tick();

    expect(store.loot?.pending).toHaveLength(2);
    expect(store.combatReports?.reports).toHaveLength(4);
    const reportId = store.combatReports!.reports[0]!.id;
    expect(store.combatReport(reportId)?.logs.length).toBeGreaterThan(0);

    const result = await store.autoAssignLoot();
    expect(result.ok).toBe(true);
    expect(store.loot?.pending).toHaveLength(0);
    expect(store.combatReport(reportId)?.id).toBe(reportId);
  });

  it("normalizes save conflicts and missing saves", async () => {
    const saves = new MemorySaveRepository();
    const deps = dependencies(saves);
    const store = useGameStore();
    await store.initialize(() => loadOrCreateV2Client(deps));
    const persisted = await saves.load(deps.slotId);
    if (!persisted || persisted.saveVersion !== 9) throw new Error("Expected current save");
    await saves.save(persisted, 0);

    const conflict = await store.execute({ type: "stale-command", execute() {} });
    expect(conflict.ok).toBe(false);
    expect(store.error).toMatchObject({ kind: "conflict", expectedRevision: 0, actualRevision: 1 });

    setActivePinia(createPinia());
    const missingStore = useGameStore();
    const missingDeps = dependencies(new MissingSaveRepository());
    await missingStore.initialize(() => loadOrCreateV2Client(missingDeps));
    const missing = await missingStore.execute({ type: "lost-command", execute() {} });
    expect(missing.ok).toBe(false);
    expect(missingStore.error).toMatchObject({ kind: "missing-save", expectedRevision: 0 });
  });

  it("reports initialization failures through the same error surface", async () => {
    const store = useGameStore();
    const initialized = await store.initialize(async () => {
      throw new Error("IndexedDB 不可用");
    });

    expect(initialized).toBe(false);
    expect(store.status).toBe("error");
    expect(store.error).toEqual({ kind: "initialization", message: "IndexedDB 不可用" });
  });
});
