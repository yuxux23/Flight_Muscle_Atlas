import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const result = spawnSync(process.execPath, [cli, "build", "--config", "vite.github.config.ts"], { cwd: root, stdio: "inherit", env: { ...process.env, GITHUB_PAGES_OUT_DIR: "docs" } });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
