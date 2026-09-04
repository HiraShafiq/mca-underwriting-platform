import { applySecurityHeaders, callAnthropic, checkRateLimit, cleanText, parseClaudeJson, UW } from "../lib/ai.js";

export default async function handler(req, res) {
  applySecurityHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: "Too many AI requests. Please try again later." });
  }

  const texts = req.body?.texts;
  if (!Array.isArray(texts) || texts.length < 1 || texts.length > 6) {
    return res.status(400).json({ error: "Provide between 1 and 6 extracted statement texts." });
  }

  const cleaned = texts.map(t => cleanText(t)).filter(t => t.trim().length > 50);
  if (!cleaned.length) {
    return res.status(400).json({ error: "No readable statement text was provided." });
  }

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

    return res.status(200).json({
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
    console.error("Analyze error:", error?.message || error);
    return res.status(502).json({ error: "Analysis failed. " + (error?.message || "Unknown server error") });
  }
}
