import assert from "node:assert/strict";
import test from "node:test";
import { probePublicHealth } from "../lib/health.mjs";

test("probePublicHealth returns true when /health becomes ok", async () => {
  let calls = 0;
  const ok = await probePublicHealth(
    "https://abc.trycloudflare.com",
    5_000,
    async () => {
      calls += 1;
      if (calls < 2) throw new Error("ENOTFOUND");
      return {
        ok: true,
        json: async () => ({ service: "c2c-bridge", status: "ok" }),
      };
    },
    async () => {}
  );
  assert.equal(ok, true);
  assert.equal(calls >= 2, true);
});

test("probePublicHealth returns false when the window expires", async () => {
  const ok = await probePublicHealth(
    "https://abc.trycloudflare.com",
    1,
    async () => {
      throw new Error("ENOTFOUND");
    },
    async () => {}
  );
  assert.equal(ok, false);
});
