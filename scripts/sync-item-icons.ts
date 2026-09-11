import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT_DIRECTORY = path.join(ROOT, "content", "items");
const OUTPUT_DIRECTORY = path.join(ROOT, "public", "assets", "item-icons");
const MANIFEST_PATH = path.join(OUTPUT_DIRECTORY, "manifest.json");
const ICON_ORIGIN = "https://wow.zamimg.com/images/wow/icons/large";
const EXPECTED_ITEM_COUNT = 572;
const EXPECTED_ICON_COUNT = 338;
const checkOnly = process.argv.includes("--check");

interface ItemFile {
  items?: Array<{ icon?: { kind?: string; name?: string } }>;
}

async function inventory(): Promise<{ names: string[]; itemCount: number }> {
  const files = (await readdir(CONTENT_DIRECTORY)).filter((file) => file.endsWith(".json"));
  const names = new Set<string>();
  let itemCount = 0;
  for (const file of files) {
    const contents = JSON.parse(
      await readFile(path.join(CONTENT_DIRECTORY, file), "utf8"),
    ) as ItemFile;
    for (const item of contents.items ?? []) {
      itemCount += 1;
      if (item.icon?.kind !== "database" || !item.icon.name) continue;
      const name = item.icon.name.toLowerCase();
      if (!/^[a-z0-9_]+$/.test(name)) {
        throw new Error(`Invalid database icon name: ${item.icon.name}`);
      }
      names.add(name);
    }
  }
  return { names: [...names].sort(), itemCount };
}

async function validateJpeg(file: string): Promise<{ bytes: number; sha256: string }> {
  const data = await readFile(file);
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    throw new Error(`Not a JPEG file: ${path.relative(ROOT, file)}`);
  }
  return { bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
}

async function main(): Promise<void> {
  const { names, itemCount } = await inventory();
  if (itemCount !== EXPECTED_ITEM_COUNT || names.length !== EXPECTED_ICON_COUNT) {
    throw new Error(
      `Unexpected item icon inventory: ${itemCount} items, ${names.length} unique icons`,
    );
  }
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  const missing: string[] = [];
  for (const name of names) {
    const destination = path.join(OUTPUT_DIRECTORY, `${name}.jpg`);
    try {
      await stat(destination);
    } catch {
      missing.push(name);
    }
  }

  if (checkOnly && missing.length > 0) {
    throw new Error(
      `Missing ${missing.length} local item icons: ${missing.slice(0, 12).join(", ")}`,
    );
  }

  for (const [index, name] of missing.entries()) {
    const response = await fetch(`${ICON_ORIGIN}/${name}.jpg`, {
      headers: { "User-Agent": "ProjectEnigma item icon sync" },
    });
    if (!response.ok) throw new Error(`Failed to download ${name}: HTTP ${response.status}`);
    await writeFile(
      path.join(OUTPUT_DIRECTORY, `${name}.jpg`),
      Buffer.from(await response.arrayBuffer()),
    );
    process.stdout.write(`Downloaded ${index + 1}/${missing.length}: ${name}\n`);
  }

  const icons = [];
  for (const name of names) {
    const metadata = await validateJpeg(path.join(OUTPUT_DIRECTORY, `${name}.jpg`));
    icons.push({ name, file: `${name}.jpg`, ...metadata });
  }

  const manifest = {
    schemaVersion: 1,
    source: `${ICON_ORIGIN}/<icon-name>.jpg`,
    generatedAt: "2026-09-11",
    itemCount,
    count: icons.length,
    icons,
  };
  if (!checkOnly) {
    await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  } else {
    const committed = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as typeof manifest;
    if (
      committed.count !== manifest.count ||
      JSON.stringify(committed.icons) !== JSON.stringify(icons)
    ) {
      throw new Error("Item icon manifest is stale; run npm run item-icons:sync");
    }
  }

  process.stdout.write(`Verified ${itemCount} items and ${names.length} unique local icons.\n`);
}

await main();
