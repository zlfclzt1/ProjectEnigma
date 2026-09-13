import type { ContentRegistry } from "../../content/registry";
import type { GameCommand } from "../services/game-session";
import type { GameState } from "../../domain/game-state";

export function organizeGuildBankCommand(content: ContentRegistry): GameCommand<boolean> {
  return {
    type: "organize-guild-bank",
    execute(draft: GameState) {
      const names = new Map(content.items.map((item) => [item.id, item.name.zhCN]));
      const sortedStackEntries = Object.entries(draft.guildBank.stackCounts)
        .filter(([, quantity]) => quantity > 0)
        .sort(([left], [right]) =>
          (names.get(left as never) ?? left).localeCompare(names.get(right as never) ?? right),
        );
      draft.guildBank.stackCounts = Object.fromEntries(
        sortedStackEntries,
      ) as GameState["guildBank"]["stackCounts"];
      if (draft.guildBank.reservedStackCounts) {
        draft.guildBank.reservedStackCounts = Object.fromEntries(
          Object.entries(draft.guildBank.reservedStackCounts)
            .filter(([, quantity]) => quantity > 0)
            .sort(([left], [right]) => left.localeCompare(right)),
        ) as GameState["guildBank"]["reservedStackCounts"];
      }
      if (draft.guildBank.reservedOutputStackCounts) {
        draft.guildBank.reservedOutputStackCounts = Object.fromEntries(
          Object.entries(draft.guildBank.reservedOutputStackCounts)
            .filter(([, quantity]) => quantity > 0)
            .sort(([left], [right]) => left.localeCompare(right)),
        ) as GameState["guildBank"]["reservedOutputStackCounts"];
      }
      draft.guildBank.equipmentInstanceIds.sort((left, right) => {
        const l = draft.itemInstances[left];
        const r = draft.itemInstances[right];
        return (names.get(l?.definitionId as never) ?? left).localeCompare(
          names.get(r?.definitionId as never) ?? right,
        );
      });
      return true;
    },
  };
}
