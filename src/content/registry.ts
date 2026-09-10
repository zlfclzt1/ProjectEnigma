import {
  ContentValidationError,
  loadContentModules,
  type ContentValidationIssue,
  type LoadedContent,
  type LocatedContent,
  type RawContentModules,
} from "./loader";
import type { DungeonDefinition, EncounterDefinition, LootTable } from "./schemas/dungeon";
import type { CollectionRewardDefinition } from "./schemas/collection-reward";
import type { ItemDefinition } from "./schemas/item";
import type { ItemSetDefinition } from "./schemas/item-set";
import type { ItemSuffixDefinition } from "./schemas/item-suffix";
import type { GuildUpgradeDefinition } from "./schemas/guild-upgrade";
import type { LogTemplateGroup } from "./schemas/log-template";
import type {
  ClassDefinition,
  HiddenCharacterDefinition,
  NamePoolFile,
  PersonalityDefinition,
  RaceDefinition,
  RoleDefinition,
  SpecDefinition,
} from "./schemas/member-definitions";
import type { CombatProfileDefinition } from "./schemas/combat-profile";
import type { CapabilityDefinition } from "./schemas/capability";
import type { MechanicDefinition } from "./schemas/mechanic";
import type { SpecCapabilityProgression } from "./schemas/spec-capability";

class ReadonlyMapView<Key, Value> implements ReadonlyMap<Key, Value> {
  readonly #source: Map<Key, Value>;

  constructor(source: Map<Key, Value>) {
    this.#source = source;
    Object.freeze(this);
  }

  get size(): number {
    return this.#source.size;
  }

  get(key: Key): Value | undefined {
    return this.#source.get(key);
  }

  has(key: Key): boolean {
    return this.#source.has(key);
  }

  forEach(callback: (value: Value, key: Key, map: ReadonlyMap<Key, Value>) => void): void {
    this.#source.forEach((value, key) => callback(value, key, this));
  }

  entries(): MapIterator<[Key, Value]> {
    return this.#source.entries();
  }

  keys(): MapIterator<Key> {
    return this.#source.keys();
  }

  values(): MapIterator<Value> {
    return this.#source.values();
  }

  [Symbol.iterator](): MapIterator<[Key, Value]> {
    return this.entries();
  }
}

function readonlyMap<Key, Value>(source: Map<Key, Value>): ReadonlyMap<Key, Value> {
  return new ReadonlyMapView(source);
}

function buildIndex<Value extends { readonly id: string }>(
  entries: readonly LocatedContent<Value>[],
  issues: ContentValidationIssue[],
  categoryLabel: string,
): Map<Value["id"], Value> {
  const index = new Map<Value["id"], Value>();
  const locations = new Map<Value["id"], LocatedContent<Value>>();
  for (const entry of entries) {
    const existing = locations.get(entry.value.id);
    if (existing) {
      issues.push({
        filePath: entry.filePath,
        fieldPath: `${entry.fieldPath}.id`,
        message: `${categoryLabel} ID 重复；首次定义位于 ${existing.filePath}:${existing.fieldPath}.id`,
        invalidReferenceId: entry.value.id,
      });
      continue;
    }
    locations.set(entry.value.id, entry);
    index.set(entry.value.id, entry.value);
  }
  return index;
}

function requireReference<Key>(
  index: ReadonlyMap<Key, unknown>,
  id: Key,
  owner: LocatedContent<unknown>,
  referencePath: string,
  label: string,
  issues: ContentValidationIssue[],
): boolean {
  if (index.has(id)) return true;
  issues.push({
    filePath: owner.filePath,
    fieldPath: `${owner.fieldPath}.${referencePath}`,
    message: `引用了不存在的${label}`,
    invalidReferenceId: String(id),
  });
  return false;
}

