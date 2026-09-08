import type { ZodType } from "zod";
import {
  combatProfileDefinitionFileSchema,
  type CombatProfileDefinition,
} from "./schemas/combat-profile";
import {
  dungeonDefinitionFileSchema,
  encounterDefinitionFileSchema,
  lootTableFileSchema,
  type DungeonDefinition,
  type EncounterDefinition,
  type LootTable,
} from "./schemas/dungeon";
import { itemDefinitionFileSchema, type ItemDefinition } from "./schemas/item";
import { logTemplateFileSchema, type LogTemplateGroup } from "./schemas/log-template";
import {
  classDefinitionFileSchema,
  hiddenCharacterDefinitionFileSchema,
  namePartsFileSchema,
  personalityDefinitionFileSchema,
  raceDefinitionFileSchema,
  roleDefinitionFileSchema,
  specDefinitionFileSchema,
  type ClassDefinition,
  type HiddenCharacterDefinition,
  type NamePartsFile,
  type PersonalityDefinition,
  type RaceDefinition,
  type RoleDefinition,
  type SpecDefinition,
} from "./schemas/member-definitions";

export type RawContentModules = Readonly<Record<string, unknown>>;

export interface ContentValidationIssue {
  readonly filePath: string;
  readonly fieldPath: string;
  readonly message: string;
  readonly invalidReferenceId?: string;
}

export class ContentValidationError extends Error {
  readonly issues: readonly ContentValidationIssue[];

  constructor(issues: readonly ContentValidationIssue[]) {
    const sorted = [...issues].sort((left, right) =>
      `${left.filePath}:${left.fieldPath}:${left.message}`.localeCompare(
        `${right.filePath}:${right.fieldPath}:${right.message}`,
      ),
    );
    super(
      [
        `内容校验失败（${sorted.length} 个问题）：`,
        ...sorted.map((issue) => {
          const reference = issue.invalidReferenceId
            ? `；无效引用 ID: ${issue.invalidReferenceId}`
            : "";
          return `- ${issue.filePath}:${issue.fieldPath}: ${issue.message}${reference}`;
        }),
      ].join("\n"),
    );
    this.name = "ContentValidationError";
    this.issues = Object.freeze(sorted);
  }
}

export interface LocatedContent<T> {
  readonly filePath: string;
  readonly fieldPath: string;
  readonly value: T;
}

export interface LoadedContent {
  readonly roles: readonly LocatedContent<RoleDefinition>[];
  readonly classes: readonly LocatedContent<ClassDefinition>[];
  readonly races: readonly LocatedContent<RaceDefinition>[];
  readonly specs: readonly LocatedContent<SpecDefinition>[];
  readonly combatProfiles: readonly LocatedContent<CombatProfileDefinition>[];
  readonly personalities: readonly LocatedContent<PersonalityDefinition>[];
  readonly nameParts: readonly LocatedContent<NamePartsFile>[];
  readonly hiddenCharacters: readonly LocatedContent<HiddenCharacterDefinition>[];
  readonly items: readonly LocatedContent<ItemDefinition>[];
  readonly dungeons: readonly LocatedContent<DungeonDefinition>[];
  readonly encounters: readonly LocatedContent<EncounterDefinition>[];
  readonly lootTables: readonly LocatedContent<LootTable>[];
  readonly logTemplates: readonly LocatedContent<LogTemplateGroup>[];
}

type MutableLoadedContent = {
  -readonly [Key in keyof LoadedContent]: Array<LoadedContent[Key][number]>;
};

interface FileDescriptor {
  readonly schema: ZodType;
  readonly collection: keyof MutableLoadedContent;
  readonly property: string;
}

