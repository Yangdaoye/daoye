function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Probe a C2C public /health endpoint until timeout. Returns true if it looks like the bridge. */
export async function probePublicHealth(publicUrl, timeoutMs, fetchImpl = fetch, sleepImpl = wait) {
  if (!publicUrl || timeoutMs <= 0) return false;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    try {
      const response = await fetchImpl(new URL("/health", publicUrl).toString(), {
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      });
      if (!response?.ok) {
        await response?.body?.cancel?.().catch(() => undefined);
      } else {
        const payload = await response.json().catch(() => null);
        if (payload && typeof payload === "object" && payload.status === "ok") {
          return true;
        }
      }
    } catch {
      // DNS / TLS / timeout — keep waiting out the window.
    }
    if (Date.now() > deadline) break;
    await sleepImpl(Math.min(1_000, Math.max(0, deadline - Date.now())));
  }
  return false;
}
