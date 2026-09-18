import { describe, expect, it } from "vitest";
import balance from "../fixtures/v2-dungeon-balance.json";
import { getPartyPreview } from "../../src/application/queries/get-party-preview";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import {
  DEFAULT_DUNGEON_EXPERIENCE_CONFIG,
  experienceFractions,
} from "../../src/domain/dungeon/expedition-activity";
import { evaluateExpeditionParty } from "../../src/domain/dungeon/party-evaluation";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

function newState(seed: string) {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">(`balance_${seed}`),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource(seed),
  });
}

describe("V2 dungeon balance", () => {
  it("applies the special watchful personality's combat and experience bonuses", () => {
    const dungeonId = asBrandedId<"DungeonId">("ragefire_chasm");
    const dungeon = content.dungeonById.get(dungeonId)!;
    const baselineState = newState("watchful-baseline");
    const memberIds = Object.values(baselineState.members).map((member) => member.id);
    for (const member of Object.values(baselineState.members)) {
      member.progression.level = dungeon.recommendedLevel;
      member.identity.personalityId = asBrandedId<"PersonalityId">("diligent");
    }
    const specialState = structuredClone(baselineState);
    const specialMemberId = memberIds[0]!;
    specialState.members[specialMemberId]!.identity.personalityId =
      asBrandedId<"PersonalityId">("watchful");

    const baselinePreview = evaluateExpeditionParty(baselineState, content, dungeonId, memberIds);
    const specialPreview = evaluateExpeditionParty(specialState, content, dungeonId, memberIds);
    expect(baselinePreview.ok && specialPreview.ok).toBe(true);
    if (!baselinePreview.ok || !specialPreview.ok) throw new Error("Expected valid previews");
    const baselineProfile = baselinePreview.preview.memberProfiles.find(
      (profile) => profile.memberId === specialMemberId,
    )!;
    const specialProfile = specialPreview.preview.memberProfiles.find(
      (profile) => profile.memberId === specialMemberId,
    )!;
    expect(specialProfile.capabilities.damage).toBeCloseTo(
      baselineProfile.capabilities.damage * 1.04,
    );

    baselineState.members[specialMemberId]!.identity.personalityId =
      asBrandedId<"PersonalityId">("steady");
    const baselineXp = experienceFractions(baselineState, content, dungeonId, [specialMemberId]);
    const specialXp = experienceFractions(specialState, content, dungeonId, [specialMemberId]);
    expect(specialXp[specialMemberId]).toBeCloseTo(baselineXp[specialMemberId]! * 1.08);
  });

  it("keeps all four recommended-level standard parties on the agreed clear-rate curve", () => {
    expect(balance.samplesPerScenario).toBeGreaterThanOrEqual(100_000);
    expect(balance.partyVariants).toBeGreaterThanOrEqual(100);
    expect(balance.dungeons).toHaveLength(4);

    for (const dungeon of balance.dungeons) {
      expect(dungeon.recommendedStandard.simulatedRuns, dungeon.id).toBeGreaterThanOrEqual(100_000);
      expect(dungeon.recommendedStandard.simulatedClearRate, dungeon.id).toBeGreaterThanOrEqual(
        0.79,
      );
      expect(dungeon.recommendedStandard.simulatedClearRate, dungeon.id).toBeLessThanOrEqual(0.84);
    }
  });

  it("preserves meaningful composition and power progression", () => {
    for (const result of balance.dungeons) {
      const definition = content.dungeonById.get(asBrandedId<"DungeonId">(result.id))!;
      expect(result.recommendedNoTank.simulatedClearRate, result.id).toBeLessThan(
        result.recommendedStandard.simulatedClearRate,
      );
      expect(result.recommendedNoTank.durationSeconds.mean, result.id).toBeGreaterThan(
        result.recommendedStandard.durationSeconds.mean,
      );
      expect(result.maxLevelStandard.simulatedClearRate, result.id).toBeGreaterThanOrEqual(0.99);
      expect(result.maxLevelStandard.durationSeconds.mean, result.id).toBeLessThanOrEqual(
        definition.duration.baseSeconds * 0.67,
      );
      expect(result.maxLevelStandard.durationSeconds.p10, result.id).toBeGreaterThanOrEqual(
        definition.duration.baseSeconds * definition.duration.minimumRatio,
      );
    }
  });

  it("lets veterans carry a low-level member with a configurable level-spread penalty", () => {
    const state = newState("carry-xp");
    const members = Object.values(state.members);
    const lowLevelMember = members[0]!;
    lowLevelMember.progression.level = 10;
    const shadowfangId = asBrandedId<"DungeonId">("shadowfang_keep");
    const ragefireId = asBrandedId<"DungeonId">("ragefire_chasm");

    const lowDungeonXp = experienceFractions(state, content, ragefireId, [lowLevelMember.id]);
    const soloHighDungeonXp = experienceFractions(state, content, shadowfangId, [
      lowLevelMember.id,
    ]);
    const allLowPreview = getPartyPreview(
      state,
      content,
      shadowfangId,
      members.map((member) => member.id),
    );

    for (const member of members.slice(1)) member.progression.level = 45;
    const carriedXp = experienceFractions(
      state,
      content,
      shadowfangId,
      members.map((member) => member.id),
    );
    const carriedPreview = getPartyPreview(
      state,
      content,
      shadowfangId,
      members.map((member) => member.id),
    );

    expect(soloHighDungeonXp[lowLevelMember.id]).toBeGreaterThan(lowDungeonXp[lowLevelMember.id]!);
    expect(carriedXp[lowLevelMember.id]).toBeGreaterThan(0);
    expect(carriedXp[lowLevelMember.id]).toBeLessThan(soloHighDungeonXp[lowLevelMember.id]!);
    expect(carriedXp[lowLevelMember.id]).toBeGreaterThan(lowDungeonXp[lowLevelMember.id]!);
    for (const veteran of members.slice(1)) expect(carriedXp[veteran.id]).toBe(0);
    expect(allLowPreview.ok && carriedPreview.ok).toBe(true);
    if (!allLowPreview.ok || !carriedPreview.ok) throw new Error("Expected valid carry previews");
    expect(carriedPreview.preview.clearProbability).toBeGreaterThan(
      allLowPreview.preview.clearProbability,
    );
    expect(carriedPreview.preview.durationSeconds).toBeLessThan(
      allLowPreview.preview.durationSeconds,
    );

    const withoutSpreadPenalty = experienceFractions(
      state,
      content,
      shadowfangId,
      members.map((member) => member.id),
      {
        ...DEFAULT_DUNGEON_EXPERIENCE_CONFIG,
        boost: {
          ...DEFAULT_DUNGEON_EXPERIENCE_CONFIG.boost,
          graceLevelSpread: 100,
        },
      },
    );
    expect(withoutSpreadPenalty[lowLevelMember.id]).toBe(soloHighDungeonXp[lowLevelMember.id]);
  });
});
