import assert from "node:assert/strict";
import test from "node:test";
import {
  LAUNCHD_LABEL,
  SYSTEMD_NAME,
  WINDOWS_TASK,
  renderLaunchdPlist,
  renderSystemdService,
  renderSystemdTimer,
  renderWindowsTaskCommand,
} from "../lib/keepalive-units.mjs";

test("launchd plist ticks keepalive and does not restart a process group", () => {
  const plist = renderLaunchdPlist({
    nodePath: "/usr/bin/node",
    scriptPath: "/opt/skill/scripts/keepalive.mjs",
    home: "/Users/eric",
  });
  assert.match(plist, new RegExp(LAUNCHD_LABEL));
  assert.match(plist, /keepalive\.mjs/);
  assert.match(plist, /<string>tick<\/string>/);
  assert.match(plist, /<key>StartInterval<\/key>\s*<integer>30<\/integer>/);
  assert.match(plist, /AbandonProcessGroup/);
  assert.doesNotMatch(plist, /c2c restart/);
});

test("systemd units are oneshot timer ticks", () => {
  const service = renderSystemdService({
    nodePath: "/usr/bin/node",
    scriptPath: "/opt/skill/scripts/keepalive.mjs",
  });
  const timer = renderSystemdTimer();
  assert.match(service, /Type=oneshot/);
  assert.match(service, /keepalive\.mjs tick/);
  assert.match(timer, new RegExp(`${SYSTEMD_NAME}\\.service`));
  assert.match(timer, /OnUnitActiveSec=30/);
});

test("windows task command targets the tick script", () => {
  const command = renderWindowsTaskCommand({
    nodePath: "C:\\\\Program Files\\\\nodejs\\\\node.exe",
    scriptPath: "C:\\\\skills\\\\keepalive.mjs",
  });
  assert.match(command, new RegExp(WINDOWS_TASK));
  assert.match(command, /keepalive\.mjs/);
  assert.match(command, /tick/);
  assert.match(command, /schtasks \/Create/);
});
