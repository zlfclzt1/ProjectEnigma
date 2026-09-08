declare const ID_BRAND: unique symbol;

export type BrandedId<Name extends string> = string & {
  readonly [ID_BRAND]: Name;
};

export type ActivityId = BrandedId<"ActivityId">;
export type CandidateId = BrandedId<"CandidateId">;
export type ClassId = BrandedId<"ClassId">;
export type CombatProfileId = BrandedId<"CombatProfileId">;
export type ContentVersion = BrandedId<"ContentVersion">;
export type DungeonId = BrandedId<"DungeonId">;
export type EncounterId = BrandedId<"EncounterId">;
export type HiddenCharacterId = BrandedId<"HiddenCharacterId">;
export type ItemDefinitionId = BrandedId<"ItemDefinitionId">;
export type ItemInstanceId = BrandedId<"ItemInstanceId">;
export type LogTemplateId = BrandedId<"LogTemplateId">;
export type LootTableId = BrandedId<"LootTableId">;
export type MechanicId = BrandedId<"MechanicId">;
export type MemberId = BrandedId<"MemberId">;
export type MountId = BrandedId<"MountId">;
export type PersonalityId = BrandedId<"PersonalityId">;
export type ProfessionDefinitionId = BrandedId<"ProfessionDefinitionId">;
export type RecipeId = BrandedId<"RecipeId">;
export type SaveSlotId = BrandedId<"SaveSlotId">;
export type SpecId = BrandedId<"SpecId">;

export function asBrandedId<Name extends string>(value: string): BrandedId<Name> {
  return value as BrandedId<Name>;
}
