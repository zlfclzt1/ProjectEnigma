import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadContentRegistry } from "../src/content/registry";
import type { RawContentModules } from "../src/content/loader";
import { buildProgressionBaseline } from "./progression-simulation";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const contentRoot = path.join(projectRoot, "content");
const fixturePath = path.join(projectRoot, "tests/fixtures/progression-baseline.json");

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

const output = buildProgressionBaseline(loadContentRegistry(readContentModules()));
const serialized = `${JSON.stringify(output, null, 2)}\n`;
if (process.argv.includes("--write")) {
  fs.writeFileSync(fixturePath, serialized);
  console.log(`已更新 ${path.relative(projectRoot, fixturePath)}。`);
} else if (process.argv.includes("--check")) {
  assert.equal(
    fs.readFileSync(fixturePath, "utf8"),
    serialized,
    "10–45 级进度基线已漂移；请核对后显式运行 npm run progression:baseline:write。",
  );
  console.log("10–45 级进度基线一致：当前四副本会在达到目标等级前触及内容上限。");
} else {
  console.log(serialized);
}
