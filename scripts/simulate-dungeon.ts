import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { asBrandedId } from "../src/domain/shared/ids";
import { loadContentFromDisk, simulateDungeon } from "./dungeon-balance-simulation";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const dungeonId =
  process.argv.find((argument) => argument.startsWith("--dungeon="))?.split("=")[1] ??
  process.argv[2];
if (!dungeonId || dungeonId.startsWith("--")) {
  throw new Error(
    "用法：npm run simulate:dungeon -- --dungeon=<dungeon-id> [--samples=10000] [--write|--check]",
  );
}
const samples = Number(
  process.argv.find((argument) => argument.startsWith("--samples="))?.split("=")[1] ?? 10_000,
);
if (!Number.isInteger(samples) || samples <= 0) throw new Error("--samples 必须是正整数。");
const outputPath = path.join(projectRoot, "tests/fixtures/dungeon-balance", `${dungeonId}.json`);
const output = `${JSON.stringify(
  simulateDungeon(loadContentFromDisk(), asBrandedId<"DungeonId">(dungeonId), samples, "cli"),
  null,
  2,
)}\n`;
if (process.argv.includes("--write")) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(`已写入 ${path.relative(projectRoot, outputPath)}。`);
} else if (process.argv.includes("--check")) {
  if (fs.readFileSync(outputPath, "utf8") !== output) {
    throw new Error("副本平衡 fixture 已漂移，请核对后执行 --write。");
  }
  console.log(`${dungeonId} 副本平衡 fixture 一致。`);
} else {
  console.log(output);
}
