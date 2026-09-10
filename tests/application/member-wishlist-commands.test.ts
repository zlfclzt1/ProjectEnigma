import { describe, expect, it } from "vitest";
import { removeMemberWishlistTargetCommand } from "../../src/application/commands/remove-member-wishlist-target";
import { setMemberWishlistTargetCommand } from "../../src/application/commands/set-member-wishlist-target";
import { GameSession } from "../../src/application/services/game-session";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { createGameStateFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

async function setup() {
  const state = createGameStateFixture({ activities: {} });
  const member = Object.values(state.members)[0]!;
  delete member.activeActivityId;
  const saves = new MemorySaveRepository([state]);
  return { member, session: GameSession.fromState(saves, state) };
}

describe("member wishlist commands", () => {
  it("persists an eligible target from an unlocked dungeon and removes it", async () => {
    const { member, session } = await setup();
    const itemDefinitionId = asBrandedId<"ItemDefinitionId">("14149");

    const added = await session.execute(
      setMemberWishlistTargetCommand(content, member.id, {
        itemDefinitionId,
        acceptableRandomSuffixIds: [],
      }),
    );

    expect(added.status).toBe("committed");
    expect(session.snapshot().members[member.id]!.wishlist.entries).toEqual([
      { itemDefinitionId: "14149", acceptableRandomSuffixIds: [] },
    ]);

    const removed = await session.execute(
      removeMemberWishlistTargetCommand(member.id, itemDefinitionId),
    );
    expect(removed).toMatchObject({ status: "committed", result: true });
    expect(session.snapshot().members[member.id]!.wishlist.entries).toEqual([]);
  });

  it("rejects targets from locked dungeons without mutating the member", async () => {
    const { member, session } = await setup();

    await expect(
      session.execute(
        setMemberWishlistTargetCommand(content, member.id, {
          itemDefinitionId: asBrandedId<"ItemDefinitionId">("10412"),
          acceptableRandomSuffixIds: [],
        }),
      ),
    ).rejects.toThrow("已解锁副本");
    expect(session.snapshot().members[member.id]!.wishlist.entries).toEqual([]);
  });
});