function validateUnlockCycles(
  dungeons: readonly LocatedContent<DungeonDefinition>[],
  dungeonById: ReadonlyMap<DungeonDefinition["id"], DungeonDefinition>,
  issues: ContentValidationIssue[],
): void {
  interface UnlockEdge {
    readonly to: DungeonDefinition["id"];
    readonly owner: LocatedContent<DungeonDefinition>;
    readonly fieldPath: string;
  }
  const edges = new Map<DungeonDefinition["id"], UnlockEdge[]>();
  for (const owner of dungeons) {
    const unlock = owner.value.unlock;
    if (!unlock) continue;
    const fields = [
      ["requiredDungeonIds", unlock.requiredDungeonIds ?? []],
      ["requiredAnyDungeonIds", unlock.requiredAnyDungeonIds ?? []],
    ] as const;
    for (const [field, ids] of fields) {
      ids.forEach((id, index) => {
        const current = edges.get(owner.value.id) ?? [];
        current.push({ to: id, owner, fieldPath: `unlock.${field}[${index}]` });
        edges.set(owner.value.id, current);
      });
    }
  }

  const states = new Map<DungeonDefinition["id"], "visiting" | "visited">();
  const stack: DungeonDefinition["id"][] = [];
  const visit = (id: DungeonDefinition["id"]): void => {
    states.set(id, "visiting");
    stack.push(id);
    for (const edge of edges.get(id) ?? []) {
      if (!dungeonById.has(edge.to)) continue;
      if (states.get(edge.to) === "visiting") {
        const start = stack.indexOf(edge.to);
        issues.push({
          filePath: edge.owner.filePath,
          fieldPath: `${edge.owner.fieldPath}.${edge.fieldPath}`,
          message: `副本解锁关系存在循环：${[...stack.slice(start), edge.to].join(" -> ")}`,
          invalidReferenceId: edge.to,
        });
      } else if (!states.has(edge.to)) {
        visit(edge.to);
      }
    }
    stack.pop();
    states.set(id, "visited");
  };

  for (const id of dungeonById.keys()) if (!states.has(id)) visit(id);
}

function validateDisplayNames(loaded: LoadedContent, issues: ContentValidationIssue[]): void {
  const named: readonly LocatedContent<{ readonly name: { readonly zhCN: string } }>[] = [
    ...loaded.roles,
    ...loaded.classes,
    ...loaded.races,
    ...loaded.specs,
    ...loaded.personalities,
    ...loaded.hiddenCharacters,
    ...loaded.guildUpgrades,
    ...loaded.items,
    ...loaded.itemSets,
    ...loaded.collectionRewards,
    ...loaded.dungeons,
    ...loaded.encounters,
    ...loaded.capabilities,
    ...loaded.mechanics,
  ];
  for (const entry of named) {
    if (entry.value.name.zhCN.includes("测试装备")) {
      issues.push({
        filePath: entry.filePath,
        fieldPath: `${entry.fieldPath}.name.zhCN`,
        message: "中文展示名称包含测试占位符“测试装备”",
      });
    }
  }
}

export class ContentRegistry {
  readonly capabilities: readonly CapabilityDefinition[];
  readonly roles: readonly RoleDefinition[];
  readonly classes: readonly ClassDefinition[];
  readonly races: readonly RaceDefinition[];
  readonly specs: readonly SpecDefinition[];
  readonly combatProfiles: readonly CombatProfileDefinition[];
  readonly personalities: readonly PersonalityDefinition[];
  readonly namePools: readonly NamePoolFile[];
  readonly hiddenCharacters: readonly HiddenCharacterDefinition[];
  readonly guildUpgrades: readonly GuildUpgradeDefinition[];
  readonly items: readonly ItemDefinition[];
  readonly itemSets: readonly ItemSetDefinition[];
  readonly itemSuffixes: readonly ItemSuffixDefinition[];
  readonly collectionRewards: readonly CollectionRewardDefinition[];
  readonly dungeons: readonly DungeonDefinition[];
  readonly encounters: readonly EncounterDefinition[];
  readonly lootTables: readonly LootTable[];
  readonly logTemplates: readonly LogTemplateGroup[];
  readonly mechanics: readonly MechanicDefinition[];
  readonly specCapabilities: readonly SpecCapabilityProgression[];

