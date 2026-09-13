import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RawContentModules } from "../src/content/loader";
import { loadContentRegistry } from "../src/content/registry";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const contentRoot = path.join(projectRoot, "content");

function discoverJsonFiles(directory: string): string[] {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return discoverJsonFiles(filePath);
      return entry.isFile() && entry.name.endsWith(".json") ? [filePath] : [];
    })
    .sort();
}

const modules: RawContentModules = Object.fromEntries(
  discoverJsonFiles(contentRoot).map((filePath) => [
    path.relative(projectRoot, filePath).split(path.sep).join("/"),
    JSON.parse(fs.readFileSync(filePath, "utf8")),
  ]),
);
const content = loadContentRegistry(modules);
const available = content.professions.filter((profession) => profession.status === "available");
const preview = content.professions.filter((profession) => profession.status === "preview");
const issues: string[] = [];

for (const profession of content.professions) {
  if (
    profession.trainingTiers.length !== 4 ||
    profession.trainingTiers.map((tier) => tier.rank).join(",") !== "1,2,3,4"
  ) {
    issues.push(`专业 ${profession.id} 必须完整声明 1–300 四级训练阶梯`);
  }
  if (!profession.facilityId || !content.professionFacilityById.has(profession.facilityId)) {
    issues.push(`专业 ${profession.id} 缺少有效设施引用`);
  }
  if (
    profession.kind === "primary" &&
    !profession.facilityId &&
    profession.status === "available"
  ) {
    issues.push(`可用主专业 ${profession.id} 缺少公会设施引用`);
  }
}
for (const facility of content.professionFacilities) {
  if (!content.professionById.has(facility.professionId)) {
    issues.push(`设施 ${facility.id} 引用了不存在的专业 ${facility.professionId}`);
  }
}
for (const profession of content.professions) {
  if (profession.facilityId) {
    const facility = content.professionFacilityById.get(profession.facilityId);
    if (!facility || facility.professionId !== profession.id) {
      issues.push(`专业 ${profession.id} 与设施 ${profession.facilityId} 绑定不一致`);
    }
  }
}
for (const recipe of content.recipes) {
  if (!content.professionById.has(recipe.professionId))
    issues.push(`配方 ${recipe.id} 引用了不存在的专业 ${recipe.professionId}`);
  if (!content.professionFacilityById.has(recipe.facilityId))
    issues.push(`配方 ${recipe.id} 引用了不存在的设施 ${recipe.facilityId}`);
  for (const input of recipe.input) {
    if (!content.itemById.has(input.itemId))
      issues.push(`配方 ${recipe.id} 缺少输入物品 ${input.itemId}`);
  }
  for (const output of recipe.output) {
    if (
      (output.type === "material-stack" || output.type === "item-instance") &&
      !content.itemById.has(output.itemId)
    ) {
      issues.push(`配方 ${recipe.id} 缺少产出物品 ${output.itemId}`);
    }
    if (
      output.type === "item-instance" &&
      content.itemById.get(output.itemId)?.kind !== "equipment"
    ) {
      issues.push(`配方 ${recipe.id} 的 item-instance 产出不是装备 ${output.itemId}`);
    }
  }
}
for (const site of content.gatheringSites) {
  if (!content.professionById.has(site.professionId))
    issues.push(`采集点 ${site.id} 缺少专业 ${site.professionId}`);
  for (const output of site.outputs)
    if (!content.itemById.has(output.itemId))
      issues.push(`采集点 ${site.id} 缺少产出物品 ${output.itemId}`);
}
const sourceFactFiles = discoverJsonFiles(contentRoot).filter((filePath) =>
  /classic-(mining|blacksmithing|smelting|metals)/.test(path.basename(filePath)),
);
if (sourceFactFiles.length > 0) {
  for (const filePath of sourceFactFiles) {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
      attribution?: { sources?: unknown[] };
    };
    if (!raw.attribution?.sources?.length)
      issues.push(
        `Classic 内容文件缺少 attribution.sources：${path.relative(projectRoot, filePath)}`,
      );
  }
}

if (issues.length > 0) {
  console.error(["专业内容审计失败：", ...issues.map((issue) => `- ${issue}`)].join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    [
      `专业内容审计通过：专业 ${content.professions.length}（可用 ${available.length}、预览 ${preview.length}），设施 ${content.professionFacilities.length}，采集地点 ${content.gatheringSites.length}，配方 ${content.recipes.length}。`,
      `引用审计：配方输入/产出、采集产出、Classic attribution 均已检查。`,
    ].join("\n"),
  );
}
