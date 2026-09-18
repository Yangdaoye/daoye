#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, printJson } from "./lib/args.mjs";
import { locateC2c, skillInstallDir, stockSkillPath } from "./lib/paths.mjs";

const BANNER_MARK = "C2C_STABLE_CONNECT_BANNER";
const BANNER = `<!-- ${BANNER_MARK}
连接由 Skill \`codex-chatgpt-connect\` 处理。不要走本文件的 setup / doctor / reconnect。
用户说「使用 Codex with ChatGPT」时，改用 skill \`codex-chatgpt-connect\`。
-->

`;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function applyBanner(text) {
  if (text.includes(BANNER_MARK)) return { text, changed: false };
  const frontmatter = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (frontmatter) {
    return { text: `${frontmatter[0]}\n${BANNER}${text.slice(frontmatter[0].length)}`, changed: true };
  }
  return { text: BANNER + text, changed: true };
}

function copyScripts(destScripts) {
  fs.mkdirSync(destScripts, { recursive: true });
  fs.mkdirSync(path.join(destScripts, "lib"), { recursive: true });
  for (const name of ["ensure-connected.mjs", "keepalive.mjs", "install.mjs"]) {
    fs.copyFileSync(path.join(repoRoot, "scripts", name), path.join(destScripts, name));
  }
  const libDir = path.join(repoRoot, "scripts", "lib");
  for (const name of fs.readdirSync(libDir)) {
    if (!name.endsWith(".mjs")) continue;
    fs.copyFileSync(path.join(libDir, name), path.join(destScripts, "lib", name));
  }
}

function installSkill(home = os.homedir()) {
  const dest = skillInstallDir(home);
  fs.mkdirSync(dest, { recursive: true });
  const skillSrc = path.join(repoRoot, "skill", "SKILL.md");
  let skillText = fs.readFileSync(skillSrc, "utf8");
  skillText = skillText.replaceAll("<SKILL_ROOT>", dest);
  const located = locateC2c({ home });
  if (located) {
    skillText = skillText.replace(
      /The codex-with-chatgpt checkout lives at:\s*`?[^`\n]+`?/,
      `The codex-with-chatgpt checkout lives at: \`${located.home}\``
    );
  }
  fs.writeFileSync(path.join(dest, "SKILL.md"), skillText, "utf8");
  copyScripts(path.join(dest, "scripts"));

  let banner = { applied: false, path: stockSkillPath(home) };
  if (fs.existsSync(banner.path)) {
    const original = fs.readFileSync(banner.path, "utf8");
    const updated = applyBanner(original);
    if (updated.changed) fs.writeFileSync(banner.path, updated.text, "utf8");
    banner = { applied: updated.changed, alreadyPresent: !updated.changed, path: banner.path };
  } else {
    banner = { applied: false, missing: true, path: banner.path };
  }

  return {
    ok: true,
    skillDir: dest,
    skillFile: path.join(dest, "SKILL.md"),
    c2cHome: located?.home ?? null,
    banner,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  process.stdout.write("Usage: node install.mjs\nInstalls ~/.codex/skills/codex-chatgpt-connect\n");
  process.exit(0);
}

printJson(installSkill());