  readonly roleById: ReadonlyMap<RoleDefinition["id"], RoleDefinition>;
  readonly capabilityById: ReadonlyMap<CapabilityDefinition["id"], CapabilityDefinition>;
  readonly classById: ReadonlyMap<ClassDefinition["id"], ClassDefinition>;
  readonly raceById: ReadonlyMap<RaceDefinition["id"], RaceDefinition>;
  readonly specById: ReadonlyMap<SpecDefinition["id"], SpecDefinition>;
  readonly combatProfileById: ReadonlyMap<CombatProfileDefinition["id"], CombatProfileDefinition>;
  readonly personalityById: ReadonlyMap<PersonalityDefinition["id"], PersonalityDefinition>;
  readonly hiddenCharacterById: ReadonlyMap<
    HiddenCharacterDefinition["id"],
    HiddenCharacterDefinition
  >;
  readonly guildUpgradeById: ReadonlyMap<GuildUpgradeDefinition["id"], GuildUpgradeDefinition>;
  readonly itemById: ReadonlyMap<ItemDefinition["id"], ItemDefinition>;
  readonly itemSetById: ReadonlyMap<ItemSetDefinition["id"], ItemSetDefinition>;
  readonly itemSuffixById: ReadonlyMap<ItemSuffixDefinition["id"], ItemSuffixDefinition>;
  readonly collectionRewardById: ReadonlyMap<
    CollectionRewardDefinition["id"],
    CollectionRewardDefinition
  >;
  readonly dungeonById: ReadonlyMap<DungeonDefinition["id"], DungeonDefinition>;
  readonly encounterById: ReadonlyMap<EncounterDefinition["id"], EncounterDefinition>;
  readonly lootTableById: ReadonlyMap<LootTable["id"], LootTable>;
  readonly logTemplateById: ReadonlyMap<LogTemplateGroup["id"], LogTemplateGroup>;
  readonly mechanicById: ReadonlyMap<MechanicDefinition["id"], MechanicDefinition>;
  readonly specCapabilityById: ReadonlyMap<
    SpecCapabilityProgression["id"],
    SpecCapabilityProgression
  >;
  readonly namePoolByLocale: ReadonlyMap<NamePoolFile["locale"], NamePoolFile>;

