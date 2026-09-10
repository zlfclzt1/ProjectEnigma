import { describe, expect, it } from "vitest";
import { startExpeditionCommand } from "../../src/application/commands/start-expedition";
import { getItemCatalogView } from "../../src/application/queries/get-item-catalog-view";
import { SettlementService } from "../../src/application/services/settlement-service";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { ExpeditionActivity } from "../../src/domain/activity/activity";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";
import { getMemberLevelCap } from "../../src/domain/member/member-level-cap";

const content = loadBrowserContentRegistry();
const dungeonId = asBrandedId<"DungeonId">("zulfarrak");
const rewardId = asBrandedId<"CollectionRewardId">("zulfarrak_level_45_graduation");

function newStageEndState() {
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">("zulfarrak-stage-milestone"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-2019-phase-6"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("zulfarrak-stage-milestone"),
  });
  state.guild.unlockedDungeonIds.push(dungeonId);
  for (const member of Object.values(state.members)) {
    member.progression.level = 45;
    member.progression.experience = 0;
  }
  return state;
}

async function startAndComplete(
  state: ReturnType<typeof newStageEndState>,
  startedAt: number,
): Promise<ExpeditionActivity> {
  const created = await startExpeditionCommand(
    { content, clock: new FakeClock(startedAt) },
    {
      dungeonId,
      participantIds: Object.values(state.members).map((member) => member.id),
      requestedRuns: 1,
    },
  ).execute(state);
  const activity = state.activities[created.id] as ExpeditionActivity;
  for (const stage of activity.runPlans[0]!.stages) {
    stage.probability = 1;
    stage.successRoll = 0;
  }
  new SettlementService(content).settleDueActivities(state, Number.MAX_SAFE_INTEGER);
  return activity;
}

describe("Zul'Farrak stage milestone", () => {
  it("awards the level-45 graduation record and funds exactly once while play continues", async () => {
    const state = newStageEndState();
    expect(getMemberLevelCap(state, content)).toBe(45);
    const initialFunds = state.guild.funds;
    const first = await startAndComplete(state, 2_000);
    const firstEncounterRewards = first.runPlans[0]!.stages.reduce((sum, stage) => {
      const encounter = content.encounterById.get(stage.encounterId)!;
      return sum + encounter.funds + encounter.firstKillBonus;
    }, 0);
    const finalReport = first.runPlans[0]!.stages.find(
      (stage) => stage.encounterId === "zulfarrak_chief_ukorz",
    )!.report!;

    expect(first.status).toBe("completed");
    expect(state.guild.funds).toBe(initialFunds + firstEncounterRewards + 1000);
    expect(finalReport.rewards.firstKillBonus).toBe(
      content.encounterById.get(asBrandedId<"EncounterId">("zulfarrak_chief_ukorz"))!
        .firstKillBonus + 1000,
    );
    expect(state.collection.claimedRewardIds.filter((id) => id === rewardId)).toHaveLength(1);
    expect(getItemCatalogView(state, content).unlockedDisplayRecordIds).toContain(
      "level_45_era_graduate",
    );
    expect(getItemCatalogView(state, content).unlockedManagementFeatureIds).toContain(
      "level_cap_60",
    );
    expect(getMemberLevelCap(state, content)).toBe(60);
    expect(
      Object.values(state.members).every((member) => member.progression.experience === 0),
    ).toBe(true);

    const fundsBeforeRepeat = state.guild.funds;
    const repeat = await startAndComplete(state, first.completedAt! + 1);
    const repeatFunds = repeat.runPlans[0]!.stages.reduce(
      (sum, stage) => sum + content.encounterById.get(stage.encounterId)!.funds,
      0,
    );

    expect(repeat.status).toBe("completed");
    expect(state.guild.funds).toBe(fundsBeforeRepeat + repeatFunds);
    expect(state.collection.claimedRewardIds.filter((id) => id === rewardId)).toHaveLength(1);
    expect(state.history.dungeonClearCounts[dungeonId]).toBe(2);
    expect(state.guild.unlockedDungeonIds).toContain(dungeonId);
    expect(Object.keys(state.candidates).length).toBeGreaterThan(0);
    expect(
      Object.values(state.members).some(
        (member) => member.progression.level > 45 || member.progression.experience > 0,
      ),
    ).toBe(true);
  });
});
