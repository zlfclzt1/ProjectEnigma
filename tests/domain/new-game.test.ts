import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { EQUIPMENT_SLOTS } from "../../src/domain/equipment/equipment-slot";
import { createNewGame } from "../../src/domain/guild/new-game";
import { createCandidate, type MemberFactoryContext } from "../../src/domain/member/member-factory";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock, FixedRandomSource, SequentialIdGenerator } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();
const contentVersion = asBrandedId<"ContentVersion">("classic-v1");

function newGame(seed = "new-game-seed") {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("slot_1"),
    content,
    contentVersion,
    clock: new FakeClock(1_000_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource(seed),
  });
}

function memberFactoryContext(values: readonly number[]): MemberFactoryContext {
  return {
    content,
    clock: new FakeClock(2_000_000),
    ids: new SequentialIdGenerator(),
    random: new FixedRandomSource(values),
    usedNames: new Set(),
    claimedHiddenCharacterIds: new Set(),
  };
}

describe("V2 new game factory", () => {
  it("deterministically creates five members and three candidates", () => {
    const first = newGame();
    const replay = newGame();
    const members = Object.values(first.members);
    const roles = members.map((member) => content.specById.get(member.progression.specId)!.role);

    expect(first).toEqual(replay);
    expect(members).toHaveLength(5);
    expect(Object.values(first.candidates)).toHaveLength(3);
    expect(roles.sort()).toEqual(["dps", "dps", "dps", "healer", "tank"]);
    expect(members.every((member) => member.progression.level === 10)).toBe(true);
    expect(
      Object.values(first.candidates).every((candidate) => candidate.progression.level === 10),
    ).toBe(true);
    expect(first.createdAt).toBe(1_000_000);
    expect(first.updatedAt).toBe(1_000_000);
    expect(first.recruitment.nextCandidateAt).toBe(2_800_000);
    expect(first.random.counter).toBeGreaterThan(0);
    expect(first.ids.counter).toBeGreaterThan(0);
  });

  it("equips every initial member with definition-backed starter instances", () => {
    const state = newGame();
    const instances = Object.values(state.itemInstances);

    expect(instances).toHaveLength(EQUIPMENT_SLOTS.length * 5);
    for (const member of Object.values(state.members)) {
      expect(Object.keys(member.equipment)).toHaveLength(EQUIPMENT_SLOTS.length);
      for (const slot of EQUIPMENT_SLOTS) {
        const instance = state.itemInstances[member.equipment[slot]!];
        const definition = content.itemById.get(instance.definitionId)!;
        expect(instance.ownerMemberId).toBe(member.id);
        expect(instance.bound).toBe(true);
        expect(instance.source).toEqual({ type: "starter" });
        expect(definition.isStarter).toBe(true);
        expect(definition.slot).toBe(slot);
      }
    }
  });

  it("uses a strict one-percent hidden-character threshold and claims unique characters once", () => {
    const context = memberFactoryContext([0.009, 0, 0, 0, 0, 0, 0]);
    const hidden = createCandidate(context);
    const normal = createCandidate(context);

    expect(hidden.identity.hiddenCharacterId).toBe("fairbanks");
    expect(hidden.identity.name).toBe("费厄泼赖");
    expect(normal.identity.hiddenCharacterId).toBeUndefined();
    expect(context.claimedHiddenCharacterIds).toEqual(
      new Set([asBrandedId<"HiddenCharacterId">("fairbanks")]),
    );

    const boundary = createCandidate(memberFactoryContext([0.01, 0, 0, 0, 0, 0]));
    expect(boundary.identity.hiddenCharacterId).toBeUndefined();
  });

  it("uses standalone names and selects another entry instead of adding a suffix", () => {
    const context = memberFactoryContext([0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0]);
    const first = createCandidate(context);
    const second = createCandidate(context);

    expect(first.identity.name).toBe("灿仔");
    expect(second.identity.name).toBe("暮雨");
    expect(first.identity.name).not.toContain("·");
    expect(second.identity.name).not.toMatch(/\d+$/);
  });

  it("does not generate a hidden character whose name is already in use", () => {
    const context = memberFactoryContext([0, 0, 0, 0, 0]);
    context.usedNames.add("费厄泼赖");
    const candidate = createCandidate(context);

    expect(candidate.identity.hiddenCharacterId).toBeUndefined();
    expect(candidate.identity.name).toBe("灿仔");
  });

  it("can consume the complete name pool without producing duplicates", () => {
    const rolls = Array.from({ length: 377 }, () => [0.5, 0, 0, 0, 0]).flat();
    const context = memberFactoryContext([...rolls, 0.5, 0, 0]);
    const names = Array.from({ length: 377 }, () => createCandidate(context).identity.name);

    expect(new Set(names).size).toBe(377);
    expect(() => createCandidate(context)).toThrow("zh-CN 随机姓名池已耗尽");
  });

  it("stores content IDs instead of copied static display fields", () => {
    const state = newGame();
    const member = Object.values(state.members)[0] as unknown as Record<string, unknown>;
    const instance = Object.values(state.itemInstances)[0] as unknown as Record<string, unknown>;

    expect(member).not.toHaveProperty("className");
    expect(member).not.toHaveProperty("specName");
    expect(member).not.toHaveProperty("personalityName");
    expect(instance).not.toHaveProperty("name");
    expect(instance).not.toHaveProperty("itemLevel");
    expect(state.contentVersion).toBe("classic-v1");
  });
});