  constructor(loaded: LoadedContent) {
    const issues: ContentValidationIssue[] = [];
    const capabilityById = buildIndex(loaded.capabilities, issues, "队伍能力");
    const roleById = buildIndex(loaded.roles, issues, "定位");
    const classById = buildIndex(loaded.classes, issues, "职业");
    const raceById = buildIndex(loaded.races, issues, "种族");
    const specById = buildIndex(loaded.specs, issues, "专精");
    const combatProfileById = buildIndex(loaded.combatProfiles, issues, "战斗配置");
    const personalityById = buildIndex(loaded.personalities, issues, "性格");
    const hiddenCharacterById = buildIndex(loaded.hiddenCharacters, issues, "隐藏角色");
    const guildUpgradeById = buildIndex(loaded.guildUpgrades, issues, "公会升级");
    const itemById = buildIndex(loaded.items, issues, "物品");
    const itemSetById = buildIndex(loaded.itemSets, issues, "套装");
    const itemSuffixById = buildIndex(loaded.itemSuffixes, issues, "随机词缀");
    const collectionRewardById = buildIndex(loaded.collectionRewards, issues, "收藏奖励");
    const dungeonById = buildIndex(loaded.dungeons, issues, "副本");
    const encounterById = buildIndex(loaded.encounters, issues, "首领战");
    const lootTableById = buildIndex(loaded.lootTables, issues, "掉落表");
    const logTemplateById = buildIndex(loaded.logTemplates, issues, "日志模板");
    const mechanicById = buildIndex(loaded.mechanics, issues, "首领机制");
    const specCapabilityById = buildIndex(loaded.specCapabilities, issues, "专精能力成长");
    const namePoolByLocale = new Map<NamePoolFile["locale"], NamePoolFile>();
    for (const entry of loaded.namePools) {
      if (namePoolByLocale.has(entry.value.locale)) {
        issues.push({
          filePath: entry.filePath,
          fieldPath: "locale",
          message: "随机姓名语言重复",
          invalidReferenceId: entry.value.locale,
        });
      } else namePoolByLocale.set(entry.value.locale, entry.value);
    }

    this.validateMemberReferences(
      loaded,
      roleById,
      classById,
      raceById,
      specById,
      combatProfileById,
      personalityById,
      issues,
    );
    this.validateItemReferences(loaded, roleById, classById, itemSuffixById, issues);
    this.validateCollectionReferences(loaded, itemById, itemSetById, dungeonById, issues);
    this.validateDungeonReferences(
      loaded,
      dungeonById,
      encounterById,
      lootTableById,
      itemById,
      mechanicById,
      issues,
    );
    this.validateMechanicReferences(loaded, capabilityById, issues);
    this.validateSpecCapabilityReferences(
      loaded,
      specById,
      capabilityById,
      specCapabilityById,
      issues,
    );
    this.validateGuildUpgradeReferences(loaded, dungeonById, issues);
    this.validateLogReferences(loaded, dungeonById, encounterById, issues);
    validateUnlockCycles(loaded.dungeons, dungeonById, issues);
    validateDisplayNames(loaded, issues);
    if (issues.length > 0) throw new ContentValidationError(issues);

    this.capabilities = Object.freeze(loaded.capabilities.map(({ value }) => value));
    this.roles = Object.freeze(loaded.roles.map(({ value }) => value));
    this.classes = Object.freeze(loaded.classes.map(({ value }) => value));
    this.races = Object.freeze(loaded.races.map(({ value }) => value));
    this.specs = Object.freeze(loaded.specs.map(({ value }) => value));
    this.combatProfiles = Object.freeze(loaded.combatProfiles.map(({ value }) => value));
    this.personalities = Object.freeze(loaded.personalities.map(({ value }) => value));
    this.namePools = Object.freeze(loaded.namePools.map(({ value }) => value));
    this.hiddenCharacters = Object.freeze(loaded.hiddenCharacters.map(({ value }) => value));
    this.guildUpgrades = Object.freeze(loaded.guildUpgrades.map(({ value }) => value));
    this.items = Object.freeze(loaded.items.map(({ value }) => value));
    this.itemSets = Object.freeze(loaded.itemSets.map(({ value }) => value));
    this.itemSuffixes = Object.freeze(loaded.itemSuffixes.map(({ value }) => value));
    this.collectionRewards = Object.freeze(loaded.collectionRewards.map(({ value }) => value));
    this.dungeons = Object.freeze(loaded.dungeons.map(({ value }) => value));
    this.encounters = Object.freeze(loaded.encounters.map(({ value }) => value));
    this.lootTables = Object.freeze(loaded.lootTables.map(({ value }) => value));
    this.logTemplates = Object.freeze(loaded.logTemplates.map(({ value }) => value));
    this.mechanics = Object.freeze(loaded.mechanics.map(({ value }) => value));
    this.specCapabilities = Object.freeze(loaded.specCapabilities.map(({ value }) => value));
    this.capabilityById = readonlyMap(capabilityById);
    this.roleById = readonlyMap(roleById);
    this.classById = readonlyMap(classById);
    this.raceById = readonlyMap(raceById);
    this.specById = readonlyMap(specById);
    this.combatProfileById = readonlyMap(combatProfileById);
    this.personalityById = readonlyMap(personalityById);
    this.hiddenCharacterById = readonlyMap(hiddenCharacterById);
    this.guildUpgradeById = readonlyMap(guildUpgradeById);
    this.itemById = readonlyMap(itemById);
    this.itemSetById = readonlyMap(itemSetById);
    this.itemSuffixById = readonlyMap(itemSuffixById);
    this.collectionRewardById = readonlyMap(collectionRewardById);
    this.dungeonById = readonlyMap(dungeonById);
    this.encounterById = readonlyMap(encounterById);
    this.lootTableById = readonlyMap(lootTableById);
    this.logTemplateById = readonlyMap(logTemplateById);
    this.mechanicById = readonlyMap(mechanicById);
    this.specCapabilityById = readonlyMap(specCapabilityById);
    this.namePoolByLocale = readonlyMap(namePoolByLocale);
    Object.freeze(this);
  }

