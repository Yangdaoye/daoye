import { spawn } from "node:child_process";
import { parseJsonOutput } from "./json.mjs";

export function c2cEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  if (!env.C2C_TUNNEL_PROTOCOL) env.C2C_TUNNEL_PROTOCOL = "http2";
  return env;
}

export function createC2cRunner({ bin, env = process.env, spawnImpl = spawn, timeoutMs = 120_000 } = {}) {
  if (!bin) {
    throw new Error("c2c bin is required");
  }

  return async function run(args) {
    const result = await new Promise((resolve, reject) => {
      const child = spawnImpl(process.execPath, [bin, ...args], {
        env: c2cEnv(env),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`c2c ${args[0] ?? ""} timed out`));
      }, timeoutMs);
      child.stdout?.setEncoding("utf8");
      child.stderr?.setEncoding("utf8");
      child.stdout?.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({ code, stdout, stderr });
      });
    });

    try {
      return parseJsonOutput(result.stdout);
    } catch (error) {
      const detail = result.stderr.trim() || result.stdout.trim() || error.message;
      const wrapped = new Error(`c2c ${args.join(" ")} failed: ${detail.slice(0, 400)}`);
      wrapped.exitCode = result.code;
      throw wrapped;
    }
  };
}
