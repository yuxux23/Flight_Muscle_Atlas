import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, process.env.GITHUB_PAGES_OUT_DIR || "dist/github");

export default defineConfig({
  root: resolve(root, "github"),
  base: "./",
  publicDir: resolve(root, "public"),
  css: { postcss: root },
  plugins: [
    react(),
    {
      name: "atlas-github-pages-metadata",
      apply: "build",
      async closeBundle() {
        const path = resolve(outDir, "data/atlas.json");
        const text = await readFile(path, "utf8");
        if (typeof JSON.parse(text).meta.localOnly !== "boolean") {
          throw new Error("Expected the atlas source-provenance flag");
        }
        // Preserve every numeric token (including signed zero) byte-for-byte.
        await writeFile(path, text.replace(/("localOnly"\s*:\s*)true\b/, "$1false"));
        await writeFile(resolve(outDir, ".nojekyll"), "");
      },
    },
  ],
  build: { outDir, emptyOutDir: true, sourcemap: false },
});
