import type { ContentRegistry } from "../../content/registry";
import type { CapabilityId, MemberId, SpecId } from "../shared/ids";
import type { CombatProfile } from "./combat-profile";

export interface PartyCapabilityContribution {
  readonly memberId: MemberId;
  readonly value: number;
  readonly source: "progression" | "combat-profile";
}

export interface PartyCapabilitySnapshot {
  readonly values: Readonly<Record<string, number>>;
  readonly contributions: Readonly<Record<string, readonly PartyCapabilityContribution[]>>;
}

export interface PartyCapabilityInput {
  readonly memberId: MemberId;
  readonly specId: SpecId;
  readonly level: number;
}

function primaryRoleCapability(profile: CombatProfile): { id: CapabilityId; value: number } {
  if (profile.role === "tank") {
    return {
      id: "tanking" as CapabilityId,
      value: Math.sqrt(profile.capabilities.survivability * profile.capabilities.threat),
    };
  }
  if (profile.role === "healer") {
    return { id: "healing" as CapabilityId, value: profile.capabilities.healing };
  }
  return { id: "damage" as CapabilityId, value: profile.capabilities.damage };
}

export function aggregatePartyCapabilities(
  content: ContentRegistry,
  members: readonly PartyCapabilityInput[],
  profiles: readonly CombatProfile[],
): PartyCapabilitySnapshot {
  const values: Record<string, number> = {};
  const contributions: Record<string, PartyCapabilityContribution[]> = {};
  const add = (
    capabilityId: CapabilityId,
    memberId: MemberId,
    value: number,
    source: PartyCapabilityContribution["source"],
  ): void => {
    if (!Number.isFinite(value) || value < 0) throw new Error(`能力 ${capabilityId} 的值无效。`);
    values[capabilityId] = (values[capabilityId] ?? 0) + value;
    (contributions[capabilityId] ??= []).push({ memberId, value, source });
  };

  for (const profile of profiles) {
    const roleCapability = primaryRoleCapability(profile);
    add(roleCapability.id, profile.memberId, roleCapability.value, "combat-profile");
    const member = members.find((candidate) => candidate.memberId === profile.memberId);
    if (!member) throw new Error(`成员 ${profile.memberId} 缺少能力快照输入。`);
    const progression = content.specCapabilities.find(
      (candidate) => candidate.specId === member.specId,
    );
    if (!progression) throw new Error(`专精 ${member.specId} 缺少能力成长。`);
    for (const entry of progression.entries) {
      if (member.level >= entry.minimumLevel) {
        add(entry.capabilityId, member.memberId, entry.value, "progression");
      }
    }
  }

  return {
    values: Object.freeze({ ...values }),
    contributions: Object.freeze(
      Object.fromEntries(
        Object.entries(contributions).map(([id, entries]) => [id, Object.freeze([...entries])]),
      ),
    ),
  };
}