  private validateMemberReferences(
    loaded: LoadedContent,
    roleById: ReadonlyMap<RoleDefinition["id"], RoleDefinition>,
    classById: ReadonlyMap<ClassDefinition["id"], ClassDefinition>,
    raceById: ReadonlyMap<RaceDefinition["id"], RaceDefinition>,
    specById: ReadonlyMap<SpecDefinition["id"], SpecDefinition>,
    combatProfileById: ReadonlyMap<CombatProfileDefinition["id"], CombatProfileDefinition>,
    personalityById: ReadonlyMap<PersonalityDefinition["id"], PersonalityDefinition>,
    issues: ContentValidationIssue[],
  ): void {
    for (const owner of loaded.classes) {
      owner.value.raceIds.forEach((id, index) =>
        requireReference(raceById, id, owner, `raceIds[${index}]`, "种族", issues),
      );
    }
    for (const owner of loaded.specs) {
      requireReference(classById, owner.value.classId, owner, "classId", "职业", issues);
      requireReference(roleById, owner.value.role, owner, "role", "定位", issues);
      const profileExists = requireReference(
        combatProfileById,
        owner.value.combatProfileId,
        owner,
        "combatProfileId",
        "战斗配置",
        issues,
      );
      const profile = combatProfileById.get(owner.value.combatProfileId);
      if (profileExists && profile?.specId !== owner.value.id) {
        issues.push({
          filePath: owner.filePath,
          fieldPath: `${owner.fieldPath}.combatProfileId`,
          message: `战斗配置属于专精 ${profile?.specId}`,
          invalidReferenceId: owner.value.combatProfileId,
        });
      }
      if (profileExists && profile?.role !== owner.value.role) {
        issues.push({
          filePath: owner.filePath,
          fieldPath: `${owner.fieldPath}.combatProfileId`,
          message: `战斗配置定位 ${profile?.role} 与专精定位 ${owner.value.role} 不一致`,
          invalidReferenceId: owner.value.combatProfileId,
        });
      }
    }
    for (const owner of loaded.combatProfiles) {
      const specExists = requireReference(
        specById,
        owner.value.specId,
        owner,
        "specId",
        "专精",
        issues,
      );
      if (specExists && specById.get(owner.value.specId)?.combatProfileId !== owner.value.id) {
        issues.push({
          filePath: owner.filePath,
          fieldPath: `${owner.fieldPath}.id`,
          message: `专精 ${owner.value.specId} 未反向引用此战斗配置`,
          invalidReferenceId: owner.value.id,
        });
      }
    }
    for (const owner of loaded.hiddenCharacters) {
      requireReference(classById, owner.value.classId, owner, "classId", "职业", issues);
      const specExists = requireReference(
        specById,
        owner.value.specId,
        owner,
        "specId",
        "专精",
        issues,
      );
      requireReference(
        personalityById,
        owner.value.personalityId,
        owner,
        "personalityId",
        "性格",
        issues,
      );
      if (specExists && specById.get(owner.value.specId)?.classId !== owner.value.classId) {
        issues.push({
          filePath: owner.filePath,
          fieldPath: `${owner.fieldPath}.specId`,
          message: `隐藏角色专精不属于职业 ${owner.value.classId}`,
          invalidReferenceId: owner.value.specId,
        });
      }
    }
  }

