import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { classifyDoctor, humanError } from "../lib/classify.mjs";
import { sanitizeDoctor } from "../lib/json.mjs";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtures, name), "utf8"));
}

test("green doctor is locally healthy with a public URL", () => {
  const classified = classifyDoctor(load("doctor-green.json"));
  assert.equal(classified.localGreen, true);
  assert.equal(classified.publicHealthy, true);
  assert.equal(classified.shouldRetryTunnel, false);
  assert.equal(classified.chatgptRepairNeeded, false);
  assert.equal(classified.publicUrl, "https://abc.trycloudflare.com");
});

test("timeout doctor should retry and not look ready", () => {
  const classified = classifyDoctor(load("doctor-timeout.json"));
  assert.equal(classified.publicHealthy, false);
  assert.equal(classified.shouldRetryTunnel, true);
  assert.equal(classified.uncertain, false);
  assert.match(humanError(load("doctor-timeout.json")), /临时安全地址/);
});

test("repair doctor keeps the new mcp URL", () => {
  const classified = classifyDoctor(load("doctor-repair.json"));
  assert.equal(classified.publicHealthy, true);
  assert.equal(classified.chatgptRepairNeeded, true);
  assert.equal(classified.connectorAction, "update");
  assert.equal(classified.mcpUrl, "https://new.trycloudflare.com/mcp");
});

test("uncertain doctor must not look like a dead tunnel", () => {
  const classified = classifyDoctor(load("doctor-uncertain.json"));
  assert.equal(classified.uncertain, true);
  assert.equal(classified.shouldRetryTunnel, false);
  assert.equal(classified.localGreen, false);
  assert.match(humanError(load("doctor-uncertain.json")), /不要删除/);
});

test("local-only doctor should retry to start a public address", () => {
  const classified = classifyDoctor(load("doctor-local-only.json"));
  assert.equal(classified.localOnly, true);
  assert.equal(classified.publicHealthy, false);
  assert.equal(classified.shouldRetryTunnel, true);
});

test("sanitizeDoctor strips pairing codes", () => {
  const sanitized = sanitizeDoctor(load("doctor-repair.json"));
  assert.equal(sanitized.chatgptRepair.pairingCode, undefined);
  assert.equal(sanitized.chatgptRepair.mcpUrl, "https://new.trycloudflare.com/mcp");
});
