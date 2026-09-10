import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadContentRegistry } from "../src/content/registry";
import type { RawContentModules } from "../src/content/loader";
import { auditDungeonContent, renderDungeonContentAudit } from "./dungeon-content-audit";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const contentRoot = path.join(projectRoot, "content");
const reportPath = path.join(projectRoot, "docs/generated/dungeon-content-audit.md");

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
const report = renderDungeonContentAudit(
  auditDungeonContent(loadContentRegistry(readContentModules())),
);
if (mode === "--write") {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  console.log(`已更新 ${path.relative(projectRoot, reportPath)}`);
} else if (mode === "--check") {
  if (fs.existsSync(reportPath)) {
    assert.equal(
      fs.readFileSync(reportPath, "utf8"),
      report,
      "副本内容审计报告已变化；请显式运行 npm run dungeon-content:audit:write。",
    );
  }
  console.log("副本内容完整度审计通过。");
} else {
  throw new Error(`未知参数：${mode}`);
}
