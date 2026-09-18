import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const SKILL_NAME = "codex-chatgpt-connect";
export const STOCK_SKILL_NAME = "codex-with-chatgpt";
export const CHECKOUT_LINE = /The codex-with-chatgpt checkout lives at:\s*`?([^`\n]+)`?/;

export function skillInstallDir(home = os.homedir()) {
  return path.join(home, ".codex", "skills", SKILL_NAME);
}

export function stockSkillPath(home = os.homedir()) {
  return path.join(home, ".codex", "skills", STOCK_SKILL_NAME, "SKILL.md");
}

export function stableStateDir(home = os.homedir()) {
  return path.join(home, ".codex", "c2c-stable");
}

export function stableStatePath(home = os.homedir()) {
  return path.join(stableStateDir(home), "state.json");
}

export function readCheckoutFromSkill(skillMdPath) {
  if (!skillMdPath || !fs.existsSync(skillMdPath)) return null;
  const text = fs.readFileSync(skillMdPath, "utf8");
  const match = text.match(CHECKOUT_LINE);
  if (!match) return null;
  const checkout = match[1].trim();
  if (!checkout || checkout.includes("<") || checkout.includes("ACTUAL_CHECKOUT")) return null;
  return checkout;
}

export function locateC2c({ env = process.env, home = os.homedir() } = {}) {
  const candidates = [];
  if (env.C2C_HOME) candidates.push(env.C2C_HOME);
  candidates.push(path.join(home, "codex-with-chatgpt"));
  const fromStock = readCheckoutFromSkill(stockSkillPath(home));
  if (fromStock) candidates.push(fromStock);
  const fromOurs = readCheckoutFromSkill(path.join(skillInstallDir(home), "SKILL.md"));
  if (fromOurs) candidates.push(fromOurs);

  const seen = new Set();
  for (const dir of candidates) {
    const resolved = path.resolve(dir);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    const bin = path.join(resolved, "bin", "c2c.js");
    if (fs.existsSync(bin)) {
      return { home: resolved, bin };
    }
  }
  return null;
}

export function missingC2cMessage() {
  return [
    "找不到 Codex with ChatGPT。",
    "请先克隆 https://github.com/XiaoDuoYa/codex-with-chatgpt 到 ~/codex-with-chatgpt，",
    "在其中运行 corepack pnpm install && corepack pnpm build。",
    "或设置环境变量 C2C_HOME 指向该目录。",
  ].join("");
}
