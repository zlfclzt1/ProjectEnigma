import type { MemberId, RosterPresetId } from "../shared/ids";

export const MAX_ROSTER_PRESETS = 10;
export const MAX_ROSTER_PRESET_MEMBERS = 40;
export const MAX_ROSTER_PRESET_NAME_LENGTH = 30;

export interface RosterPresetMember {
  readonly memberId: MemberId;
  readonly nameAtSave: string;
}

export interface RosterPreset {
  readonly id: RosterPresetId;
  name: string;
  members: RosterPresetMember[];
  readonly createdAt: number;
  updatedAt: number;
}

export interface RosterPresetState {
  presets: Record<RosterPresetId, RosterPreset>;
}

export function createEmptyRosterPresetState(): RosterPresetState {
  return { presets: {} };
}

export function normalizeRosterPresetName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new Error("固定队伍名称不能为空。");
  if (normalized.length > MAX_ROSTER_PRESET_NAME_LENGTH) {
    throw new Error(`固定队伍名称不能超过 ${MAX_ROSTER_PRESET_NAME_LENGTH} 个字符。`);
  }
  return normalized;
}

export function assertUniqueRosterPresetName(
  state: RosterPresetState,
  name: string,
  excludingId?: RosterPresetId,
): void {
  const duplicate = Object.values(state.presets).some(
    (preset) =>
      preset.id !== excludingId &&
      preset.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0,
  );
  if (duplicate) throw new Error("固定队伍名称不能重复。");
}

export function nextDefaultRosterPresetName(state: RosterPresetState): string {
  let index = 1;
  const used = new Set(Object.values(state.presets).map((preset) => preset.name));
  while (used.has(`固定队伍 ${index}`)) index += 1;
  return `固定队伍 ${index}`;
}
