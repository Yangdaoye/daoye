#!/usr/bin/env node
import { parseArgs, printJson } from "./lib/args.mjs";
import { ensureConnected } from "./lib/ensure.mjs";

const HELP = `Usage: node ensure-connected.mjs --json [-w <workspace>] [--keep]

Locate XiaoDuoYa/codex-with-chatgpt, force HTTP/2, choose Quick Tunnel,
retry doctor/start until the public address is healthy, then print JSON:

  nextAction=ready | repair-connector | failed
`;

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  process.stdout.write(HELP);
  process.exit(0);
}

const result = await ensureConnected({
  workspace: args.workspace,
  keep: args.keep,
});
printJson(result);
process.exitCode = result.ok ? 0 : 1;
