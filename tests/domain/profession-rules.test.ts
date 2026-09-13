import { describe, expect, it } from "vitest";
import { createMemberFixture } from "../helpers/game-state-v2-factory";
import {
  addProfessionToMember,
  removeProfessionFromMember,
} from "../../src/domain/profession/profession-rules";
import { asBrandedId } from "../../src/domain/shared/ids";
import {
  guildBankSlotUsage,
  slotCapacityPolicy,
} from "../../src/domain/inventory/guild-bank-rules";

describe("profession rules", () => {
  it("allows two primary professions and clears state when abandoning", () => {
    const member = createMemberFixture();
    const mining = asBrandedId<"ProfessionDefinitionId">("mining");
    const blacksmithing = asBrandedId<"ProfessionDefinitionId">("blacksmithing");
    addProfessionToMember(member, mining);
    addProfessionToMember(member, blacksmithing);
    expect(Object.keys(member.professionStates ?? {})).toHaveLength(2);
    expect(() => addProfessionToMember(member, asBrandedId("alchemy"))).toThrow("两个主专业");
    removeProfessionFromMember(member, mining);
    expect(member.professionStates?.[mining]).toBeUndefined();
    expect(member.professionIds).not.toContain(mining);
  });
});

describe("guild bank slot capacity", () => {
  it("counts partial stacks and equipment instances", () => {
    const ore = asBrandedId<"ItemDefinitionId">("copper-ore");
    const bank = {
      stackCounts: { [ore]: 25 },
      equipmentInstanceIds: [asBrandedId<"ItemInstanceId">("item-1")],
    };
    const limits = new Map([[ore, 20]]);
    expect(guildBankSlotUsage(bank, limits)).toBe(3);
    expect(
      slotCapacityPolicy({ capacitySlots: 3, stackLimitByItemId: limits }).canAddStack(
        bank,
        ore,
        16,
      ),
    ).toBe(false);
  });
});
