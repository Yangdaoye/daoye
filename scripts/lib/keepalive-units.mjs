export const LAUNCHD_LABEL = "com.daoye.c2c-stable";
export const SYSTEMD_NAME = "c2c-stable";
export const WINDOWS_TASK = "daoye-c2c-stable";

export function renderLaunchdPlist({ nodePath, scriptPath, home }) {
  const args = [nodePath, scriptPath, "tick"].map(xmlEscape);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${args[0]}</string>
    <string>${args[1]}</string>
    <string>${args[2]}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(home)}</string>
  <key>StartInterval</key>
  <integer>30</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>AbandonProcessGroup</key>
  <true/>
</dict>
</plist>
`;
}

export function renderSystemdService({ nodePath, scriptPath }) {
  return `[Unit]
Description=Keep Codex-with-ChatGPT Quick Tunnel alive
After=network-online.target

[Service]
Type=oneshot
ExecStart=${escapeSystemd(nodePath)} ${escapeSystemd(scriptPath)} tick
Nice=10

[Install]
WantedBy=default.target
`;
}

export function renderSystemdTimer() {
  return `[Unit]
Description=Tick Codex-with-ChatGPT keep-alive every 30 seconds

[Timer]
OnBootSec=20
OnUnitActiveSec=30
AccuracySec=5
Persistent=true
Unit=${SYSTEMD_NAME}.service

[Install]
WantedBy=timers.target
`;
}

export function renderWindowsTaskCommand({ nodePath, scriptPath }) {
  return `schtasks /Create /F /TN "${WINDOWS_TASK}" /SC MINUTE /MO 1 /RL LIMITED /TR "\\"${nodePath}\\" \\"${scriptPath}\\" tick"`;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeSystemd(value) {
  if (!/[\s"'\\]/.test(value)) return value;
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
