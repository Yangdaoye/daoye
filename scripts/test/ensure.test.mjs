import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { ensureConnected } from "../lib/ensure.mjs";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtures, name), "utf8"));
}

function scriptedRun(plan) {
  const calls = [];
  const queues = Object.fromEntries(
    Object.entries(plan).map(([key, value]) => [key, Array.isArray(value) ? [...value] : [value]])
  );
  const run = async (args) => {
    const key = args[0] === "tunnel" ? `tunnel ${args[1]}` : args[0];
    calls.push(args);
    const queue = queues[key];
    if (!queue || queue.length === 0) {
      return { ok: true };
    }
    const next = queue.length === 1 ? queue[0] : queue.shift();
    if (typeof next === "function") return next(args);
    if (next instanceof Error) throw next;
    return next;
  };
  return { run, calls };
}

const c2c = { home: "/tmp/c2c-fake", bin: "/tmp/c2c-fake/bin/c2c.js" };
const fast = {
  c2c,
  maxAttempts: 6,
  uncertainWaitMs: 0,
  retryWaitMs: 0,
  healthProbeMs: 0,
  sleepImpl: async () => {},
  probeImpl: async () => false,
  locate: () => c2c,
};

test("missing c2c returns failed without calling doctor", async () => {
  const { run, calls } = scriptedRun({});
  const result = await ensureConnected({
    ...fast,
    c2c: null,
    locate: () => null,
    run,
    workspace: "/tmp/ws",
  });
  assert.equal(result.nextAction, "failed");
  assert.match(result.error, /找不到 Codex with ChatGPT/);
  assert.equal(calls.length, 0);
});

test("green doctor with tokens is ready and does not stop", async () => {
  const { run, calls } = scriptedRun({
    "sandbox-allow": { ok: true, alreadyAllowed: true },
    "tunnel status": { ok: true, needsChoice: false },
    doctor: load("doctor-green.json"),
    status: { ok: true, tokenCount: 2 },
  });
  const result = await ensureConnected({ ...fast, run, workspace: "/tmp/ws" });
  assert.equal(result.nextAction, "ready");
  assert.equal(result.mcpUrl, "https://abc.trycloudflare.com/mcp");
  assert.equal(result.ok, true);
  assert.equal(
    calls.some((args) => args[0] === "stop"),
    false
  );
});

test("green doctor with zero tokens asks to create the connector", async () => {
  const { run } = scriptedRun({
    "sandbox-allow": { ok: true },
    "tunnel status": { ok: true, needsChoice: false },
    doctor: load("doctor-green.json"),
    status: { ok: true, tokenCount: 0 },
  });
  const result = await ensureConnected({ ...fast, run, workspace: "/tmp/ws" });
  assert.equal(result.nextAction, "repair-connector");
  assert.equal(result.connectorAction, "create");
});

test("timeout then green retries via stop + start --tunnel", async () => {
  const { run, calls } = scriptedRun({
    "sandbox-allow": { ok: true },
    "tunnel status": { ok: true, needsChoice: true },
    "tunnel choose": { ok: true, needsChoice: false },
    doctor: [load("doctor-timeout.json"), load("doctor-green.json")],
    start: { ok: true, mcpUrl: "https://abc.trycloudflare.com/mcp" },
    stop: { ok: true },
    status: { ok: true, tokenCount: 1 },
  });
  const result = await ensureConnected({ ...fast, run, workspace: "/tmp/ws" });
  assert.equal(result.nextAction, "ready");
  assert.equal(result.attempts, 2);
  assert.equal(
    calls.some((args) => args[0] === "tunnel" && args[1] === "choose" && args.includes("quick")),
    true
  );
  assert.equal(
    calls.some((args) => args[0] === "start" && args.includes("--tunnel")),
    true
  );
  assert.equal(
    calls.some((args) => args[0] === "stop"),
    true
  );
});

