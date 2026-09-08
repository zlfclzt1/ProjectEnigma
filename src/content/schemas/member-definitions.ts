import { z } from "zod";
import {
  armorTypeSchema,
  brandedContentIdSchema,
  localizedTextSchema,
  probabilitySchema,
  roleSchema,
} from "./common";
import { contentAttributionSchema } from "./content-source";

const classIdSchema = brandedContentIdSchema<"ClassId">();
const raceIdSchema = brandedContentIdSchema<"RaceId">();
const specIdSchema = brandedContentIdSchema<"SpecId">();
const personalityIdSchema = brandedContentIdSchema<"PersonalityId">();
const hiddenCharacterIdSchema = brandedContentIdSchema<"HiddenCharacterId">();
const combatProfileIdSchema = brandedContentIdSchema<"CombatProfileId">();

const contentFileBaseSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
  })
  .strict();

export const roleDefinitionSchema = z
  .object({
    id: roleSchema,
    name: localizedTextSchema,
  })
  .strict();

export const roleDefinitionFileSchema = contentFileBaseSchema.safeExtend({
  roles: z.array(roleDefinitionSchema).min(1),
});

export const classDefinitionSchema = z
  .object({
    id: classIdSchema,
    name: localizedTextSchema,
    armorType: armorTypeSchema,
    raceIds: z.array(raceIdSchema).min(1),
  })
  .strict();

export const classDefinitionFileSchema = contentFileBaseSchema.safeExtend({
  classes: z.array(classDefinitionSchema).min(1),
});

export const raceDefinitionSchema = z
  .object({
    id: raceIdSchema,
    name: localizedTextSchema,
  })
  .strict();

export const raceDefinitionFileSchema = contentFileBaseSchema.safeExtend({
  races: z.array(raceDefinitionSchema).min(1),
});

export const specDefinitionSchema = z
  .object({
    id: specIdSchema,
    classId: classIdSchema,
    name: localizedTextSchema,
    role: roleSchema,
    combatProfileId: combatProfileIdSchema,
  })
  .strict();

export const specDefinitionFileSchema = contentFileBaseSchema.safeExtend({
  specs: z.array(specDefinitionSchema).min(1),
});

export const personalityDefinitionSchema = z
  .object({
    id: personalityIdSchema,
    name: localizedTextSchema,
    benefit: localizedTextSchema,
    drawback: localizedTextSchema,
    legacyBehaviorId: brandedContentIdSchema<"PersonalityBehaviorId">(),
  })
  .strict();

export const personalityDefinitionFileSchema = contentFileBaseSchema.safeExtend({
  personalities: z.array(personalityDefinitionSchema).min(1),
});

export const namePartsFileSchema = contentFileBaseSchema.safeExtend({
  locale: z.literal("zh-CN"),
  first: z.array(z.string().trim().min(1)).min(1),
  second: z.array(z.string().trim().min(1)).min(1),
});

export const hiddenCharacterDefinitionSchema = z
  .object({
    id: hiddenCharacterIdSchema,
    name: localizedTextSchema,
    classId: classIdSchema,
    specId: specIdSchema,
    personalityId: personalityIdSchema,
    appearance: z
      .object({
        chance: probabilitySchema,
        uniquePerSave: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const hiddenCharacterDefinitionFileSchema = contentFileBaseSchema.safeExtend({
  hiddenCharacters: z.array(hiddenCharacterDefinitionSchema).min(1),
});

export type RoleDefinition = z.infer<typeof roleDefinitionSchema>;
export type ClassDefinition = z.infer<typeof classDefinitionSchema>;
export type RaceDefinition = z.infer<typeof raceDefinitionSchema>;
export type SpecDefinition = z.infer<typeof specDefinitionSchema>;
export type PersonalityDefinition = z.infer<typeof personalityDefinitionSchema>;
export type HiddenCharacterDefinition = z.infer<typeof hiddenCharacterDefinitionSchema>;
export type NamePartsFile = z.infer<typeof namePartsFileSchema>;
