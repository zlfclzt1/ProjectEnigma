import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadContentRegistry } from "../src/content/registry";
import type { RawContentModules } from "../src/content/loader";
import { auditLootSources, renderLootSourceAudit } from "./loot-source-audit";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const contentRoot = path.join(projectRoot, "content");
const reportPath = path.join(projectRoot, "docs/generated/current-loot-source-audit.md");

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
  return Object.fromEntries(
    discoverJsonFiles(contentRoot).map((filePath) => [
      path.relative(projectRoot, filePath).split(path.sep).join("/"),
      JSON.parse(fs.readFileSync(filePath, "utf8")),
    ]),
  );
}

const mode = process.argv[2] ?? "--check";
const report = renderLootSourceAudit(auditLootSources(loadContentRegistry(readContentModules())));
if (mode === "--write") {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  console.log(`已更新 ${path.relative(projectRoot, reportPath)}`);
} else if (mode === "--check") {
  assert.equal(
    fs.readFileSync(reportPath, "utf8"),
    report,
    "掉落来源审计报告已变化；请显式运行 npm run loot-sources:audit:write。",
  );
  console.log("掉落来源审计通过：当前副本的 Boss、任务与占位来源已分类。");
} else {
  throw new Error(`未知参数：${mode}`);
}
