import { describe, expect, it } from "vitest";
import { acceptMemberDungeonQuestCommand } from "../../src/application/commands/accept-member-dungeon-quest";
import { getMemberDungeonQuestsView } from "../../src/application/queries/get-member-dungeon-quests-view";
import { GameSession } from "../../src/application/services/game-session";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();
const questId = asBrandedId<"QuestId">("rfc_returning_lost_satchel");

function state(registry = content) {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("member-dungeon-quests"),
    content: registry,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("member-dungeon-quests"),
  });
}

function contentWithOptionalQuestBoss() {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const dungeonKey = Object.keys(modules).find((path) =>
    path.endsWith("/content/dungeons/ragefire-chasm.json"),
  )!;
  const route = (
    modules[dungeonKey] as {
      dungeons: Array<{
        route: Array<{
          id: string;
          encounterId: string;
          type: string;
          description?: { zhCN: string };
        }>;
      }>;
    }
  ).dungeons[0]!.route;
  const oggleflint = route.find((node) => node.encounterId === "oggleflint")!;
  oggleflint.type = "optional";
  oggleflint.description = { zhCN: "搜索守卫尸体附近的侧路。" };
  return loadContentRegistry(modules);
}

describe("member dungeon quests", () => {
  it("projects objectives, reward choices, and an optional Boss route requirement", () => {
    const registry = contentWithOptionalQuestBoss();
    const game = state(registry);
    const member = Object.values(game.members)[0]!;

    const view = getMemberDungeonQuestsView(game, registry, member.id)!;
    const quest = view.quests.find((entry) => entry.id === questId)!;

    expect(quest).toMatchObject({
      status: "available",
      canAccept: true,
      objective: {
        label: "击败奥格弗林特",
        requiredOptionalNodeIds: ["oggleflint"],
      },
      rewards: {
        itemChoices: [
          { id: "15452", name: "羽珠护腕" },
          { id: "15453", name: "草原狮护腕" },
        ],
      },
    });
  });

  it("accepts once for one eligible member without affecting another", async () => {
    const game = state();
    const [first, second] = Object.values(game.members);
    const saves = new MemorySaveRepository();
    await saves.create(game);
    const session = GameSession.fromState(saves, game);
    const command = acceptMemberDungeonQuestCommand(
      { content, clock: new FakeClock(2_000) },
      first!.id,
      questId,
    );

    const result = await session.execute(command);

    expect(result.status).toBe("committed");
    expect(session.snapshot().members[first!.id]!.quests.entries[questId]).toMatchObject({
      status: "accepted",
      acceptedAt: 2_000,
    });
    expect(session.snapshot().members[second!.id]!.quests.entries[questId]).toBeUndefined();
    await expect(session.execute(command)).rejects.toThrow(/已经接取或完成过/);
  });

  it("projects both unlocked Library book quests with their authentic rewards", () => {
    const game = state();
    game.guild.unlockedDungeonIds.push(asBrandedId<"DungeonId">("scarlet_monastery_library"));
    const member = Object.values(game.members)[0]!;
    member.progression.level = 40;

    const view = getMemberDungeonQuestsView(game, content, member.id)!;
    expect(view.quests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "scarlet_library_compendium_of_the_fallen",
          status: "available",
          rewards: expect.objectContaining({
            itemChoices: [
              expect.objectContaining({ id: "7747", name: "邪恶防护者" }),
              expect.objectContaining({ id: "17508", name: "力石圆盾" }),
              expect.objectContaining({ id: "7749", name: "终结宝珠" }),
            ],
          }),
        }),
        expect.objectContaining({
          id: "scarlet_library_mythology_of_the_titans",
          status: "available",
          rewards: expect.objectContaining({
            itemChoices: [expect.objectContaining({ id: "7746", name: "探险者协会的奖状" })],
          }),
        }),
      ]),
    );
  });

  it("offers both cross-wing Scarlet quests at Library unlock with Loksey route warnings", () => {
    const game = state();
    game.guild.unlockedDungeonIds.push(asBrandedId<"DungeonId">("scarlet_monastery_library"));
    const member = Object.values(game.members)[0]!;
    member.progression.level = 40;

    const view = getMemberDungeonQuestsView(game, content, member.id)!;
    expect(view.quests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "scarlet_crosswing_in_the_name_of_the_light",
          status: "available",
          objective: expect.objectContaining({
            requiredOptionalNodeIds: ["scarlet_library_houndmaster_loksey"],
          }),
          rewards: expect.objectContaining({
            itemChoices: [
              expect.objectContaining({ id: "6829", name: "平静之剑" }),
              expect.objectContaining({ id: "6830", name: "咬骨之斧" }),
              expect.objectContaining({ id: "6831", name: "黑暗威胁" }),
              expect.objectContaining({ id: "11262", name: "洛瑞卡宝珠" }),
            ],
          }),
        }),
        expect.objectContaining({
          id: "scarlet_crosswing_into_the_scarlet_monastery",
          status: "available",
          rewards: expect.objectContaining({
            itemChoices: [
              expect.objectContaining({ id: "6802", name: "预兆之剑" }),
              expect.objectContaining({ id: "6803", name: "预言藤杖" }),
              expect.objectContaining({ id: "10711", name: "龙血项链" }),
            ],
          }),
        }),
      ]),
    );
  });

  it("rejects locked dungeons, insufficient levels, and disallowed classes", () => {
    const locked = state();
    const member = Object.values(locked.members)[0]!;
    locked.guild.unlockedDungeonIds = [];
    expect(() =>
      acceptMemberDungeonQuestCommand(
        { content, clock: new FakeClock(2_000) },
        member.id,
        questId,
      ).execute(locked),
    ).toThrow(/副本尚未解锁/);

    const underleveled = state();
    const lowMember = Object.values(underleveled.members)[0]!;
    lowMember.progression.level = 8;
    expect(() =>
      acceptMemberDungeonQuestCommand(
        { content, clock: new FakeClock(2_000) },
        lowMember.id,
        questId,
      ).execute(underleveled),
    ).toThrow(/需要达到 9 级/);

    const modules = structuredClone(browserContentModules) as Record<string, unknown>;
    const questKey = Object.keys(modules).find((path) =>
      path.endsWith("/content/quests/ragefire-chasm.json"),
    )!;
    const quest = (
      modules[questKey] as {
        quests: Array<{ id: string; eligibility: { allowedClassIds: string[] } }>;
      }
    ).quests.find((entry) => entry.id === questId)!;
    quest.eligibility.allowedClassIds = [member.identity.classId === "mage" ? "warrior" : "mage"];
    const restrictedContent = loadContentRegistry(modules);
    const restricted = state(restrictedContent);
    const restrictedMember = Object.values(restricted.members)[0]!;
    expect(() =>
      acceptMemberDungeonQuestCommand(
        { content: restrictedContent, clock: new FakeClock(2_000) },
        restrictedMember.id,
        questId,
      ).execute(restricted),
    ).toThrow(/职业不能接取/);
  });
});
