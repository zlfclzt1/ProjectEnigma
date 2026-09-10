import { describe, expect, it } from "vitest";
import { startExpeditionCommand } from "../../src/application/commands/start-expedition";
import { getPartyPreview } from "../../src/application/queries/get-party-preview";
import { GameSession } from "../../src/application/services/game-session";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { ContentRegistry } from "../../src/content/registry";
import type { ItemDefinition } from "../../src/content/schemas/item";
import type { DungeonDefinition } from "../../src/content/schemas/dungeon";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();
const dungeonId = asBrandedId<"DungeonId">("ragefire_chasm");

function contentWithItem(definition: ItemDefinition): ContentRegistry {
  return {
    ...content,
    itemById: new Map([...content.itemById, [definition.id, definition]]),
  } as unknown as ContentRegistry;
}

function contentWithOptionalBazzalan(): ContentRegistry {
  const dungeon = content.dungeonById.get(dungeonId)!;
  const definition: DungeonDefinition = {
    ...dungeon,
    route: dungeon.route.map((node) =>
      node.encounterId === "bazzalan"
        ? {
            id: asBrandedId<"DungeonRouteNodeId">("optional_bazzalan"),
            type: "optional" as const,
            encounterId: node.encounterId,
            description: { zhCN: "绕路挑战巴扎兰。" },
          }
        : node,
    ),
  };
  return {
    ...content,
    dungeons: content.dungeons.map((entry) => (entry.id === dungeonId ? definition : entry)),
    dungeonById: new Map([...content.dungeonById, [dungeonId, definition]]),
  } as unknown as ContentRegistry;
}

function contentWithCrossDungeonQuest(): ContentRegistry {
  const questId = asBrandedId<"QuestId">("rfc_returning_lost_satchel");
  const original = content.questById.get(questId)!;
  const quest = {
    ...original,
    completion: {
      type: "encounter-victories" as const,
      encounterIds: [
        asBrandedId<"EncounterId">("oggleflint"),
        asBrandedId<"EncounterId">("dm_rhahkzor"),
      ],
    },
  };
  return {
    ...content,
    quests: content.quests.map((entry) => (entry.id === questId ? quest : entry)),
    questById: new Map([...content.questById, [questId, quest]]),
  } as unknown as ContentRegistry;
}

function newState(seed = "expedition-test") {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("slot_1"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource(seed),
  });
}

async function sessionFor(state = newState()) {
  const saves = new MemorySaveRepository();
  await saves.create(state);
  return { saves, session: GameSession.fromState(saves, state) };
}

