import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const UW = Object.freeze({
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

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: "1mb", strict: true }));

function safeEqual(a = "", b = "") {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function basicAuth(req, res, next) {
  const expectedUser = process.env.APP_USERNAME;
  const expectedPass = process.env.APP_PASSWORD;
  if (!expectedUser || !expectedPass) return next();

  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Underwriting Intelligence"');
    return res.status(401).send("Authentication required");
  }

  let decoded = "";
  try { decoded = Buffer.from(header.slice(6), "base64").toString("utf8"); } catch {}
  const colon = decoded.indexOf(":");
  const user = colon >= 0 ? decoded.slice(0, colon) : "";
  const pass = colon >= 0 ? decoded.slice(colon + 1) : "";

  if (!safeEqual(user, expectedUser) || !safeEqual(pass, expectedPass)) {
    res.set("WWW-Authenticate", 'Basic realm="Underwriting Intelligence"');
    return res.status(401).send("Invalid credentials");
  }
  next();
}

function hostGuard(req, res, next) {
  const configured = (process.env.ALLOWED_HOSTS || "")
    .split(",")
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
  if (!configured.length) return next();
  const host = String(req.headers.host || "").toLowerCase();
  const hostname = host.split(":")[0];
  if (configured.includes(host) || configured.includes(hostname)) return next();
  return res.status(403).json({ error: "Host not allowed" });
}

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(hostGuard);
app.use(basicAuth);

const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please try again later." }
});

function requireAnthropicKey(res) {
  if (ANTHROPIC_API_KEY) return true;
  res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  return false;
}

function cleanText(value, max = 25000) {
  return String(value ?? "").replace(/\u0000/g, "").slice(0, max);
}

function parseClaudeJson(raw) {
  const match = String(raw || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse Claude JSON response.");
  try { return JSON.parse(match[0]); }
  catch { return JSON.parse(match[0].replace(/[\x00-\x1F\x7F]/g, " ")); }
}

async function callAnthropic({ system, content, maxTokens }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
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

app.post("/api/analyze", aiLimiter, async (req, res) => {
  if (!requireAnthropicKey(res)) return;

  const texts = req.body?.texts;
  if (!Array.isArray(texts) || texts.length < 1 || texts.length > 6) {
    return res.status(400).json({ error: "Provide between 1 and 6 extracted statement texts." });
  }

  const cleaned = texts.map(t => cleanText(t)).filter(t => t.trim().length > 50);
  if (!cleaned.length) return res.status(400).json({ error: "No readable statement text was provided." });

  const combined = cleaned
    .map((text, i) => `=== STATEMENT ${i + 1} ===\n${text}`)
    .join("\n\n")
    .slice(0, 100_000);

  const system = `You are an expert MCA underwriter. Analyze the bank statement(s). Respond ONLY with a raw JSON object. No markdown. No backticks. Start with { end with }.
Return: {"businessName":"string","bankName":"string","industry":"string","monthlyDeposits":[numbers],"averageMonthlyRevenue":number,"existingPositions":[{"lender":"string","type":"MCA|CreditLine|TermLoan","estimatedBalance":number,"dailyOrWeeklyPayment":number,"frequency":"daily|weekly"}],"nsfCount":number,"negativeDays":number,"largestNegativeBalance":number,"riskFlags":["strings"],"positiveFactors":["strings"],"positionCount":number,"overallRiskRating":"Low|Medium|High|Decline","declineReason":"string or null"}
Identify MCAs such as OnDeck, Kabbage, Libertas, Yellowstone, Bluevine, Credibly, Rapid Finance, Forward Financing, Lendini, ANC Capital, Newtek, and similar lenders. If the statements are for a personal account, set overallRiskRating to Decline.`;

  try {
    const raw = await callAnthropic({
      system,
      content: `Statements:\n\n${combined}\n\nReturn ONLY JSON.`,
      maxTokens: 2000
    });
    const result = parseClaudeJson(raw);

    const positionCount = Math.max(0, Number(result.positionCount || 0));
    const approvedPosition = Math.min(positionCount + 1, UW.maxPositions);
    const pct = UW.fundPct[approvedPosition] ?? 0.25;
    const averageMonthlyRevenue = Math.max(0, Number(result.averageMonthlyRevenue || 0));
    const recommendedFunding = Math.max(0, Math.floor((averageMonthlyRevenue * pct) / 1000) * 1000);
    const qualified = result.overallRiskRating !== "Decline" && recommendedFunding >= 5000 && averageMonthlyRevenue >= UW.minRevenue;

    return res.json({
      ...result,
      positionCount,
      averageMonthlyRevenue,
      approvedPosition,
      recommendedFunding,
      qualified,
      offerConfig: {
        factorRate: UW.factorRate,
        terms: UW.terms
      }
    });
  } catch (error) {
    console.error("Analyze error:", error.message);
    return res.status(502).json({ error: "Analysis failed. " + error.message });
  }
});

app.post("/api/closing-script", aiLimiter, async (req, res) => {
  if (!requireAnthropicKey(res)) return;

  const approval = req.body?.approval;
  if (!approval || typeof approval !== "object") {
    return res.status(400).json({ error: "Approval details are required." });
  }

  const prompt = `Generate a professional closing script for a Merchant Cash Advance (MCA) funding specialist to use on a phone call with the business owner. The deal details are:

Business: ${cleanText(approval.businessName, 200)}
Funded Amount: $${Number(approval.fundedAmount || 0).toLocaleString("en-US")}
Factor Rate: ${Number(approval.factorRate || 0)}x
Payback Amount: $${Number(approval.paybackAmount || 0).toLocaleString("en-US")}
Term: ${cleanText(approval.term, 100)}
Payment: $${Number(approval.paymentAmount || 0).toLocaleString("en-US")} ${cleanText(approval.paymentType, 30)}
Position: ${Number(approval.position || 0)}
${approval.note ? `Notes: ${cleanText(approval.note, 1000)}` : ""}

Write a natural, conversational phone script that:
1. Opens with a warm but professional intro
2. Presents the offer clearly and confidently
3. Handles the 3 most common objections: payment too high, need more money, need to think about it
4. Has a clear closing ask with urgency
5. Has a fallback if they say no

Format with clear sections: OPENING, PRESENT OFFER, OBJECTION HANDLERS, CLOSE, FALLBACK. Keep it natural, not robotic. This is a direct client, no broker.`;

  try {
    const script = await callAnthropic({ content: prompt, maxTokens: 1500 });
    return res.json({ script });
  } catch (error) {
    console.error("Closing script error:", error.message);
    return res.status(502).json({ error: "Script generation failed. " + error.message });
  }
});

if (process.env.NODE_ENV === "production") {
  const dist = path.join(__dirname, "dist");
  app.use(express.static(dist, {
    maxAge: "1h",
    setHeaders(res, filePath) {
      if (filePath.endsWith("index.html")) res.setHeader("Cache-Control", "no-store");
    }
  }));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
} else {
  app.get("/", (_req, res) => res.type("text").send("API server is running. Open Vite at http://localhost:5173"));
}

app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Underwriting server listening on port ${PORT}`);
});
