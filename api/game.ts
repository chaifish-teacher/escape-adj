import type { IncomingMessage, ServerResponse } from "node:http";
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "POST required" }));
    return;
  }
  const url = process.env.GAS_WEB_APP_URL,
    secret = process.env.GAS_PROXY_SECRET;
  if (!url || !secret) {
    res.statusCode = 503;
    res.end(
      JSON.stringify({ ok: false, error: "Online records are not configured" }),
    );
    return;
  }
  try {
    const input =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!input || typeof input !== "object") throw new Error("Invalid request");
    const body = input as Record<string, unknown>;
    if (JSON.stringify(body).length > 20000)
      throw new Error("Request too large");
    const upstream = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, proxySecret: secret }),
      signal: AbortSignal.timeout(25000),
    });
    const output = await upstream.json();
    res.statusCode = output.ok ? 200 : 400;
    res.end(JSON.stringify(output));
  } catch {
    res.statusCode = 502;
    res.end(
      JSON.stringify({
        ok: false,
        error: "Records service unavailable. Retry with the same request ID.",
      }),
    );
  }
}
