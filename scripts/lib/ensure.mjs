import { classifyDoctor, humanError } from "./classify.mjs";
import { createC2cRunner } from "./c2c.mjs";
import { probePublicHealth } from "./health.mjs";
import { sanitizeDoctor } from "./json.mjs";
import { locateC2c, missingC2cMessage } from "./paths.mjs";

export const DEFAULTS = {
  maxAttempts: 6,
  uncertainWaitMs: 3_000,
  retryWaitMs: 2_000,
  healthProbeMs: 90_000,
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function baseResult({ c2cHome, workspace, keep, attempts, doctor }) {
  return {
    c2cHome,
    workspace,
    keep: Boolean(keep),
    attempts,
    doctor: sanitizeDoctor(doctor),
  };
}

function readyResult(classified, extras) {
  return {
    ok: true,
    nextAction: "ready",
    workspaceName: classified.workspaceName,
    connectorName: classified.connectorName,
    connectorAction: classified.connectorAction ?? "none",
    mcpUrl: classified.mcpUrl,
    previousMcpUrl: classified.previousMcpUrl,
    publicUrl: classified.publicUrl,
    userMessage: null,
    pages: classified.pages,
    ...extras,
  };
}

function repairResult(classified, extras, connectorAction = classified.connectorAction) {
  return {
    ok: true,
    nextAction: "repair-connector",
    workspaceName: classified.workspaceName,
    connectorName: classified.connectorName,
    connectorAction: connectorAction === "none" ? "create" : connectorAction,
    mcpUrl: classified.mcpUrl,
    previousMcpUrl: classified.previousMcpUrl,
    publicUrl: classified.publicUrl,
    userMessage: classified.userMessage,
    pages: classified.pages,
    ...extras,
  };
}

function failedResult(error, extras) {
  return {
    ok: false,
    nextAction: "failed",
    error,
    ...extras,
  };
}

async function readTokenCount(run, workspace) {
  try {
    const status = await run(["status", "-w", workspace, "--json"]);
    if (typeof status?.tokenCount === "number") return status.tokenCount;
  } catch {
    // status unknown must not look like "never paired"
  }
  return null;
}

export async function ensureConnected(options = {}) {
  const workspace = options.workspace ?? process.cwd();
  const keep = Boolean(options.keep);
  const maxAttempts = options.maxAttempts ?? DEFAULTS.maxAttempts;
  const uncertainWaitMs = options.uncertainWaitMs ?? DEFAULTS.uncertainWaitMs;
  const retryWaitMs = options.retryWaitMs ?? DEFAULTS.retryWaitMs;
  const healthProbeMs = options.healthProbeMs ?? DEFAULTS.healthProbeMs;
  const sleepImpl = options.sleepImpl ?? wait;
  const probeImpl = options.probeImpl ?? probePublicHealth;
  const locate = options.locate ?? locateC2c;
  const env = options.env ?? process.env;

  const located = options.c2c ?? locate({ env, home: options.home });
  if (!located) {
    return failedResult(missingC2cMessage(), {
      c2cHome: null,
      workspace,
      keep,
      attempts: 0,
      doctor: null,
    });
  }

  const run = options.run ?? createC2cRunner({ bin: located.bin, env });
  let choseQuick = false;
  let lastDoctor = null;

  try {
    await run(["sandbox-allow", "--json"]);
  } catch {
    // Sandbox allow can fail in a restricted environment; doctor will retry.
  }

  try {
    const tunnelStatus = await run(["tunnel", "status", "-w", workspace, "--json"]);
    if (tunnelStatus?.needsChoice) {
      await run(["tunnel", "choose", "--mode", "quick", "-w", workspace, "--json"]);
      choseQuick = true;
    }
  } catch {
    // Workspace may not exist yet; doctor/start will surface that.
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let doctor;
    try {
      doctor = await run(["doctor", "-w", workspace, "--json"]);
    } catch (error) {
      lastDoctor = error.doctor ?? lastDoctor;
      if (attempt === maxAttempts) {
        return failedResult(humanError(lastDoctor, error.message), baseResult({
          c2cHome: located.home,
          workspace,
          keep,
          attempts: attempt,
          doctor: lastDoctor,
        }));
      }
      await sleepImpl(retryWaitMs);
      continue;
    }
    lastDoctor = doctor;
    const classified = classifyDoctor(doctor);
    const extras = baseResult({
      c2cHome: located.home,
      workspace,
      keep,
      attempts: attempt,
      doctor,
    });

    if (classified.uncertain) {
      if (attempt === maxAttempts) {
        return failedResult(humanError(doctor), extras);
      }
      await sleepImpl(uncertainWaitMs);
      continue;
    }

    if (classified.needCloudflared) {
      return failedResult(humanError(doctor), extras);
    }

    if (classified.namedRepairNeeded && !choseQuick) {
      await run(["tunnel", "choose", "--mode", "quick", "-w", workspace, "--json"]);
      choseQuick = true;
      await sleepImpl(retryWaitMs);
      continue;
    }

    if (classified.localGreen && classified.publicHealthy) {
      if (classified.chatgptRepairNeeded && !keep) {
        return repairResult(classified, extras);
      }
      if (!keep) {
        const tokenCount = await readTokenCount(run, workspace);
        extras.tokenCount = tokenCount;
        if (tokenCount === 0) {
          return repairResult(classified, extras, "create");
        }
      }
      return readyResult(classified, extras);
    }

    if (classified.publicUrl && !classified.publicHealthy) {
      const probed = await probeImpl(classified.publicUrl, keep ? Math.min(healthProbeMs, 8_000) : healthProbeMs);
      if (probed) {
        classified.publicHealthy = true;
        if (classified.chatgptRepairNeeded && !keep) {
          return repairResult(classified, extras);
        }
        return readyResult(classified, extras);
      }
    }

    if (classified.shouldRetryTunnel || classified.localOnly || !classified.publicHealthy) {
      if (!keep) {
        try {
          await run(["stop", "-w", workspace, "--json"]);
        } catch {
          // stop is best-effort before a clean start --tunnel
        }
        await sleepImpl(retryWaitMs);
        try {
          await run(["start", "--tunnel", "-w", workspace, "--json"]);
        } catch {
          // next doctor attempt will classify the failure
        }
      } else {
        await sleepImpl(retryWaitMs);
      }
      continue;
    }

    await sleepImpl(retryWaitMs);
  }

  const extras = baseResult({
    c2cHome: located.home,
    workspace,
    keep,
    attempts: maxAttempts,
    doctor: lastDoctor,
  });
  return failedResult(humanError(lastDoctor), extras);
}
