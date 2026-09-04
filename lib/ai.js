const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export const UW = Object.freeze({
  factorRate: 1.49,
  minRevenue: 50000,
  maxPositions: 3,
  terms: [
    { label: "28W Daily", weeks: 28, payment: "daily" },
    { label: "30W Weekly", weeks: 30, payment: "weekly" },
    { label: "52W Daily", weeks: 52, payment: "daily" }
  ],
  fundPct: { 1: 1.0, 2: 0.65, 3: 0.35 }
});

export function cleanText(value, max = 25000) {
  return String(value ?? "").replace(/\u0000/g, "").slice(0, max);
}

export function parseClaudeJson(raw) {
  const match = String(raw || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse Claude JSON response.");
  try {
    return JSON.parse(match[0]);
  } catch {
    return JSON.parse(match[0].replace(/[\x00-\x1F\x7F]/g, " "));
  }
}

export async function callAnthropic({ system, content, maxTokens }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured on the server.");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content }]
    }),
    signal: AbortSignal.timeout(60_000)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Anthropic API error ${response.status}`;
    throw new Error(message);
  }
  return data.content?.find(block => block.type === "text")?.text || "";
}

export function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");
}

// Best-effort per-instance rate limiting for serverless functions.
// For strict distributed rate limiting, use Vercel Firewall or a shared store.
const buckets = globalThis.__mcaRateBuckets || new Map();
globalThis.__mcaRateBuckets = buckets;

export function checkRateLimit(req, { limit = 10, windowMs = 10 * 60 * 1000 } = {}) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  const ip = forwarded.split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const current = buckets.get(ip);

  if (!current || now - current.start >= windowMs) {
    buckets.set(ip, { start: now, count: 1 });
    return true;
  }

  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
