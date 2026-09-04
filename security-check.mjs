import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignored = new Set(["node_modules", "dist", ".git"]);
const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else scan(full);
  }
}

function scan(file) {
  const rel = path.relative(root, file);
  if (rel === ".env.example" || rel === "scripts/security-check.mjs") return;
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch { return; }

  const patterns = [
    [/sk-ant-[A-Za-z0-9_-]{20,}/g, "possible Anthropic API key"],
    [/x-api-key["']?\s*:\s*["']sk-/g, "possible hard-coded x-api-key"]
  ];

  for (const [regex, label] of patterns) {
    if (regex.test(text)) findings.push(`${rel}: ${label}`);
  }
}

walk(root);

if (findings.length) {
  console.error("Security check failed:\n" + findings.map(x => `- ${x}`).join("\n"));
  process.exit(1);
}

console.log("Security check passed: no obvious committed Anthropic secret found.");
