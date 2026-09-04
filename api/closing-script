import { applySecurityHeaders, callAnthropic, checkRateLimit, cleanText } from "../lib/ai.js";

export default async function handler(req, res) {
  applySecurityHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: "Too many AI requests. Please try again later." });
  }

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
    return res.status(200).json({ script });
  } catch (error) {
    console.error("Closing script error:", error?.message || error);
    return res.status(502).json({ error: "Script generation failed. " + (error?.message || "Unknown server error") });
  }
}
