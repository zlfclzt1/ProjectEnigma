import type { ContentRegistry } from "../../content/registry";
import type { MissingMechanicEffects } from "../../content/schemas/mechanic";
import type { PartyCapabilitySnapshot } from "../combat/party-capabilities";
import type { CapabilityId, EncounterId, MechanicId } from "../shared/ids";

export interface MechanicRequirementResult {
  readonly capabilityId: CapabilityId;
  readonly currentValue: number;
  readonly minimumValue: number;
  readonly satisfied: boolean;
}

export interface EncounterMechanicResult {
  readonly mechanicId: MechanicId;
  readonly reportTag: string;
  readonly type: "required" | "recommended";
  readonly satisfied: boolean;
  readonly requirements: readonly MechanicRequirementResult[];
  readonly appliedEffects?: MissingMechanicEffects;
}

export interface EncounterMechanicEvaluation {
  readonly encounterId: EncounterId;
  readonly mechanics: readonly EncounterMechanicResult[];
  readonly effects: {
    readonly tankMultiplier: number;
    readonly healingMultiplier: number;
    readonly damageMultiplier: number;
    readonly probabilityModifier: number;
    readonly durationMultiplier: number;
  };
}

export function evaluateEncounterMechanics(
  content: ContentRegistry,
  encounterId: EncounterId,
  capabilities: PartyCapabilitySnapshot,
): EncounterMechanicEvaluation {
  const encounter = content.encounterById.get(encounterId);
  if (!encounter) throw new Error(`找不到首领战 ${encounterId}。`);
  const effects = {
    tankMultiplier: 1,
    healingMultiplier: 1,
    damageMultiplier: 1,
    probabilityModifier: 0,
    durationMultiplier: 1,
  };
  const mechanics = [...new Set(encounter.mechanicIds)].map(
    (mechanicId): EncounterMechanicResult => {
      const mechanic = content.mechanicById.get(mechanicId);
      if (!mechanic) throw new Error(`找不到首领机制 ${mechanicId}。`);
      const requirements = mechanic.requirements.map((requirement) => {
        const currentValue = capabilities.values[requirement.capabilityId] ?? 0;
        return {
          capabilityId: requirement.capabilityId,
          currentValue,
          minimumValue: requirement.minimumValue,
          satisfied: currentValue >= requirement.minimumValue,
        };
      });
      const satisfied = requirements.every((requirement) => requirement.satisfied);
      const appliedEffects =
        !satisfied && mechanic.type === "recommended" ? mechanic.missingEffects : undefined;
      if (appliedEffects) {
        effects.tankMultiplier *= appliedEffects.tankMultiplier ?? 1;
        effects.healingMultiplier *= appliedEffects.healingMultiplier ?? 1;
        effects.damageMultiplier *= appliedEffects.damageMultiplier ?? 1;
        effects.probabilityModifier += appliedEffects.probabilityModifier ?? 0;
        effects.durationMultiplier *= appliedEffects.durationMultiplier ?? 1;
      }
      return {
        mechanicId,
        reportTag: mechanic.reportTag,
        type: mechanic.type,
        satisfied,
        requirements,
        ...(appliedEffects ? { appliedEffects } : {}),
      };
    },
  );
  return { encounterId, mechanics, effects };
}
