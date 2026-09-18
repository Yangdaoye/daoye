import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("install copies the skill, scripts, and banners the stock skill once", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "c2c-install-"));
  const stockDir = path.join(home, ".codex", "skills", "codex-with-chatgpt");
  fs.mkdirSync(stockDir, { recursive: true });
  fs.writeFileSync(
    path.join(stockDir, "SKILL.md"),
    `---\nname: codex-with-chatgpt\n---\n\n# Stock\n`,
    "utf8"
  );

  const env = { ...process.env, HOME: home, USERPROFILE: home };
  const first = await execFileAsync(process.execPath, [path.join(repoRoot, "scripts", "install.mjs")], { env });
  const payload = JSON.parse(first.stdout);
  assert.equal(payload.ok, true);
  assert.equal(fs.existsSync(path.join(payload.skillDir, "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(payload.skillDir, "scripts", "ensure-connected.mjs")), true);
  assert.equal(fs.existsSync(path.join(payload.skillDir, "scripts", "lib", "ensure.mjs")), true);
  const installedSkill = fs.readFileSync(path.join(payload.skillDir, "SKILL.md"), "utf8");
  assert.match(installedSkill, new RegExp(payload.skillDir.replaceAll("\\", "\\\\")));
  assert.doesNotMatch(installedSkill, /<SKILL_ROOT>/);

  const stock = fs.readFileSync(path.join(stockDir, "SKILL.md"), "utf8");
  assert.match(stock, /C2C_STABLE_CONNECT_BANNER/);
  assert.match(stock, /codex-chatgpt-connect/);

  const second = await execFileAsync(process.execPath, [path.join(repoRoot, "scripts", "install.mjs")], { env });
  const again = JSON.parse(second.stdout);
  assert.equal(again.banner.alreadyPresent, true);
  const stockAgain = fs.readFileSync(path.join(stockDir, "SKILL.md"), "utf8");
  assert.equal(stockAgain.split("C2C_STABLE_CONNECT_BANNER").length - 1, 1);
});
