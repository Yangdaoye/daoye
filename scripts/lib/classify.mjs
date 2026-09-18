const PUBLIC_URL_RE = /https:\/\/[a-z0-9][a-z0-9.-]*[a-z0-9](?::\d+)?/i;
const UNCERTAIN_RE = /状态无法确认/;
const CLOUDFLARED_RE = /NEED_CLOUDFLARED|cloudflared is not installed/i;
const TIMEOUT_RE = /timed out|fetch failed|ENOTFOUND|EAI_AGAIN|Tunnel start/i;
const UNREACHABLE_RE = /安全连接未恢复|公网地址无法访问|安全连接未运行/;
const LOCAL_ONLY_RE = /未启用|本地模式/;

export function extractPublicUrl(doctor) {
  const mcp = doctor?.chatgptRepair?.mcpUrl;
  if (typeof mcp === "string" && mcp.startsWith("https://")) {
    return mcp.replace(/\/mcp\/?$/i, "");
  }
  const detail = doctor?.report?.tunnel?.detail;
  if (typeof detail === "string") {
    const match = detail.match(PUBLIC_URL_RE);
    if (match) return match[0].replace(/\/mcp\/?$/i, "");
  }
  return null;
}

export function classifyDoctor(doctor) {
  const report = doctor?.report ?? {};
  const bridgeDetail = String(report.bridge?.detail ?? "");
  const tunnelDetail = String(report.tunnel?.detail ?? "");
  const combined = `${bridgeDetail}\n${tunnelDetail}`;
  const publicUrl = extractPublicUrl(doctor);
  const tunnelOk = Boolean(report.tunnel?.ok);
  const localOnly = tunnelOk && LOCAL_ONLY_RE.test(tunnelDetail);
  const publicHealthy = tunnelOk && Boolean(publicUrl) && !localOnly;
  const chatgptRepair = doctor?.chatgptRepair ?? {};
  const namedRepair = doctor?.namedRepair ?? {};

  return {
    uncertain: UNCERTAIN_RE.test(combined),
    needCloudflared: CLOUDFLARED_RE.test(combined),
    localGreen: Boolean(report.bridge?.ok && report.mcp?.ok && report.workspace?.ok),
    tunnelOk,
    localOnly,
    publicUrl,
    publicHealthy,
    shouldRetryTunnel:
      !UNCERTAIN_RE.test(combined) &&
      !CLOUDFLARED_RE.test(combined) &&
      (localOnly ||
        !publicUrl ||
        !tunnelOk ||
        TIMEOUT_RE.test(tunnelDetail) ||
        UNREACHABLE_RE.test(tunnelDetail)),
    chatgptRepairNeeded: Boolean(chatgptRepair.needed),
    connectorAction: chatgptRepair.connectorAction ?? "none",
    connectorName: chatgptRepair.connectorName ?? null,
    mcpUrl: chatgptRepair.mcpUrl ?? (publicUrl ? `${publicUrl}/mcp` : null),
    previousMcpUrl: chatgptRepair.previousMcpUrl ?? null,
    userMessage: chatgptRepair.userMessage ?? null,
    pages: chatgptRepair.pages ?? null,
    workspaceName: report.workspace?.detail ?? null,
    namedRepairNeeded: Boolean(namedRepair.needed),
    tunnelDetail,
    bridgeDetail,
  };
}

export function humanError(doctor, fallback = "还没连上 ChatGPT。请按提示做一步，不要自己改连接器。") {
  const classified = doctor?.report ? classifyDoctor(doctor) : null;
  const detail = `${classified?.bridgeDetail ?? ""}\n${classified?.tunnelDetail ?? ""}`;
  if (classified?.needCloudflared || CLOUDFLARED_RE.test(detail)) {
    return "还没装安全连接组件。macOS 运行 brew install cloudflared，Windows 运行 winget install Cloudflare.cloudflared，然后再说「再连一次」。";
  }
  if (classified?.uncertain || UNCERTAIN_RE.test(detail)) {
    return "本地连接状态暂时无法确认。请稍等后再试，不要删除 ChatGPT 连接，也不要再开一条连接。";
  }
  if (TIMEOUT_RE.test(detail) || UNREACHABLE_RE.test(detail)) {
    return "临时安全地址还没就绪。脚本已自动重试；若仍失败，检查网络后再说「再连一次」。";
  }
  return fallback;
}