test("uncertain doctor waits and never stops", async () => {
  const { run, calls } = scriptedRun({
    "sandbox-allow": { ok: true },
    "tunnel status": { ok: true, needsChoice: false },
    doctor: [load("doctor-uncertain.json"), load("doctor-green.json")],
    status: { ok: true, tokenCount: 1 },
  });
  const result = await ensureConnected({ ...fast, run, workspace: "/tmp/ws" });
  assert.equal(result.nextAction, "ready");
  assert.equal(
    calls.some((args) => args[0] === "stop"),
    false
  );
});

test("address reclaim returns repair-connector and strips pairing codes", async () => {
  const { run } = scriptedRun({
    "sandbox-allow": { ok: true },
    "tunnel status": { ok: true, needsChoice: false },
    doctor: load("doctor-repair.json"),
  });
  const result = await ensureConnected({ ...fast, run, workspace: "/tmp/ws" });
  assert.equal(result.nextAction, "repair-connector");
  assert.equal(result.connectorAction, "update");
  assert.equal(result.mcpUrl, "https://new.trycloudflare.com/mcp");
  assert.equal(result.doctor.chatgptRepair.pairingCode, undefined);
});

test("keep mode on a healthy tunnel does not stop or start", async () => {
  const { run, calls } = scriptedRun({
    "sandbox-allow": { ok: true },
    "tunnel status": { ok: true, needsChoice: false },
    doctor: load("doctor-green.json"),
  });
  const result = await ensureConnected({ ...fast, run, workspace: "/tmp/ws", keep: true });
  assert.equal(result.nextAction, "ready");
  assert.equal(
    calls.some((args) => args[0] === "stop" || args[0] === "start"),
    false
  );
});

test("keep mode does not ask ChatGPT to recreate when tokens are missing", async () => {
  const { run } = scriptedRun({
    "sandbox-allow": { ok: true },
    "tunnel status": { ok: true, needsChoice: false },
    doctor: load("doctor-green.json"),
    status: { ok: true, tokenCount: 0 },
  });
  const result = await ensureConnected({ ...fast, run, workspace: "/tmp/ws", keep: true });
  assert.equal(result.nextAction, "ready");
});

test("namedRepair falls back to quick without Cloudflare login", async () => {
  const named = structuredClone(load("doctor-timeout.json"));
  named.namedRepair = { needed: true, userMessage: "请登录 Cloudflare" };
  const { run, calls } = scriptedRun({
    "sandbox-allow": { ok: true },
    "tunnel status": { ok: true, needsChoice: false },
    "tunnel choose": { ok: true, needsChoice: false },
    doctor: [named, load("doctor-green.json")],
    status: { ok: true, tokenCount: 1 },
  });
  const result = await ensureConnected({ ...fast, run, workspace: "/tmp/ws" });
  assert.equal(result.nextAction, "ready");
  assert.equal(
    calls.some((args) => args[0] === "tunnel" && args[1] === "login"),
    false
  );
  assert.equal(
    calls.some((args) => args[0] === "tunnel" && args[1] === "choose"),
    true
  );
});

test("missing c2c home can still be discovered from the stock skill file", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "c2c-home-"));
  const checkout = path.join(home, "src", "codex-with-chatgpt");
  fs.mkdirSync(path.join(checkout, "bin"), { recursive: true });
  fs.writeFileSync(path.join(checkout, "bin", "c2c.js"), "console.log('{}')\n");
  fs.mkdirSync(path.join(home, ".codex", "skills", "codex-with-chatgpt"), { recursive: true });
  fs.writeFileSync(
    path.join(home, ".codex", "skills", "codex-with-chatgpt", "SKILL.md"),
    `The codex-with-chatgpt checkout lives at: \`${checkout}\`\n`,
    "utf8"
  );
  const { locateC2c } = await import("../lib/paths.mjs");
  const located = locateC2c({ env: {}, home });
  assert.equal(located.home, checkout);
});
