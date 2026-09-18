/** Parse the first JSON object from CLI stdout (c2c may set a non-zero exit). */
export function parseJsonOutput(stdout) {
  const text = String(stdout ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("CLI did not return JSON");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export function sanitizeDoctor(doctor) {
  if (!doctor || typeof doctor !== "object") return null;
  const copy = structuredClone(doctor);
  if (copy.chatgptRepair && typeof copy.chatgptRepair === "object") {
    delete copy.chatgptRepair.pairingCode;
    delete copy.chatgptRepair.pairingExpiresAt;
  }
  return copy;
}
