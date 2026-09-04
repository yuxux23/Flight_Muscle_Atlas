import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { atlasAssetUrl } from "../app/asset-url.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
const TARGET = process.env.ATLAS_PAGES_PACKAGE || (existsSync(join(ROOT, "docs/index.html"))
  ? ROOT : join(ROOT, `outputs/github/IFM-Gene-Network-Atlas-GitHub-v${pkg.version}`));
const SITE = join(TARGET, "docs");
const read = (path) => readFile(join(TARGET, path), "utf8");
const hash = (value) => createHash("sha256").update(value).digest("hex");

test("data URLs resolve inside any Pages repository or root domain", () => {
  for (const base of ["https://research.github.io/", "https://research.github.io/my-atlas/", "https://example.org/nested/atlas/"]) {
    assert.equal(atlasAssetUrl("data/atlas.json", base), `${base}data/atlas.json`);
    assert.equal(atlasAssetUrl("/data/all-pair-correlations.i16", base), `${base}data/all-pair-correlations.i16`);
  }
});

test("published scientific data and complete correlations match the source", async () => {
  const sourceText = await read("public/data/atlas.json");
  const publishedText = await read("docs/data/atlas.json");
  const atlas = JSON.parse(publishedText);
  assert.equal(atlas.meta.localOnly, false);
  assert.equal(hash(publishedText), hash(sourceText.replace(/("localOnly"\s*:\s*)true\b/, "$1false")), "Only the hosting metadata may differ from the source");
  assert.equal(atlas.meta.coreGenes, 2387);
  assert.equal(Object.keys(atlas.gnnPairs).length, 62535);
  assert.equal(atlas.scenicPairs.length, 106881);
  assert.equal(atlas.allPairCorrelations.pairCount, 2847691);
  const buffer = await readFile(join(SITE, "data/all-pair-correlations.i16"));
  assert.equal(hash(buffer), hash(await readFile(join(TARGET, "public/data/all-pair-correlations.i16"))));
  const info = atlas.allPairCorrelations;
  assert.equal(buffer.length, info.pairCount * info.ages.length * 2);
  function pair(a, b) {
    const [low, high] = [info.geneOrder.indexOf(a), info.geneOrder.indexOf(b)].sort((a, b) => a - b);
    assert(low >= 0 && high > low);
    const offset = (low * (2 * info.geneOrder.length - low - 1) / 2 + high - low - 1) * 6;
    return info.ages.map((_, index) => buffer.readInt16LE(offset + index * 2) / info.scale);
  }
  for (const [a, b, expected] of [
    ["Tm1", "sesB", [0.07460886, -0.00665908, 0.02409304]],
    ["fln", "up", [0.3901, 0.0786, 0.0692]],
  ]) pair(a, b).forEach((value, index) => assert(Math.abs(value - expected[index]) <= 1 / info.scale + 0.00005));
});

test("compiled entry uses relative assets and retains every atlas view", async () => {
  const html = await read("docs/index.html");
  assert.match(html, /IFM Gene Network Atlas/);
  assert.doesNotMatch(html, /(?:src|href)=["']\//);
  assert.doesNotMatch(html, /(?:src|href)=["']https?:/);
  assert(existsSync(join(SITE, ".nojekyll")));
  const assets = await readdir(join(SITE, "assets"));
  const javascript = (await Promise.all(assets.filter((f) => f.endsWith(".js")).map((f) => read(`docs/assets/${f}`)))).join("\n");
  for (const label of ["Gene workspace", "Big picture", "Explore", "GNN dynamics", "TF dynamics", "Modules", "Methods", "hdWGCNA co-expression", "Positive GNN r", "Negative GNN r", "SCENIC TF → target", "TF regulon ring", "Genes per group", "Smart labels hide collisions"]) {
    assert(javascript.includes(label), `Missing compiled capability: ${label}`);
  }
  assert.doesNotMatch(javascript, /fetch\(["']\/data\//);
});

test("package includes only uploadable public source/assets and valid checksums", async () => {
  const manifest = JSON.parse(await read("PACKAGE_MANIFEST.json"));
  assert(manifest.files.length + 1 <= 100);
  async function inventory(directory, prefix = "") {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${prefix}${entry.name}`;
      if (entry.isDirectory()) files.push(...await inventory(join(directory, entry.name), `${path}/`));
      else { assert(entry.isFile(), `Unexpected link or special file: ${path}`); files.push(path); }
    }
    return files;
  }
  // Rebuilt asset names change; inspect the current publication folder.
  for (const path of await inventory(SITE)) {
    const bytes = await readFile(join(SITE, path));
    assert(bytes.length < 25 * 1024 ** 2, `${path} exceeds GitHub browser upload limit`);
    assert.doesNotMatch(path, /\.map$/);
  }
  if (process.env.ATLAS_PAGES_PACKAGE) {
    const currentFiles = await inventory(TARGET);
    assert.equal(currentFiles.length, manifest.files.length + 1);
    for (const entry of manifest.files) {
      assert(entry.bytes < 25 * 1024 ** 2, `${entry.path} exceeds GitHub browser upload limit`);
      assert(!/(^|\/)(?:\.git|\.openai|node_modules|\.env[^/]*|worker|db|drizzle|outputs|HDWGCNA_output|GNN_output|SCENIC_output)(\/|$)/.test(entry.path));
      assert.equal(hash(await readFile(join(TARGET, entry.path))), entry.sha256, entry.path);
    }
  }
});

test("static HTTP serving works at root and nested repository paths", async () => {
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".i16": "application/octet-stream" };
  const prefix = "/renamed-repository/";
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, "http://localhost").pathname;
    const filePart = path.startsWith(prefix) ? path.slice(prefix.length) : path.slice(1);
    const pathOnDisk = resolve(SITE, filePart || "index.html");
    if (!pathOnDisk.startsWith(SITE + sep)) { response.writeHead(404).end(); return; }
    try {
      const bytes = await readFile(pathOnDisk);
      response.writeHead(200, { "Content-Type": mime[extname(pathOnDisk)] || "application/octet-stream" });
      response.end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const base of [`${origin}/`, `${origin}${prefix}`]) {
      const home = await fetch(base);
      assert.equal(home.status, 200);
      const html = await home.text();
      for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
        const url = new URL(match[1], base);
        assert(url.href.startsWith(base), `Asset escaped repository: ${url}`);
        const asset = await fetch(url);
        assert.equal(asset.status, 200, url.href);
        if (url.pathname.endsWith(".js")) assert.match(asset.headers.get("content-type"), /javascript/);
        await asset.arrayBuffer();
      }
      const response = await fetch(atlasAssetUrl("data/atlas.json", base));
      assert.equal(response.status, 200);
      const atlas = await response.json();
      const correlations = await fetch(atlasAssetUrl(atlas.allPairCorrelations.file, base));
      assert.equal(correlations.status, 200);
      assert.equal((await correlations.arrayBuffer()).byteLength, atlas.allPairCorrelations.pairCount * 6);
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
