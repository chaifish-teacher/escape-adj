export type Leader = { name: string; rankingTime: number; actualTime: number };
const enabled = import.meta.env.VITE_BACKEND_ENABLED === "true";
export function hasBackend() {
  return enabled;
}
export async function call(
  action: string,
  payload: Record<string, unknown> = {},
  requestId: string = crypto.randomUUID(),
): Promise<any> {
  if (!enabled)
    throw new Error(
      "Practice only — online records are not connected. 練習模式：尚未連接線上紀錄。",
    );
  const send = async (a: string, p: Record<string, unknown>, id: string) => {
    const response = await fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: a, payload: p, requestId: id }),
      signal: AbortSignal.timeout(18000),
    });
    const data = await response.json();
    if (!response.ok || !data.ok)
      throw new Error(data.error || "Server unavailable");
    return data.data;
  };
  try {
    return await send(action, payload, requestId);
  } catch (error) {
    if (["leaderboard", "restore", "receipt"].includes(action)) throw error;
    try {
      const receipt = await send(
        "receipt",
        { ...payload, lookup: requestId },
        crypto.randomUUID(),
      );
      if (receipt.found) return receipt.result;
    } catch {
      /* Keep same ID on retry. */
    }
    throw error;
  }
}
