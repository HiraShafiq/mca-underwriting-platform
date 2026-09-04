import { applySecurityHeaders } from "../lib/ai.js";

export default function handler(req, res) {
  applySecurityHeaders(res);
  return res.status(200).json({ ok: true, runtime: "vercel-serverless" });
}