  private validateItemReferences(
    loaded: LoadedContent,
    roleById: ReadonlyMap<RoleDefinition["id"], RoleDefinition>,
    classById: ReadonlyMap<ClassDefinition["id"], ClassDefinition>,
    itemSuffixById: ReadonlyMap<ItemSuffixDefinition["id"], ItemSuffixDefinition>,
    issues: ContentValidationIssue[],
  ): void {
    for (const owner of loaded.items) {
      owner.value.restrictions.allowedClassIds.forEach((id, index) =>
        requireReference(
          classById,
          id,
          owner,
          `restrictions.allowedClassIds[${index}]`,
          "职业",
          issues,
        ),
      );
      owner.value.restrictions.allowedRoles.forEach((id, index) =>
        requireReference(
          roleById,
          id,
          owner,
          `restrictions.allowedRoles[${index}]`,
          "定位",
          issues,
        ),
      );
      owner.value.randomSuffixIds?.forEach((id, index) => {
        const exists = requireReference(
          itemSuffixById,
          id,
          owner,
          `randomSuffixIds[${index}]`,
          "随机词缀",
          issues,
        );
        const suffix = itemSuffixById.get(id);
        if (
          exists &&
          suffix &&
          !suffix.tiers.some(
            (tier) =>
              tier.minimumItemLevel <= owner.value.itemLevel &&
              owner.value.itemLevel <= tier.maximumItemLevel,
          )
        ) {
          issues.push({
            filePath: owner.filePath,
            fieldPath: `${owner.fieldPath}.randomSuffixIds[${index}]`,
            message: `随机词缀 ${id} 没有覆盖物品等级 ${owner.value.itemLevel} 的档位`,
            invalidReferenceId: id,
          });
        }
      });
    }
  }

  private validateGuildUpgradeReferences(
    loaded: LoadedContent,
    dungeonById: ReadonlyMap<DungeonDefinition["id"], DungeonDefinition>,
    issues: ContentValidationIssue[],
  ): void {
    const tracks = new Map<string, LocatedContent<GuildUpgradeDefinition>[]>();
    for (const owner of loaded.guildUpgrades) {
      const track = tracks.get(owner.value.trackId) ?? [];
      track.push(owner);
      tracks.set(owner.value.trackId, track);
      owner.value.requirements.forEach((requirement, index) => {
        if (requirement.type === "dungeon-clear-count") {
          requireReference(
            dungeonById,
            requirement.dungeonId,
            owner,
            `requirements[${index}].dungeonId`,
            "副本",
            issues,
          );
        }
      });
    }

    for (const upgrades of tracks.values()) {
      const orders = new Set<number>();
      let previousCapacity = 0;
      for (const owner of [...upgrades].sort(
        (left, right) => left.value.order - right.value.order,
      )) {
        if (orders.has(owner.value.order)) {
          issues.push({
            filePath: owner.filePath,
            fieldPath: `${owner.fieldPath}.order`,
            message: `升级路线 ${owner.value.trackId} 的顺序重复`,
          });
        }
        orders.add(owner.value.order);
        const capacityEffect = owner.value.effects.find(
          (effect) => effect.type === "member-capacity",
        );
        if (capacityEffect && capacityEffect.value <= previousCapacity) {
          issues.push({
            filePath: owner.filePath,
            fieldPath: `${owner.fieldPath}.effects`,
            message: `升级路线 ${owner.value.trackId} 的成员容量必须严格递增`,
          });
        }
        if (capacityEffect) previousCapacity = capacityEffect.value;
      }
    }
  }

  private validateCollectionReferences(
    loaded: LoadedContent,
    itemById: ReadonlyMap<ItemDefinition["id"], ItemDefinition>,
    itemSetById: ReadonlyMap<ItemSetDefinition["id"], ItemSetDefinition>,
    dungeonById: ReadonlyMap<DungeonDefinition["id"], DungeonDefinition>,
    issues: ContentValidationIssue[],
  ): void {
    for (const owner of loaded.itemSets) {
      owner.value.itemIds.forEach((id, index) =>
        requireReference(itemById, id, owner, `itemIds[${index}]`, "基础物品", issues),
      );
    }
    for (const owner of loaded.collectionRewards) {
      const condition = owner.value.condition;
      if (condition.type === "dungeon-completion") {
        requireReference(
          dungeonById,
          condition.dungeonId,
          owner,
          "condition.dungeonId",
          "副本",
          issues,
        );
      } else if (condition.type === "item-set-completion") {
        requireReference(
          itemSetById,
          condition.itemSetId,
          owner,
          "condition.itemSetId",
          "套装",
          issues,
        );
      }
    }
  }

