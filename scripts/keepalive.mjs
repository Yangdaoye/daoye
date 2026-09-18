#!/usr/bin/env node
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parseArgs, printJson } from "./lib/args.mjs";
import { ensureConnected } from "./lib/ensure.mjs";
import {
  LAUNCHD_LABEL,
  SYSTEMD_NAME,
  WINDOWS_TASK,
  renderLaunchdPlist,
  renderSystemdService,
  renderSystemdTimer,
  renderWindowsTaskCommand,
} from "./lib/keepalive-units.mjs";
import { readStableState, rememberWorkspace } from "./lib/state.mjs";

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const tickScript = path.join(here, "keepalive.mjs");

const HELP = `Usage:
  node keepalive.mjs install [-w <workspace>]
  node keepalive.mjs uninstall
  node keepalive.mjs tick
`;

function platformUnits(home, nodePath = process.execPath) {
  return {
    darwin: {
      file: path.join(home, "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`),
      body: renderLaunchdPlist({ nodePath, scriptPath: tickScript, home }),
    },
    linux: {
      service: path.join(home, ".config", "systemd", "user", `${SYSTEMD_NAME}.service`),
      timer: path.join(home, ".config", "systemd", "user", `${SYSTEMD_NAME}.timer`),
      serviceBody: renderSystemdService({ nodePath, scriptPath: tickScript }),
      timerBody: renderSystemdTimer(),
    },
    win32: {
      command: renderWindowsTaskCommand({ nodePath, scriptPath: tickScript }),
    },
  };
}

async function tryExec(command, args) {
  try {
    await execFileAsync(command, args);
    return true;
  } catch {
    return false;
  }
}

async function installKeepalive(workspace) {
  const home = os.homedir();
  if (workspace) rememberWorkspace(workspace, home);
  const units = platformUnits(home);
  const platform = process.platform;
  const written = [];
  let activated = false;

  if (platform === "darwin") {
    const file = units.darwin.file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, units.darwin.body, "utf8");
    written.push(file);
    await tryExec("launchctl", ["unload", file]);
    activated = await tryExec("launchctl", ["load", file]);
  } else if (platform === "linux") {
    fs.mkdirSync(path.dirname(units.linux.service), { recursive: true });
    fs.writeFileSync(units.linux.service, units.linux.serviceBody, "utf8");
    fs.writeFileSync(units.linux.timer, units.linux.timerBody, "utf8");
    written.push(units.linux.service, units.linux.timer);
    await tryExec("systemctl", ["--user", "daemon-reload"]);
    activated = await tryExec("systemctl", ["--user", "enable", "--now", `${SYSTEMD_NAME}.timer`]);
  } else if (platform === "win32") {
    written.push(units.win32.command);
    activated = await tryExec("schtasks", [
      "/Create",
      "/F",
      "/TN",
      WINDOWS_TASK,
      "/SC",
      "MINUTE",
      "/MO",
      "1",
      "/RL",
      "LIMITED",
      "/TR",
      `"${process.execPath}" "${tickScript}" tick`,
    ]);
  } else {
    return { ok: false, error: `unsupported platform: ${platform}` };
  }

  return {
    ok: true,
    platform,
    written,
    activated,
    state: readStableState(home),
  };
}

async function uninstallKeepalive() {
  const home = os.homedir();
  const units = platformUnits(home);
  const platform = process.platform;
  const removed = [];

  if (platform === "darwin") {
    await tryExec("launchctl", ["unload", units.darwin.file]);
    if (fs.existsSync(units.darwin.file)) {
      fs.unlinkSync(units.darwin.file);
      removed.push(units.darwin.file);
    }
  } else if (platform === "linux") {
    await tryExec("systemctl", ["--user", "disable", "--now", `${SYSTEMD_NAME}.timer`]);
    for (const file of [units.linux.timer, units.linux.service]) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        removed.push(file);
      }
    }
  } else if (platform === "win32") {
    await tryExec("schtasks", ["/Delete", "/F", "/TN", WINDOWS_TASK]);
    removed.push(WINDOWS_TASK);
  }

  return { ok: true, platform, removed };
}

async function tick() {
  const home = os.homedir();
  const state = readStableState(home);
  const results = [];
  for (const item of state.workspaces) {
    const result = await ensureConnected({
      workspace: item.path,
      keep: true,
      healthProbeMs: 8_000,
      uncertainWaitMs: 2_000,
      retryWaitMs: 2_000,
      maxAttempts: 2,
    });
    results.push({
      workspace: item.path,
      ok: result.ok,
      nextAction: result.nextAction,
      mcpUrl: result.mcpUrl ?? null,
      error: result.error ?? null,
    });
  }
  return { ok: results.every((item) => item.ok || item.nextAction === "repair-connector"), results };
}

const args = parseArgs(process.argv.slice(2), { command: "tick" });
if (args.help) {
  process.stdout.write(HELP);
  process.exit(0);
}

const command = args.command ?? "tick";
let payload;
if (command === "install") payload = await installKeepalive(args.workspace);
else if (command === "uninstall") payload = await uninstallKeepalive();
else if (command === "tick") payload = await tick();
else payload = { ok: false, error: `unknown command: ${command}` };

printJson(payload);
process.exitCode = payload.ok ? 0 : 1;
