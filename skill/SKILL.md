---
name: codex-chatgpt-connect
description: >
  Stabilize ChatGPT connectivity for Codex-with-ChatGPT. Use this INSTEAD of
  the stock codex-with-chatgpt setup/doctor/reconnect flow when the user says
  "使用 Codex with ChatGPT", "Set up Codex with ChatGPT", "连接 ChatGPT",
  "用 ChatGPT 规划", "再连一次", or when ChatGPT cannot connect. Do not run
  the stock skill's Connection choice, first-time setup, or reconnect workflows.
---

# Codex ChatGPT Connect

Keep the local ChatGPT connection up. Then, and only then, use the upstream
C2C planning loop.

The stock `codex-with-chatgpt` skill is too long: Codex often churns the
temporary address or re-asks Quick vs named. This skill owns connection.

**Do not** follow the stock skill's setup / doctor / reconnect / Connection
choice sections. **Do** follow upstream `docs/protocol.md` after
`nextAction=ready`.

## Locations

- This skill lives at: `<SKILL_ROOT>`
- Scripts: `node "<SKILL_ROOT>/scripts/ensure-connected.mjs"` and
  `node "<SKILL_ROOT>/scripts/keepalive.mjs"`
- The codex-with-chatgpt checkout lives at: `$C2C_HOME or ~/codex-with-chatgpt`
- CLI after connect: `node "<C2C_HOME>/bin/c2c.js"` (from ensure JSON `c2cHome`)
- User project is `-w <workspace>` (the repo they are editing, not this skill)

## Golden rules

1. First command of every connect / coding / repair turn:
   `node "<SKILL_ROOT>/scripts/ensure-connected.mjs" --json -w <workspace>`
   Trust `nextAction`. Do not re-interpret `c2c doctor` yourself.
2. Never ask Quick vs named. The script always chooses Quick Tunnel + HTTP/2.
3. Never restart a healthy connection. Never click ChatGPT Reconnect / Refresh.
4. Built-in in-app browser only (`control-in-app-browser` / `agent.browsers.get("iab")`).
   One tab. Never Computer Use. Never Chrome/Safari/Edge.
5. Never paste file bodies, diffs, or logs into ChatGPT. ChatGPT reads via MCP.
6. The pairing code is the only secret you may type. Mint it with `c2c pair --json`
   only when the Authorize form is visible.
7. Speak to the user as 连接 ChatGPT / 安全连接 / 配对. No MCP, tunnel, ports.

## Workflow: connect or code

1. Run ensure (`--json -w <workspace>`).
2. Branch on `nextAction`:

### `ready`

Local address is healthy and ChatGPT should already be authorized.

1. `node "<SKILL_ROOT>/scripts/keepalive.mjs" install -w <workspace>`
   If it fails with EPERM, request elevated permissions once and retry.
2. `c2c session -w <workspace> --json`. Open the saved chat / Project in the
   same iab tab. Confirm Chat (not Work).
3. Send: `Use the "<connectorName>" connector: call workspace_info. Reply with the workspace name.`
   Confirm it matches `workspaceName` from ensure.
4. Continue the user's task with upstream `docs/protocol.md`
   (`INIT` → `PLAN` → execute → `c2c record` → `EXECUTED` → review).
   Do not run stock setup. Do not recreate the connector just to resume.

### `repair-connector`

Local is up. The ChatGPT connector is missing or still points at a dead address.
Tell the user exactly `userMessage` if present, otherwise:
`安全连接地址已更新，我来重配 ChatGPT 连接，请不要点「重新连接」。`

Then repair yourself (same one iab tab, `markHandoff`, stay foreground):

1. Skip `pages.developerMode` unless create says developer mode is required.
2. `pages.plugins`: if `connectorName` exists, **Delete** only that card.
   Never Reconnect / Refresh / Edit.
3. `pages.createConnector`: create the **same** `connectorName`
   - Description: `Securely connect ChatGPT to the current Codex workspace for planning and review.`
   - Server URL: `mcpUrl`
   - Authentication: OAuth
   Connect / Authorize. Only then `c2c pair --json` and type that code.
   Stop at Connected. Do not wait for 8 tools on the settings page.
4. If `connectorAction` is `create` and the name is absent, skip Delete.
5. Re-run ensure. When `ready`, `workspace_info` in the saved chat. If that
   chat cannot read the workspace, new chat in the same Project (or long-chat
   switch) + HANDOFF from `c2c session` checkpoint. Do not paste logs.
6. Two explicit failures of the same settings step → guided manual (one
   action, wait for「好了」). Browser/js timeout or login/2FA is not a failure.

### `failed`

Say `error` in one sentence. Do not Delete the connector. Do not start a
second bridge. If they say「好了」or「再连一次」, run ensure again.

## In-app browser

Once per Codex session: `setupBrowserRuntime()`, then
`const iab = await agent.browsers.get("iab")`. One ChatGPT tab. After open:
visibility on, `markHandoff` every turn. Never close it.

URLs only (from ensure `pages` when repairing):

- Developer mode: `https://chatgpt.com/#settings/Security`
- Plugins: `https://chatgpt.com/plugins`
- Create: `https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins`

After sending INIT / EXECUTED / workspace_info: poll DOM every 20–30s. Do not
hold a 5-minute wait. Still generating → wait. Visible error → repair.

## Disconnect

Only if the user asks to disconnect: `c2c unpair -w <workspace>`, then
`node "<SKILL_ROOT>/scripts/keepalive.mjs" uninstall`.
Say: `已断开 ChatGPT 对该项目的访问。`