  private validateDungeonReferences(
    loaded: LoadedContent,
    dungeonById: ReadonlyMap<DungeonDefinition["id"], DungeonDefinition>,
    encounterById: ReadonlyMap<EncounterDefinition["id"], EncounterDefinition>,
    lootTableById: ReadonlyMap<LootTable["id"], LootTable>,
    itemById: ReadonlyMap<ItemDefinition["id"], ItemDefinition>,
    mechanicById: ReadonlyMap<MechanicDefinition["id"], MechanicDefinition>,
    issues: ContentValidationIssue[],
  ): void {
    const routeOwners = new Map<EncounterDefinition["id"], DungeonDefinition["id"][]>();
    for (const owner of loaded.dungeons) {
      const routeIds = new Set<EncounterDefinition["id"]>();
      let stageSeconds = 0;
      owner.value.route.forEach((encounterId, index) => {
        if (routeIds.has(encounterId)) {
          issues.push({
            filePath: owner.filePath,
            fieldPath: `${owner.fieldPath}.route[${index}]`,
            message: "副本路线重复引用同一首领战",
            invalidReferenceId: encounterId,
          });
        }
        routeIds.add(encounterId);
        const owners = routeOwners.get(encounterId) ?? [];
        owners.push(owner.value.id);
        routeOwners.set(encounterId, owners);
        if (
          requireReference(encounterById, encounterId, owner, `route[${index}]`, "首领战", issues)
        ) {
          const encounter = encounterById.get(encounterId)!;
          stageSeconds += encounter.stageSeconds;
          if (encounter.dungeonId !== owner.value.id) {
            issues.push({
              filePath: owner.filePath,
              fieldPath: `${owner.fieldPath}.route[${index}]`,
              message: `首领战属于副本 ${encounter.dungeonId}，不能加入 ${owner.value.id} 的路线`,
              invalidReferenceId: encounterId,
            });
          }
        }
      });
      if (stageSeconds !== owner.value.duration.baseSeconds) {
        issues.push({
          filePath: owner.filePath,
          fieldPath: `${owner.fieldPath}.duration.baseSeconds`,
          message: `路线阶段总时长 ${stageSeconds} 秒与副本基础时长 ${owner.value.duration.baseSeconds} 秒不一致`,
        });
      }
      const unlockFields = [
        ["requiredDungeonIds", owner.value.unlock?.requiredDungeonIds ?? []],
        ["requiredAnyDungeonIds", owner.value.unlock?.requiredAnyDungeonIds ?? []],
      ] as const;
      for (const [field, ids] of unlockFields) {
        ids.forEach((id, index) =>
          requireReference(dungeonById, id, owner, `unlock.${field}[${index}]`, "副本", issues),
        );
      }
    }
    for (const owner of loaded.encounters) {
      requireReference(dungeonById, owner.value.dungeonId, owner, "dungeonId", "副本", issues);
      if (owner.value.lootTableId) {
        requireReference(
          lootTableById,
          owner.value.lootTableId,
          owner,
          "lootTableId",
          "掉落表",
          issues,
        );
      }
      owner.value.mechanicIds.forEach((id, index) =>
        requireReference(mechanicById, id, owner, `mechanicIds[${index}]`, "首领机制", issues),
      );
      const owners = routeOwners.get(owner.value.id) ?? [];
      if (owners.length !== 1) {
        issues.push({
          filePath: owner.filePath,
          fieldPath: `${owner.fieldPath}.id`,
          message:
            owners.length === 0
              ? "首领战未加入任何副本路线"
              : `首领战被多个副本路线引用：${owners.join(", ")}`,
          invalidReferenceId: owner.value.id,
        });
      }
    }
    for (const owner of loaded.lootTables) {
      owner.value.items.forEach((entry, index) =>
        requireReference(itemById, entry.itemId, owner, `items[${index}].itemId`, "物品", issues),
      );
    }
  }

