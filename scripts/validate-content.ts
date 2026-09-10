import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ContentValidationError,
  type ContentValidationIssue,
  type RawContentModules,
} from "../src/content/loader";
import { loadContentRegistry } from "../src/content/registry";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const contentRoot = path.join(projectRoot, "content");

function discoverJsonFiles(directory: string): string[] {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return discoverJsonFiles(entryPath);
      return entry.isFile() && entry.name.endsWith(".json") ? [entryPath] : [];
    })
    .sort();
}

function readContentModules(): RawContentModules {
  const modules: Record<string, unknown> = {};
  const issues: ContentValidationIssue[] = [];
  for (const filePath of discoverJsonFiles(contentRoot)) {
    const relativePath = path.relative(projectRoot, filePath).split(path.sep).join("/");
    try {
      modules[relativePath] = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      issues.push({
        filePath: relativePath,
        fieldPath: "$",
        message: `JSON 解析失败：${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  if (issues.length > 0) throw new ContentValidationError(issues);
  return modules;
}

try {
  const modules = readContentModules();
  const registry = loadContentRegistry(modules);
  const counts = [
    `队伍能力 ${registry.capabilities.length}`,
    `职业 ${registry.classes.length}`,
    `种族 ${registry.races.length}`,
    `专精 ${registry.specs.length}`,
    `战斗配置 ${registry.combatProfiles.length}`,
    `性格 ${registry.personalities.length}`,
    `隐藏角色 ${registry.hiddenCharacters.length}`,
    `公会升级 ${registry.guildUpgrades.length}`,
    `物品 ${registry.items.length}`,
    `套装 ${registry.itemSets.length}`,
    `随机词缀 ${registry.itemSuffixes.length}`,
    `收藏奖励 ${registry.collectionRewards.length}`,
    `副本 ${registry.dungeons.length}`,
    `首领战 ${registry.encounters.length}`,
    `掉落表 ${registry.lootTables.length}`,
    `日志模板组 ${registry.logTemplates.length}`,
    `首领机制 ${registry.mechanics.length}`,
    `专精能力成长 ${registry.specCapabilities.length}`,
    `副本任务 ${registry.quests.length}`,
  ].join("，");
  console.log(`内容校验通过：发现 ${Object.keys(modules).length} 个文件；${counts}。`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
