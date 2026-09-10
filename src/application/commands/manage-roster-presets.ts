import type { Clock } from "../ports/clock";
import type { GameCommand } from "../services/game-session";
import type { GameState } from "../../domain/game-state";
import {
  assertUniqueRosterPresetName,
  MAX_ROSTER_PRESET_MEMBERS,
  MAX_ROSTER_PRESETS,
  normalizeRosterPresetName,
  type RosterPreset,
  type RosterPresetMember,
} from "../../domain/guild/roster-preset";
import type { MemberId, RosterPresetId } from "../../domain/shared/ids";
import { asBrandedId } from "../../domain/shared/ids";
import { LocalIdGenerator } from "../../infrastructure/ids/local-id-generator";

function memberSnapshots(draft: GameState, memberIds: readonly MemberId[]): RosterPresetMember[] {
  const uniqueIds = [...new Set(memberIds)];
  if (uniqueIds.length < 1) throw new Error("固定队伍至少需要 1 名成员。");
  if (uniqueIds.length > MAX_ROSTER_PRESET_MEMBERS) {
    throw new Error(`固定队伍最多保存 ${MAX_ROSTER_PRESET_MEMBERS} 名成员。`);
  }
  return uniqueIds.map((memberId) => {
    const member = draft.members[memberId];
    if (!member) throw new Error("固定队伍中存在已经离开公会的成员。");
    return { memberId, nameAtSave: member.identity.name };
  });
}

export function createRosterPresetCommand(
  clock: Clock,
  name: string,
  memberIds: readonly MemberId[],
): GameCommand<RosterPreset> {
  return {
    type: "create-roster-preset",
    execute(draft) {
      if (Object.keys(draft.rosterPresets.presets).length >= MAX_ROSTER_PRESETS) {
        throw new Error(`最多只能保存 ${MAX_ROSTER_PRESETS} 支固定队伍。`);
      }
      const normalizedName = normalizeRosterPresetName(name);
      assertUniqueRosterPresetName(draft.rosterPresets, normalizedName);
      const members = memberSnapshots(draft, memberIds);
      const ids = new LocalIdGenerator(draft.ids);
      const now = clock.now();
      const preset: RosterPreset = {
        id: asBrandedId<"RosterPresetId">(ids.next("roster-preset")),
        name: normalizedName,
        members,
        createdAt: now,
        updatedAt: now,
      };
      draft.rosterPresets.presets[preset.id] = preset;
      draft.ids = ids.snapshot();
      return structuredClone(preset);
    },
  };
}

export function updateRosterPresetCommand(
  clock: Clock,
  presetId: RosterPresetId,
  memberIds: readonly MemberId[],
): GameCommand<RosterPreset> {
  return {
    type: "update-roster-preset",
    execute(draft) {
      const preset = draft.rosterPresets.presets[presetId];
      if (!preset) throw new Error("固定队伍不存在。");
      preset.members = memberSnapshots(draft, memberIds);
      preset.updatedAt = clock.now();
      return structuredClone(preset);
    },
  };
}

export function renameRosterPresetCommand(
  clock: Clock,
  presetId: RosterPresetId,
  name: string,
): GameCommand<RosterPreset> {
  return {
    type: "rename-roster-preset",
    execute(draft) {
      const preset = draft.rosterPresets.presets[presetId];
      if (!preset) throw new Error("固定队伍不存在。");
      const normalizedName = normalizeRosterPresetName(name);
      assertUniqueRosterPresetName(draft.rosterPresets, normalizedName, presetId);
      preset.name = normalizedName;
      preset.updatedAt = clock.now();
      return structuredClone(preset);
    },
  };
}

export function deleteRosterPresetCommand(presetId: RosterPresetId): GameCommand<boolean> {
  return {
    type: "delete-roster-preset",
    execute(draft) {
      if (!draft.rosterPresets.presets[presetId]) return false;
      delete draft.rosterPresets.presets[presetId];
      return true;
    },
  };
}