  private validateMechanicReferences(
    loaded: LoadedContent,
    capabilityById: ReadonlyMap<CapabilityDefinition["id"], CapabilityDefinition>,
    issues: ContentValidationIssue[],
  ): void {
    for (const owner of loaded.mechanics) {
      owner.value.requirements.forEach((requirement, index) =>
        requireReference(
          capabilityById,
          requirement.capabilityId,
          owner,
          `requirements[${index}].capabilityId`,
          "队伍能力",
          issues,
        ),
      );
    }
  }

  private validateSpecCapabilityReferences(
    loaded: LoadedContent,
    specById: ReadonlyMap<SpecCapabilityProgression["specId"], unknown>,
    capabilityById: ReadonlyMap<CapabilityDefinition["id"], CapabilityDefinition>,
    progressionById: ReadonlyMap<SpecCapabilityProgression["id"], SpecCapabilityProgression>,
    issues: ContentValidationIssue[],
  ): void {
    const specOwners = new Map<string, LocatedContent<SpecCapabilityProgression>>();
    for (const owner of loaded.specCapabilities) {
      const existing = specOwners.get(owner.value.specId);
      if (existing) {
        issues.push({
          filePath: owner.filePath,
          fieldPath: `${owner.fieldPath}.specId`,
          message: `专精能力成长重复定义；首次定义位于 ${existing.filePath}:${existing.fieldPath}.specId`,
          invalidReferenceId: owner.value.specId,
        });
      } else specOwners.set(owner.value.specId, owner);
      requireReference(specById, owner.value.specId, owner, "specId", "专精", issues);
      owner.value.entries.forEach((entry, index) =>
        requireReference(
          capabilityById,
          entry.capabilityId,
          owner,
          `entries[${index}].capabilityId`,
          "队伍能力",
          issues,
        ),
      );
    }
    for (const spec of loaded.specs) {
      const matches = loaded.specCapabilities.filter(
        (entry) => entry.value.specId === spec.value.id,
      );
      if (matches.length === 0) {
        issues.push({
          filePath: spec.filePath,
          fieldPath: `${spec.fieldPath}.id`,
          message: "专精没有定义能力成长",
          invalidReferenceId: spec.value.id,
        });
      }
    }
    void progressionById;
  }

  private validateLogReferences(
    loaded: LoadedContent,
    dungeonById: ReadonlyMap<DungeonDefinition["id"], DungeonDefinition>,
    encounterById: ReadonlyMap<EncounterDefinition["id"], EncounterDefinition>,
    issues: ContentValidationIssue[],
  ): void {
    for (const owner of loaded.logTemplates) {
      if (owner.value.scope.type === "dungeon") {
        requireReference(
          dungeonById,
          owner.value.scope.dungeonId,
          owner,
          "scope.dungeonId",
          "副本",
          issues,
        );
      } else if (owner.value.scope.type === "encounter") {
        requireReference(
          encounterById,
          owner.value.scope.encounterId,
          owner,
          "scope.encounterId",
          "首领战",
          issues,
        );
      }
    }
  }

  getEncountersForDungeon(id: DungeonDefinition["id"]): readonly EncounterDefinition[] {
    const dungeon = this.dungeonById.get(id);
    if (!dungeon) return [];
    return Object.freeze(dungeon.route.map((encounterId) => this.encounterById.get(encounterId)!));
  }

  getLootTableForEncounter(id: EncounterDefinition["id"]): LootTable | undefined {
    const encounter = this.encounterById.get(id);
    return encounter?.lootTableId ? this.lootTableById.get(encounter.lootTableId) : undefined;
  }

  getRandomSuffixesForItem(id: ItemDefinition["id"]): readonly ItemSuffixDefinition[] {
    const item = this.itemById.get(id);
    return Object.freeze(
      (item?.randomSuffixIds ?? []).map((suffixId) => this.itemSuffixById.get(suffixId)!),
    );
  }
}

export function createContentRegistry(loaded: LoadedContent): ContentRegistry {
  return new ContentRegistry(loaded);
}

export function loadContentRegistry(modules: RawContentModules): ContentRegistry {
  return createContentRegistry(loadContentModules(modules));
}