const DIRECTORY_DESCRIPTORS: Readonly<Record<string, FileDescriptor>> = {
  "combat-profiles": {
    schema: combatProfileDefinitionFileSchema,
    collection: "combatProfiles",
    property: "combatProfiles",
  },
  specs: { schema: specDefinitionFileSchema, collection: "specs", property: "specs" },
  races: { schema: raceDefinitionFileSchema, collection: "races", property: "races" },
  personalities: {
    schema: personalityDefinitionFileSchema,
    collection: "personalities",
    property: "personalities",
  },
  names: { schema: namePartsFileSchema, collection: "nameParts", property: "$file" },
  "hidden-characters": {
    schema: hiddenCharacterDefinitionFileSchema,
    collection: "hiddenCharacters",
    property: "hiddenCharacters",
  },
  items: { schema: itemDefinitionFileSchema, collection: "items", property: "items" },
  dungeons: {
    schema: dungeonDefinitionFileSchema,
    collection: "dungeons",
    property: "dungeons",
  },
  encounters: {
    schema: encounterDefinitionFileSchema,
    collection: "encounters",
    property: "encounters",
  },
  "loot-tables": {
    schema: lootTableFileSchema,
    collection: "lootTables",
    property: "lootTables",
  },
  logs: { schema: logTemplateFileSchema, collection: "logTemplates", property: "groups" },
};

function emptyLoadedContent(): MutableLoadedContent {
  return {
    roles: [],
    classes: [],
    races: [],
    specs: [],
    combatProfiles: [],
    personalities: [],
    nameParts: [],
    hiddenCharacters: [],
    items: [],
    dungeons: [],
    encounters: [],
    lootTables: [],
    logTemplates: [],
  };
}

export function normalizeContentPath(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  const contentIndex = normalized.lastIndexOf("/content/");
  if (contentIndex >= 0) return normalized.slice(contentIndex + 1);
  return normalized.replace(/^(\.\.\/)+/, "").replace(/^\.\//, "");
}

function formatFieldPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return "$";
  return path.reduce<string>((result, segment) => {
    if (typeof segment === "number") return `${result}[${segment}]`;
    return result ? `${result}.${String(segment)}` : String(segment);
  }, "");
}

function descriptorFor(filePath: string, raw: unknown): FileDescriptor | undefined {
  const segments = filePath.split("/");
  const contentIndex = segments.lastIndexOf("content");
  const directory = contentIndex >= 0 ? segments[contentIndex + 1] : undefined;
  if (directory === "classes") {
    if (typeof raw === "object" && raw !== null && "roles" in raw) {
      return { schema: roleDefinitionFileSchema, collection: "roles", property: "roles" };
    }
    return { schema: classDefinitionFileSchema, collection: "classes", property: "classes" };
  }
  return directory ? DIRECTORY_DESCRIPTORS[directory] : undefined;
}

function appendParsedFile(
  output: MutableLoadedContent,
  descriptor: FileDescriptor,
  parsed: unknown,
  filePath: string,
): void {
  const collection = output[descriptor.collection] as LocatedContent<unknown>[];
  if (descriptor.property === "$file") {
    collection.push({ filePath, fieldPath: "$", value: parsed });
    return;
  }
  const values = (parsed as Record<string, unknown>)[descriptor.property] as unknown[];
  values.forEach((value, index) => {
    collection.push({ filePath, fieldPath: `${descriptor.property}[${index}]`, value });
  });
}

export function loadContentModules(modules: RawContentModules): LoadedContent {
  const output = emptyLoadedContent();
  const issues: ContentValidationIssue[] = [];

  for (const [rawPath, raw] of Object.entries(modules).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const filePath = normalizeContentPath(rawPath);
    const descriptor = descriptorFor(filePath, raw);
    if (!descriptor) {
      issues.push({ filePath, fieldPath: "$", message: "无法识别内容文件所属分类" });
      continue;
    }
    const result = descriptor.schema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          filePath,
          fieldPath: formatFieldPath(issue.path),
          message: issue.message,
        });
      }
      continue;
    }
    appendParsedFile(output, descriptor, result.data, filePath);
  }

  if (issues.length > 0) throw new ContentValidationError(issues);
  return Object.fromEntries(
    Object.entries(output).map(([key, values]) => [key, Object.freeze(values)]),
  ) as unknown as LoadedContent;
}
