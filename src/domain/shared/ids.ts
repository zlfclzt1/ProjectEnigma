declare const ID_BRAND: unique symbol;

export type BrandedId<Name extends string> = string & {
  readonly [ID_BRAND]: Name;
};

export type ActivityId = BrandedId<"ActivityId">;
export type CandidateId = BrandedId<"CandidateId">;
export type CapabilityId = BrandedId<"CapabilityId">;
export type ClassId = BrandedId<"ClassId">;
export type CombatProfileId = BrandedId<"CombatProfileId">;
export type CombatReportId = BrandedId<"CombatReportId">;
export type CollectionRewardId = BrandedId<"CollectionRewardId">;
export type ContentVersion = BrandedId<"ContentVersion">;
export type DisplayRecordId = BrandedId<"DisplayRecordId">;
export type DungeonId = BrandedId<"DungeonId">;
export type EnchantmentId = BrandedId<"EnchantmentId">;
export type EncounterId = BrandedId<"EncounterId">;
export type FormulaVersion = BrandedId<"FormulaVersion">;
export type GatheringSiteId = BrandedId<"GatheringSiteId">;
export type GuildUpgradeId = BrandedId<"GuildUpgradeId">;
export type GuildUpgradeTrackId = BrandedId<"GuildUpgradeTrackId">;
export type HiddenCharacterId = BrandedId<"HiddenCharacterId">;
export type ItemDefinitionId = BrandedId<"ItemDefinitionId">;
export type ItemInstanceId = BrandedId<"ItemInstanceId">;
export type ItemSetId = BrandedId<"ItemSetId">;
export type LogTemplateId = BrandedId<"LogTemplateId">;
export type LootTableId = BrandedId<"LootTableId">;
export type MechanicId = BrandedId<"MechanicId">;
export type ManagementFeatureId = BrandedId<"ManagementFeatureId">;
export type MemberId = BrandedId<"MemberId">;
export type MemberProfessionId = BrandedId<"MemberProfessionId">;
export type MountId = BrandedId<"MountId">;
export type PendingLootId = BrandedId<"PendingLootId">;
export type PersonalityId = BrandedId<"PersonalityId">;
export type ProfessionDefinitionId = BrandedId<"ProfessionDefinitionId">;
export type RaceId = BrandedId<"RaceId">;
export type RecipeId = BrandedId<"RecipeId">;
export type RandomSuffixId = BrandedId<"RandomSuffixId">;
export type SaveSlotId = BrandedId<"SaveSlotId">;
export type SpecId = BrandedId<"SpecId">;
export type SpecCapabilityProgressionId = BrandedId<"SpecCapabilityProgressionId">;
export type TrainingDefinitionId = BrandedId<"TrainingDefinitionId">;

export function asBrandedId<Name extends string>(value: string): BrandedId<Name> {
  return value as BrandedId<Name>;
}
