import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import {
  MAX_ROSTER_PRESET_MEMBERS,
  MAX_ROSTER_PRESETS,
  nextDefaultRosterPresetName,
} from "../../domain/guild/roster-preset";
import type { ClassId, MemberId, RosterPresetId } from "../../domain/shared/ids";

export interface RosterPresetMemberView {
  readonly id: MemberId;
  readonly name: string;
  readonly nameAtSave: string;
  readonly departed: boolean;
  readonly active: boolean;
  readonly classId: ClassId | null;
  readonly className: string;
  readonly role: "tank" | "healer" | "dps" | null;
  readonly roleName: string;
  readonly level: number | null;
}

export interface RosterPresetView {
  readonly id: RosterPresetId;
  readonly name: string;
  readonly members: readonly RosterPresetMemberView[];
  readonly currentMemberIds: readonly MemberId[];
  readonly departedCount: number;
  readonly activeCount: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface RosterPresetDirectoryView {
  readonly presets: readonly RosterPresetView[];
  readonly defaultName: string;
  readonly maximumPresets: number;
  readonly maximumMembers: number;
}

export function getRosterPresetsView(
  state: GameState,
  content: ContentRegistry,
): RosterPresetDirectoryView {
  const presets = Object.values(state.rosterPresets.presets)
    .map((preset): RosterPresetView => {
      const members = preset.members.map((snapshot): RosterPresetMemberView => {
        const member = state.members[snapshot.memberId];
        if (!member) {
          return {
            id: snapshot.memberId,
            name: snapshot.nameAtSave,
            nameAtSave: snapshot.nameAtSave,
            departed: true,
            active: false,
            classId: null,
            className: "已离队",
            role: null,
            roleName: "已离队",
            level: null,
          };
        }
        const spec = content.specById.get(member.progression.specId);
        return {
          id: member.id,
          name: member.identity.name,
          nameAtSave: snapshot.nameAtSave,
          departed: false,
          active: member.activeActivityId !== undefined,
          classId: member.identity.classId,
          className: content.classById.get(member.identity.classId)?.name.zhCN ?? "未知职业",
          role: spec?.role ?? null,
          roleName: spec ? (content.roleById.get(spec.role)?.name.zhCN ?? spec.role) : "未知职责",
          level: member.progression.level,
        };
      });
      return {
        id: preset.id,
        name: preset.name,
        members,
        currentMemberIds: members.filter((member) => !member.departed).map((member) => member.id),
        departedCount: members.filter((member) => member.departed).length,
        activeCount: members.filter((member) => member.active).length,
        createdAt: preset.createdAt,
        updatedAt: preset.updatedAt,
      };
    })
    .sort((left, right) => left.createdAt - right.createdAt || left.name.localeCompare(right.name));
  return {
    presets,
    defaultName: nextDefaultRosterPresetName(state.rosterPresets),
    maximumPresets: MAX_ROSTER_PRESETS,
    maximumMembers: MAX_ROSTER_PRESET_MEMBERS,
  };
}
