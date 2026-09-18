export function parseArgs(argv, defaults = {}) {
  const out = {
    json: true,
    keep: false,
    workspace: defaults.workspace ?? process.env.C2C_WORKSPACE ?? process.cwd(),
    help: false,
    command: null,
  };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") out.json = true;
    else if (arg === "--no-json") out.json = false;
    else if (arg === "--keep") out.keep = true;
    else if (arg === "-w" || arg === "--workspace") out.workspace = argv[++i];
    else if (arg === "--help" || arg === "-h") out.help = true;
    else rest.push(arg);
  }
  out.command = rest[0] ?? defaults.command ?? null;
  out.rest = rest.slice(1);
  return out;
}

export function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}