describe("V2 expedition creation", () => {
  it("selects only valid optional encounters and freezes one route for every run", async () => {
    const optionalContent = contentWithOptionalBazzalan();
    const state = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("optional-route"),
      content: optionalContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("optional-route"),
    });
    const participantIds = Object.values(state.members).map((member) => member.id);
    const request = {
      dungeonId,
      participantIds,
      requestedRuns: 3,
      selectedOptionalNodeIds: [asBrandedId<"DungeonRouteNodeId">("optional_bazzalan")],
    };
    const activity = await startExpeditionCommand(
      { content: optionalContent, clock: new FakeClock(2_000) },
      request,
    ).execute(state);

    expect(activity.selectedOptionalNodeIds).toEqual(["optional_bazzalan"]);
    expect(activity.runPlans).toHaveLength(3);
    expect(
      activity.runPlans.every(
        (run) => run.stages.map((stage) => stage.encounterId).at(-1) === "bazzalan",
      ),
    ).toBe(true);

    const secondState = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("optional-route-empty"),
      content: optionalContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("optional-route-empty"),
    });
    const withoutOptional = await startExpeditionCommand(
      { content: optionalContent, clock: new FakeClock(3_000) },
      { dungeonId, participantIds, requestedRuns: 1 },
    ).execute(secondState);
    expect(withoutOptional.runPlans[0]!.stages.map((stage) => stage.encounterId)).not.toContain(
      "bazzalan",
    );
  });

  it("rejects unknown, duplicate, and required route selections", async () => {
    const optionalContent = contentWithOptionalBazzalan();
    const state = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("invalid-optional-route"),
      content: optionalContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("invalid-optional-route"),
    });
    const participantIds = Object.values(state.members).map((member) => member.id);
    const { session } = await sessionFor(state);
    await expect(
      session.execute(
        startExpeditionCommand(
          { content: optionalContent, clock: new FakeClock(2_000) },
          {
            dungeonId,
            participantIds,
            requestedRuns: 1,
            selectedOptionalNodeIds: [
              asBrandedId<"DungeonRouteNodeId">("optional_bazzalan"),
              asBrandedId<"DungeonRouteNodeId">("optional_bazzalan"),
              asBrandedId<"DungeonRouteNodeId">("oggleflint"),
              asBrandedId<"DungeonRouteNodeId">("missing_optional"),
            ],
          },
        ),
      ),
    ).rejects.toMatchObject({
      name: "StartExpeditionError",
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "route.optional-duplicate" }),
        expect.objectContaining({ code: "route.not-optional" }),
        expect.objectContaining({ code: "route.optional-not-found" }),
      ]),
    });
  });
  it("uses the same exact evaluation for preview and the frozen activity plan", async () => {
    const state = newState();
    const memberIds = Object.values(state.members).map((member) => member.id);
    const preview = getPartyPreview(state, content, dungeonId, memberIds);
    expect(preview.ok).toBe(true);
    if (!preview.ok) throw new Error("Expected preview");
    const { session } = await sessionFor(state);

    const result = await session.execute(
      startExpeditionCommand(
        { content, clock: new FakeClock(5_000) },
        { dungeonId, participantIds: memberIds, requestedRuns: 3 },
      ),
    );

    expect(result.status).toBe("committed");
    if (result.status !== "committed") throw new Error("Expected committed expedition");
    const activity = result.result;
    expect(activity.partySnapshot.contribution).toEqual(preview.preview.contribution);
    expect(activity.partySnapshot.formulaVersion).toBe("classic-light-v1");
    expect(activity.partySnapshot.clearProbability).toBe(preview.preview.clearProbability);
    expect(activity.partySnapshot.durationSeconds).toBe(preview.preview.durationSeconds);
    expect(activity.partySnapshot.capabilities).toEqual(preview.preview.capabilities);
    expect(activity.runPlans).toHaveLength(3);
    for (const run of activity.runPlans) {
      expect(
        run.stages.map(({ encounterId, probability, durationSeconds }) => ({
          encounterId,
          probability,
          durationSeconds,
        })),
      ).toEqual(
        preview.preview.encounters.map(({ encounterId, probability, durationSeconds }) => ({
          encounterId,
          probability,
          durationSeconds,
        })),
      );
    }
    expect(activity.nextSettlementAt).toBe(
      5_000 + preview.preview.encounters[0]!.durationSeconds * 1_000,
    );
    expect(activity.runPlans.every((run) => run.seed.length > 0)).toBe(true);
    expect(
      activity.runPlans
        .flatMap((run) => run.stages)
        .every((stage) => stage.successRoll >= 0 && stage.successRoll < 1),
    ).toBe(true);
  });

  it("freezes member identity, spec, level, and equipped instance references at departure", async () => {
    const state = newState();
    const memberIds = Object.values(state.members).map((member) => member.id);
    const original = state.members[memberIds[0]!]!;
    const originalHead = original.equipment.head!;
    const preview = getPartyPreview(state, content, dungeonId, memberIds);
    if (!preview.ok) throw new Error("Expected preview");
    const previewProfile = preview.preview.memberProfiles.find(
      (profile) => profile.memberId === original.id,
    )!;
    const { session } = await sessionFor(state);
    const result = await session.execute(
      startExpeditionCommand(
        { content, clock: new FakeClock(2_000) },
        { dungeonId, participantIds: memberIds, requestedRuns: 1 },
      ),
    );
    if (result.status !== "committed") throw new Error("Expected committed expedition");

    const snapshot = result.result.partySnapshot.members[0]!;
    expect(snapshot).toMatchObject({
      memberId: original.id,
      classId: original.identity.classId,
      specId: original.progression.specId,
      personalityId: original.identity.personalityId,
      level: original.progression.level,
    });
    expect(snapshot.equipment.head).toEqual({
      itemInstanceId: originalHead,
      itemDefinitionId: state.itemInstances[originalHead]!.definitionId,
    });
    expect(snapshot.combat).toEqual({
      formulaVersion: previewProfile.formulaVersion,
      role: previewProfile.role,
      capabilities: previewProfile.capabilities,
      utility: previewProfile.utility,
    });

    const frozenCapabilities = structuredClone(result.result.partySnapshot.capabilities);

    original.progression.level = 45;
    delete original.equipment.head;
    original.progression.specId = asBrandedId<"SpecId">("warrior_arms");
    expect(snapshot.level).toBe(10);
    expect(snapshot.equipment.head?.itemInstanceId).toBe(originalHead);
    expect(result.result.partySnapshot.capabilities).toEqual(frozenCapabilities);
  });

  it("keeps a level-10 starter party near the intended first-dungeon curve", () => {
    const state = newState("cal2");
    const memberIds = Object.values(state.members).map((member) => member.id);
    const preview = getPartyPreview(state, content, dungeonId, memberIds);
    expect(preview.ok).toBe(true);
    if (!preview.ok) throw new Error("Expected preview");

    expect(preview.preview.formulaVersion).toBe("classic-light-v1");
    expect(preview.preview.memberProfiles).toHaveLength(5);
    expect(preview.preview.clearProbability).toBeGreaterThanOrEqual(0.75);
    expect(preview.preview.clearProbability).toBeLessThanOrEqual(0.9);
    expect(preview.preview.durationSeconds).toBeGreaterThanOrEqual(570);
    expect(preview.preview.durationSeconds).toBeLessThanOrEqual(630);
  });

  it("lets levels and real attributes reach overpower and minimum-duration territory", () => {
    const state = newState("cal2");
    for (const member of Object.values(state.members)) member.progression.level = 45;
    const memberIds = Object.values(state.members).map((member) => member.id);
    const preview = getPartyPreview(state, content, dungeonId, memberIds);
    expect(preview.ok).toBe(true);
    if (!preview.ok) throw new Error("Expected preview");

    expect(preview.preview.clearProbability).toBe(1);
    expect(preview.preview.durationSeconds).toBeGreaterThanOrEqual(300);
    expect(preview.preview.durationSeconds).toBeLessThanOrEqual(330);
  });

  it("allows nonstandard parties but preserves the missing-role bottleneck", () => {
    const state = newState("cal2");
    const tank = Object.values(state.members).find(
      (member) => content.specById.get(member.progression.specId)?.role === "tank",
    )!;
    tank.progression.specId = asBrandedId<"SpecId">("warrior_arms");
    tank.identity.classId = asBrandedId<"ClassId">("warrior");
    const memberIds = Object.values(state.members).map((member) => member.id);
    const preview = getPartyPreview(state, content, dungeonId, memberIds);
    expect(preview.ok).toBe(true);
    if (!preview.ok) throw new Error("Expected preview");

    expect(preview.preview.contribution.tank).toBe(0);
    expect(preview.preview.clearProbability).toBeLessThan(0.001);
  });

  it("drives previews from real attributes instead of item level", () => {
    const state = newState("cal2");
    const memberIds = Object.values(state.members).map((member) => member.id);
    const mainHand = content.itemById.get(
      state.itemInstances[state.members[memberIds[0]!]!.equipment.mainHand!]!.definitionId,
    )!;
    const baseline = getPartyPreview(state, content, dungeonId, memberIds);
    const itemLevelOnly = getPartyPreview(
      state,
      contentWithItem({ ...mainHand, itemLevel: 60 }),
      dungeonId,
      memberIds,
    );
    const realStatUpgrade = getPartyPreview(
      state,
      contentWithItem({
        ...mainHand,
        stats: {
          primary: {
            strengthPoints: 40,
            agilityPoints: 40,
            intellectPoints: 40,
            spiritPoints: 40,
          },
          physical: {
            attackPowerPoints: 40,
            rangedAttackPowerPoints: 40,
            hitPercent: 4,
            criticalStrikePercent: 4,
          },
          spell: {
            spellPowerPoints: 40,
            healingPowerPoints: 40,
            hitPercent: 4,
            criticalStrikePercent: 4,
          },
          weapon: { damage: { minimumPoints: 35, maximumPoints: 45 }, speedSeconds: 2 },
        },
      }),
      dungeonId,
      memberIds,
    );
    expect(baseline.ok && itemLevelOnly.ok && realStatUpgrade.ok).toBe(true);
    if (!baseline.ok || !itemLevelOnly.ok || !realStatUpgrade.ok) {
      throw new Error("Expected previews");
    }

    expect(itemLevelOnly.preview.contribution).toEqual(baseline.preview.contribution);
    expect(itemLevelOnly.preview.clearProbability).toBe(baseline.preview.clearProbability);
    expect(realStatUpgrade.preview.contribution.damage).toBeGreaterThan(
      baseline.preview.contribution.damage,
    );
    expect(realStatUpgrade.preview.clearProbability).toBeGreaterThan(
      baseline.preview.clearProbability,
    );
  });

  it("uses dungeon-configured party sizes instead of a hard-coded five-member rule", async () => {
    const state = newState();
    const member = Object.values(state.members)[0]!;
    member.progression.level = 1;
    const { session } = await sessionFor(state);

    const result = await session.execute(
      startExpeditionCommand(
        { content, clock: new FakeClock(2_000) },
        { dungeonId, participantIds: [member.id], requestedRuns: 1 },
      ),
    );

    expect(result.status).toBe("committed");
    if (result.status !== "committed") throw new Error("Expected committed expedition");
    expect(result.result.participantIds).toEqual([member.id]);
    expect(result.result.partySnapshot.members[0]!.level).toBe(1);
  });

  it("rejects locked dungeons and invalid repeat counts without changing or saving state", async () => {
    const state = newState();
    const memberIds = Object.values(state.members).map((member) => member.id);
    const { saves, session } = await sessionFor(state);
    const beforeSnapshot = session.snapshot();

    await expect(
      session.execute(
        startExpeditionCommand(
          { content, clock: new FakeClock(2_000) },
          {
            dungeonId: asBrandedId<"DungeonId">("deadmines"),
            participantIds: memberIds,
            requestedRuns: 1,
          },
        ),
      ),
    ).rejects.toMatchObject({
      name: "StartExpeditionError",
      issues: [{ code: "dungeon.locked" }],
    });
    await expect(
      session.execute(
        startExpeditionCommand(
          { content, clock: new FakeClock(2_000) },
          { dungeonId, participantIds: memberIds, requestedRuns: 4 },
        ),
      ),
    ).rejects.toMatchObject({
      issues: [{ code: "runs.invalid" }],
    });

    expect(session.snapshot()).toEqual(beforeSnapshot);
    expect(await saves.load(state.slotId)).toEqual(beforeSnapshot);
  });

  it("accepts four and five runs only after the expedition queue upgrade", async () => {
    const state = newState();
    const memberIds = Object.values(state.members).map((member) => member.id);
    state.guild.purchasedUpgradeIds.push(asBrandedId<"GuildUpgradeId">("expedition_queue_5"));
    const { session } = await sessionFor(state);

    const result = await session.execute(
      startExpeditionCommand(
        { content, clock: new FakeClock(2_000) },
        { dungeonId, participantIds: memberIds, requestedRuns: 5 },
      ),
    );

    expect(result.status).toBe("committed");
    expect(result.status === "committed" ? result.result.runPlans : []).toHaveLength(5);
  });

  it("freezes only participating members' accepted quests for this dungeon at departure", async () => {
    const state = newState();
    const [participant, absentMember] = Object.values(state.members);
    const questId = asBrandedId<"QuestId">("rfc_returning_lost_satchel");
    const laterQuestId = asBrandedId<"QuestId">("rfc_power_to_destroy");
    participant!.quests.entries[questId] = {
      questId,
      status: "accepted",
      acceptedAt: 1_000,
      encounterVictoryIds: [],
    };
    absentMember!.quests.entries[questId] = {
      questId,
      status: "accepted",
      acceptedAt: 1_000,
      encounterVictoryIds: [],
    };
    const { session } = await sessionFor(state);

    const result = await session.execute(
      startExpeditionCommand(
        { content, clock: new FakeClock(2_000) },
        { dungeonId, participantIds: [participant!.id], requestedRuns: 1 },
      ),
    );
    if (result.status !== "committed") throw new Error("Expected committed expedition");

    expect(result.result.questSnapshots).toEqual([]);
    expect(result.result.developmentSnapshot.commissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questId,
          completion: { type: "encounter-victories", encounterIds: ["oggleflint"] },
        }),
        expect.objectContaining({ questId: laterQuestId, completion: { type: "dungeon-clear" } }),
      ]),
    );
    participant!.quests.entries[laterQuestId] = {
      questId: laterQuestId,
      status: "accepted",
      acceptedAt: 2_001,
      encounterVictoryIds: [],
    };
    expect(result.result.developmentSnapshot.commissions).toHaveLength(2);
  });

  it("freezes an accepted cross-dungeon quest whenever this route contains one of its targets", async () => {
    const crossDungeonContent = contentWithCrossDungeonQuest();
    const state = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("cross-dungeon-quest"),
      content: crossDungeonContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("cross-dungeon-quest"),
    });
    const participant = Object.values(state.members)[0]!;
    const questId = asBrandedId<"QuestId">("rfc_returning_lost_satchel");
    participant.quests.entries[questId] = {
      questId,
      status: "accepted",
      acceptedAt: 1_000,
      encounterVictoryIds: [asBrandedId<"EncounterId">("oggleflint")],
    };
    const deadminesId = asBrandedId<"DungeonId">("deadmines");
    state.guild.unlockedDungeonIds.push(deadminesId);

    const activity = await startExpeditionCommand(
      { content: crossDungeonContent, clock: new FakeClock(2_000) },
      { dungeonId: deadminesId, participantIds: [participant.id], requestedRuns: 1 },
    ).execute(state);

    expect(activity.questSnapshots).toEqual([]);
    expect(activity.developmentSnapshot.commissions).toEqual([
      expect.objectContaining({
        questId,
        completion: {
          type: "encounter-victories",
          encounterIds: ["oggleflint", "dm_rhahkzor"],
        },
      }),
    ]);
  });

  it("does not freeze a rescue quest when the player actively selects its excluded route", async () => {
    const shadowforgeId = asBrandedId<"DungeonId">("blackrock_depths_shadowforge_city");
    const princessNodeId = asBrandedId<"DungeonRouteNodeId">("brd_shadowforge_princess_moira");
    const questId = asBrandedId<"QuestId">("brd_shadowforge_royal_rescue");
    const preparedState = (seed: string) => {
      const state = newState(seed);
      state.guild.unlockedDungeonIds.push(shadowforgeId);
      const participant = Object.values(state.members)[0]!;
      participant.progression.level = 60;
      participant.quests.entries[questId] = {
        questId,
        status: "accepted",
        acceptedAt: 1_000,
        encounterVictoryIds: [],
      };
      return { state, participant };
    };

    const rescue = preparedState("shadowforge-rescue-route");

    const rescueActivity = await startExpeditionCommand(
      { content, clock: new FakeClock(2_000) },
      { dungeonId: shadowforgeId, participantIds: [rescue.participant.id], requestedRuns: 1 },
    ).execute(rescue.state);
    expect(
      rescueActivity.developmentSnapshot.commissions.map((snapshot) => snapshot.questId),
    ).toContain(questId);

    const princess = preparedState("shadowforge-princess-route");
    const princessActivity = await startExpeditionCommand(
      { content, clock: new FakeClock(3_000) },
      {
        dungeonId: shadowforgeId,
        participantIds: [princess.participant.id],
        requestedRuns: 1,
        selectedOptionalNodeIds: [princessNodeId],
      },
    ).execute(princess.state);
    expect(
      princessActivity.developmentSnapshot.commissions.map((snapshot) => snapshot.questId),
    ).not.toContain(questId);
  });

  it("replays activity IDs, rolls, and plans deterministically from saved runtime state", async () => {
    async function start() {
      const state = newState("deterministic-expedition");
      const memberIds = Object.values(state.members).map((member) => member.id);
      const { session } = await sessionFor(state);
      const result = await session.execute(
        startExpeditionCommand(
          { content, clock: new FakeClock(2_000) },
          { dungeonId, participantIds: memberIds, requestedRuns: 2 },
        ),
      );
      if (result.status !== "committed") throw new Error("Expected committed expedition");
      return result.result;
    }

    expect(await start()).toEqual(await start());
  });
});
