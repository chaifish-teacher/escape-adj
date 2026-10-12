import { GOOGLE_SCRIPT_URL } from "./recording-config";
export type RecordEntry = {
  playerId: string;
  name: string;
  activity: "login" | "vocab" | "listen" | "spell" | "escape";
  score?: number;
  total?: number;
  wrong?: number;
  elapsed?: number;
};
type Job = RecordEntry & { requestId: string };
const key = "tower-sheet-records-v1";
let running = false;
export function hasSimpleRecording() {
  return Boolean(GOOGLE_SCRIPT_URL);
}
function jobs(): Job[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function notify() {
  window.dispatchEvent(new Event("tower-recording"));
}
export function pendingRecords() {
  return jobs().length;
}
export function record(entry: RecordEntry) {
  if (!hasSimpleRecording()) return;
  const job = { ...entry, requestId: crypto.randomUUID() };
  localStorage.setItem(key, JSON.stringify([...jobs(), job]));
  notify();
  void flushRecords();
}
function receipt(requestId: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const callback = `towerReceipt_${crypto.randomUUID().replaceAll("-", "_")}`;
    const callbacks = window as unknown as Record<string, unknown>;
    const script = document.createElement("script");
    const cleanup = () => {
      clearTimeout(timer);
      script.remove();
      delete callbacks[callback];
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Receipt timed out"));
    }, 15000);
    callbacks[callback] = (data: { saved?: boolean }) => {
      cleanup();
      resolve(data.saved === true);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Receipt unavailable"));
    };
    const url = new URL(GOOGLE_SCRIPT_URL);
    url.searchParams.set("requestId", requestId);
    url.searchParams.set("callback", callback);
    script.src = url.toString();
    document.head.appendChild(script);
  });
}
export async function flushRecords() {
  if (running || !hasSimpleRecording() || !navigator.onLine) return;
  running = true;
  try {
    for (const job of jobs()) {
      // A lost response does not imply the Sheet write failed. Check its receipt first.
      if (!(await receipt(job.requestId))) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(job),
          signal: AbortSignal.timeout(20000),
        });
        // no-cors POST has an opaque response; confirm via the read-only JSONP receipt.
        if (!(await receipt(job.requestId)))
          throw new Error("Write not yet confirmed");
      }
      localStorage.setItem(
        key,
        JSON.stringify(jobs().filter((j) => j.requestId !== job.requestId)),
      );
      notify();
    }
  } catch {
    // Keep the same request IDs for the next retry. Never label opaque POSTs as saved.
  } finally {
    running = false;
  }
}
