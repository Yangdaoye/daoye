import fs from "node:fs";
import path from "node:path";
import { stableStateDir, stableStatePath } from "./paths.mjs";

export function readStableState(home) {
  const file = stableStatePath(home);
  if (!fs.existsSync(file)) {
    return { workspaces: [], lastEnsure: null };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : [],
      lastEnsure: parsed.lastEnsure ?? null,
    };
  } catch {
    return { workspaces: [], lastEnsure: null };
  }
}

export function writeStableState(state, home) {
  const dir = stableStateDir(home);
  fs.mkdirSync(dir, { recursive: true });
  const file = stableStatePath(home);
  fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return file;
}

export function rememberWorkspace(workspacePath, home) {
  const resolved = path.resolve(workspacePath);
  const state = readStableState(home);
  const existing = state.workspaces.find((item) => item.path === resolved);
  if (!existing) {
    state.workspaces.push({ path: resolved, addedAt: new Date().toISOString() });
  }
  writeStableState(state, home);
  return state;
}

export function recordEnsure(workspacePath, result, home) {
  const state = rememberWorkspace(workspacePath, home);
  state.lastEnsure = {
    workspace: path.resolve(workspacePath),
    nextAction: result.nextAction,
    mcpUrl: result.mcpUrl ?? null,
    at: new Date().toISOString(),
  };
  writeStableState(state, home);
  return state;
}
