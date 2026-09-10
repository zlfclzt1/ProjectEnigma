import { describe, expect, it } from "vitest";
import {
  createRosterPresetCommand,
  deleteRosterPresetCommand,
  renameRosterPresetCommand,
  updateRosterPresetCommand,
} from "../../src/application/commands/manage-roster-presets";
import { GameSession } from "../../src/application/services/game-session";
import { getRosterPresetsView } from "../../src/application/queries/get-roster-presets-view";
import { dismissMemberCommand } from "../../src/application/commands/dismiss-member";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { createNewGame } from "../../src/domain/guild/new-game";
import type { GameState } from "../../src/domain/game-state";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

function stateWithMembers(total: number): GameState {
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">("roster-presets"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("roster-presets"),
  });
  const originals = Object.values(state.members);
  for (let index = originals.length; index < total; index += 1) {
    const source = originals[index % originals.length]!;
    const id = asBrandedId<"MemberId">(`roster_member_${index + 1}`);
    state.members[id] = {
      ...structuredClone(source),
      id,
      identity: { ...structuredClone(source.identity), name: `固定队员 ${index + 1}` },
      equipment: {},
      activeActivityId: undefined,
    };
  }
  return state;
}

async function sessionFor(state: GameState) {
  const saves = new MemorySaveRepository();
  await saves.create(state);
  return GameSession.fromState(saves, state);
}

describe("roster preset commands", () => {
  it("creates, renames, updates, and deletes a persisted 40-member preset", async () => {
    const state = stateWithMembers(40);
    const session = await sessionFor(state);
    const allIds = Object.keys(state.members) as (keyof GameState["members"])[];

    const created = await session.execute(
      createRosterPresetCommand(new FakeClock(2_000), " 四十人开荒团 ", allIds),
    );
    if (created.status !== "committed") throw new Error("Expected committed preset creation");
    expect(created.result.name).toBe("四十人开荒团");
    expect(created.result.members).toHaveLength(40);
    expect(session.snapshot().rosterPresets.presets[created.result.id]).toEqual(created.result);

    const renamed = await session.execute(
      renameRosterPresetCommand(new FakeClock(3_000), created.result.id, "熔火核心团"),
    );
    if (renamed.status !== "committed") throw new Error("Expected committed preset rename");
    expect(renamed.result).toMatchObject({ name: "熔火核心团", updatedAt: 3_000 });

    const updated = await session.execute(
      updateRosterPresetCommand(new FakeClock(4_000), created.result.id, allIds.slice(0, 5)),
    );
    if (updated.status !== "committed") throw new Error("Expected committed preset update");
    expect(updated.result.members).toHaveLength(5);
    expect(updated.result.members[0]!.nameAtSave).toBe(
      session.snapshot().members[updated.result.members[0]!.memberId]!.identity.name,
    );

    const deleted = await session.execute(deleteRosterPresetCommand(created.result.id));
    if (deleted.status !== "committed") throw new Error("Expected committed preset deletion");
    expect(deleted.result).toBe(true);
    expect(session.snapshot().rosterPresets.presets).toEqual({});
  });

  it("enforces unique names, a ten-preset limit, and a 40-member limit", async () => {
    const state = stateWithMembers(41);
    const session = await sessionFor(state);
    const memberIds = Object.keys(state.members) as (keyof GameState["members"])[];

    await expect(
      session.execute(createRosterPresetCommand(new FakeClock(2_000), "超员团", memberIds)),
    ).rejects.toThrow(/最多保存 40 名/);
    await session.execute(
      createRosterPresetCommand(new FakeClock(2_000), "固定队伍 1", memberIds.slice(0, 1)),
    );
    await expect(
      session.execute(
        createRosterPresetCommand(new FakeClock(2_001), "固定队伍 1", memberIds.slice(0, 1)),
      ),
    ).rejects.toThrow(/名称不能重复/);
    for (let index = 2; index <= 10; index += 1) {
      await session.execute(
        createRosterPresetCommand(
          new FakeClock(2_000 + index),
          `固定队伍 ${index}`,
          memberIds.slice(0, 1),
        ),
      );
    }
    await expect(
      session.execute(
        createRosterPresetCommand(new FakeClock(3_000), "第十一队", memberIds.slice(0, 1)),
      ),
    ).rejects.toThrow(/最多只能保存 10 支/);
  });

  it("keeps a departed member name snapshot until the preset is updated", async () => {
    const state = stateWithMembers(5);
    for (const member of Object.values(state.members)) member.activeActivityId = undefined;
    const session = await sessionFor(state);
    const member = Object.values(state.members)[0]!;
    const created = await session.execute(
      createRosterPresetCommand(new FakeClock(2_000), "老朋友", [member.id]),
    );
    if (created.status !== "committed") throw new Error("Expected committed preset creation");

    await session.execute(dismissMemberCommand(member.id));
    const view = getRosterPresetsView(session.snapshot(), content).presets[0]!;

    expect(view.departedCount).toBe(1);
    expect(view.currentMemberIds).toEqual([]);
    expect(view.members[0]).toMatchObject({ nameAtSave: member.identity.name, departed: true });
  });
});
