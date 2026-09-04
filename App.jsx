import { useState, useRef, useEffect } from "react";

// ── DESIGN TOKENS ──────────────────────────────────────────────
// Premium institutional: near-black ground, platinum text, electric blue accent
// Signature: animated count-up metrics bar + hairline rule system
const T = {
  bg:       "#07090F",
  surface:  "#0C1018",
  raised:   "#111720",
  border:   "#1C2333",
  borderLt: "#253047",
  blue:     "#3B7BF8",
  blueDim:  "#1E3A7A",
  blueMid:  "#2563EB",
  gold:     "#B8922A",
  goldLt:   "#D4A843",
  green:    "#16A86A",
  greenDim: "#0A3D28",
  red:      "#DC3545",
  redDim:   "#3D0F14",
  amber:    "#D97706",
  text:     "#E2E8F4",
  textMid:  "#8896AE",
  textDim:  "#4A566A",
  mono:     "'Courier New', 'Lucida Console', monospace",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; color: ${T.text}; font-family: 'Inter', system-ui, sans-serif; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: ${T.surface}; } ::-webkit-scrollbar-thumb { background: ${T.borderLt}; }
  .row-hover:hover { background: ${T.raised} !important; transition: background 0.15s; }
  .btn-hover:hover { opacity: 0.88; transform: translateY(-1px); transition: all 0.15s; }
  @keyframes countUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
`;

// ── UTILITIES ──────────────────────────────────────────────────
function fmt(n) { return Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }
function fmtShort(n) { return n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : fmt(n); }
function posLabel(n) { return n === 1 ? "1ST" : n === 2 ? "2ND" : n === 3 ? "3RD" : `${n}TH`; }
function calcPayment(funded, fr, weeks, type) { const t = funded * fr; return type === "daily" ? (t / (weeks * 5)).toFixed(2) : (t / weeks).toFixed(2); }

// ── CONFIG ─────────────────────────────────────────────────────
const EMAILJS = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || "",
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "",
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "",
};

// ── COUNT-UP HOOK ──────────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

// ── UI PRIMITIVES ──────────────────────────────────────────────
function Divider({ my = 0 }) {
  return <div style={{ borderTop: `1px solid ${T.border}`, margin: `${my}px 0` }} />;
}

function Label({ children, color }) {
  const c = color === "green" ? { bg: T.greenDim, text: T.green, border: "#16A86A33" }
    : color === "red"   ? { bg: T.redDim,   text: T.red,   border: "#DC354533" }
    : color === "amber" ? { bg: "#2D1800",   text: T.amber, border: "#D9770633" }
    : color === "blue"  ? { bg: T.blueDim,   text: T.blue,  border: "#3B7BF833" }
    : color === "gold"  ? { bg: "#1E1500",   text: T.goldLt,border: "#B8922A33" }
    :                     { bg: T.raised,    text: T.textMid,border: T.border };
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 3, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

function MetricTile({ label, value, sub, accent, animate }) {
  const num = animate ? useCountUp(typeof value === "number" ? value : 0) : null;
  const display = animate && typeof value === "number" ? num : value;
  return (
    <div style={{ padding: "20px 24px", borderRight: `1px solid ${T.border}`, animation: "countUp 0.6s ease forwards" }}>
      <div style={{ color: T.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ color: accent || T.text, fontSize: 28, fontWeight: 800, fontFamily: T.mono, letterSpacing: -1, lineHeight: 1 }}>{display}</div>
      {sub && <div style={{ color: T.textDim, fontSize: 11, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── PDF EXTRACTION ─────────────────────────────────────────────
async function extractPDFText(base64) {
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = res; s.onerror = () => rej(new Error("PDF reader failed to load"));
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const bin = atob(base64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const c = await page.getTextContent();
    text += c.items.map(x => x.str).join(" ") + "\n";
  }
  return text.trim();
}

// ── CLAUDE API ─────────────────────────────────────────────────
async function analyzeStatements(texts) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `API error ${res.status}`);
  return data;
}

// ── EMAIL ──────────────────────────────────────────────────────
async function sendViaEmailJS(approval, to) {
  if (!EMAILJS.serviceId || !EMAILJS.templateId || !EMAILJS.publicKey) throw new Error("EmailJS is not configured");
  if (!window.emailjs) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js";
      s.onload = res; s.onerror = () => rej(new Error("EmailJS failed"));
      document.head.appendChild(s);
    });
    window.emailjs.init(EMAILJS.publicKey);
  }
  return window.emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, {
    to_email: to, business_name: approval.businessName,
    position: `${posLabel(approval.position)} POSITION`,
    funded_amount: fmt(approval.fundedAmount), factor_rate: `${approval.factorRate}x`,
    payback_amount: fmt(approval.paybackAmount), term: approval.term,
    payment_amount: `$${Number(approval.paymentAmount).toLocaleString()} / ${approval.paymentType}`,
    underwriter_notes: approval.note || "None", timestamp: approval.timestamp,
  });
}

// ── CLOSING SCRIPT GENERATOR ───────────────────────────────────
async function generateClosingScript(approval) {
  const res = await fetch("/api/closing-script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approval }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `API error ${res.status}`);
  return data.script || "Failed to generate script.";
}

// ── MAIN APP ───────────────────────────────────────────────────
export default function App() {
  const [view, setView]           = useState("dashboard");
  const [step, setStep]           = useState("upload");
  const [files, setFiles]         = useState([]);
  const [analysis, setAnalysis]   = useState(null);
  const [approval, setApproval]   = useState(null);
  const [selTerm, setSelTerm]     = useState(0);
  const [uwNote, setUwNote]       = useState("");
  const [error, setError]         = useState(null);
  const [brokerEmail, setBrokerEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailErr, setEmailErr]   = useState("");
  const [closingMode, setClosingMode] = useState(null); // null | "broker" | "direct"
  const [script, setScript]       = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const [selRecord, setSelRecord] = useState(null);
  const [dashFilter, setDashFilter] = useState("all");
  const [records, setRecords]     = useState(() => { try { return JSON.parse(localStorage.getItem("ptf_uw") || "[]"); } catch { return []; } });
  const fileRef = useRef();

  useEffect(() => { localStorage.setItem("ptf_uw", JSON.stringify(records)); }, [records]);

  const approved = records.filter(r => r.status === "approved");
  const declined = records.filter(r => r.status === "declined");
  const totalFunded = approved.reduce((s, r) => s + (r.fundedAmount || 0), 0);
  const approvalRate = records.length ? Math.round(approved.length / records.length * 100) : 0;
  const filtered = records.filter(r => dashFilter === "all" || r.status === dashFilter);

  function saveRecord(rec) { setRecords(p => [rec, ...p]); }

  function handleFileSelect(fl) {
    const pdfs = Array.from(fl).filter(f => f.type === "application/pdf");
    if (!pdfs.length) { setError("PDF files only."); return; }
    if (pdfs.length > 6) { setError("Max 6 files."); return; }
    setFiles(pdfs); setError(null);
  }

  async function handleAnalyze() {
    if (!files.length) { setError("Select at least one statement."); return; }
    setError(null); setStep("analyzing");
    try {
      const texts = await Promise.all(files.map(async f => {
        const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
        return extractPDFText(b64);
      }));
      const valid = texts.filter(t => t && t.length > 50);
      if (!valid.length) throw new Error("Could not read PDF — must be text-based, not scanned.");
      const result = await analyzeStatements(valid);
      setAnalysis(result);
      setStep("results");
    } catch (e) { setError("Analysis failed: " + e.message); setStep("upload"); }
  }

  function handleApprove() {
    const term = analysis.offerConfig.terms[selTerm] || analysis.offerConfig.terms[0];
    const funded = analysis.recommendedFunding;
    const appr = {
      id: Date.now(), status: "approved",
      businessName: analysis.businessName, industry: analysis.industry,
      fundedAmount: funded, factorRate: analysis.offerConfig.factorRate,
      paybackAmount: (funded * analysis.offerConfig.factorRate).toFixed(2), term: term.label,
      paymentType: term.payment, paymentAmount: calcPayment(funded, analysis.offerConfig.factorRate, term.weeks, term.payment),
      position: analysis.approvedPosition, note: uwNote,
      riskRating: analysis.overallRiskRating, avgRevenue: analysis.averageMonthlyRevenue,
      nsfCount: analysis.nsfCount, positionCount: analysis.positionCount,
      timestamp: new Date().toLocaleString(), brokerEmail: "",
    };
    setApproval(appr); saveRecord(appr);
    setClosingMode(null); setScript(""); setEmailStatus(null); setEmailErr("");
    setStep("approved");
  }

  function handleDecline() {
    saveRecord({ id: Date.now(), status: "declined", businessName: analysis.businessName, industry: analysis.industry, riskRating: analysis.overallRiskRating, avgRevenue: analysis.averageMonthlyRevenue, nsfCount: analysis.nsfCount, declineReason: analysis.declineReason || "Manual decline by underwriter", timestamp: new Date().toLocaleString() });
    reset();
  }

  async function handleSendEmail() {
    if (!brokerEmail) return;
    setEmailStatus("sending"); setEmailErr("");
    try { await sendViaEmailJS(approval, brokerEmail); setEmailStatus("sent"); setRecords(p => p.map(r => r.id === approval.id ? { ...r, brokerEmail } : r)); }
    catch { setEmailStatus("error"); setEmailErr("EmailJS is not configured. Add the optional VITE_EMAILJS_* variables in Railway."); }
  }

  async function handleGetScript() {
    setScriptLoading(true); setScript("");
    try { const s = await generateClosingScript(approval); setScript(s); }
    catch { setScript("Failed to generate script. Check API key."); }
    setScriptLoading(false);
  }

  function reset() { setStep("upload"); setAnalysis(null); setApproval(null); setUwNote(""); setFiles([]); setBrokerEmail(""); setEmailStatus(null); setEmailErr(""); setClosingMode(null); setScript(""); }

  // ── NAV BAR ──────────────────────────────────────────────────
  const Nav = () => (
    <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 28px", height: 52, position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 40 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.blue, boxShadow: `0 0 8px ${T.blue}` }} />
        <span style={{ color: T.text, fontWeight: 800, fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase" }}>Prime Time Funders</span>
        <span style={{ color: T.textDim, fontSize: 11, fontWeight: 500, letterSpacing: 0.5, marginLeft: 4 }}>/ Underwriting Intelligence</span>
      </div>
      <div style={{ display: "flex", gap: 0 }}>
        {[["dashboard","DASHBOARD"],["analyze","NEW FILE"]].map(([v, label]) => (
          <button key={v} onClick={() => { setView(v); if (v==="analyze") reset(); }}
            style={{ background: "none", border: "none", borderBottom: view===v ? `2px solid ${T.blue}` : "2px solid transparent", color: view===v ? T.blue : T.textMid, fontWeight: 700, fontSize: 11, letterSpacing: 1.5, padding: "0 18px", height: 52, cursor: "pointer", transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ color: T.textDim, fontSize: 11, fontWeight: 500 }}>{records.length} FILES REVIEWED</span>
        <div style={{ width: 1, height: 20, background: T.border }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} />
          <span style={{ color: T.green, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>SYSTEM ACTIVE</span>
        </div>
      </div>
    </div>
  );

  // ── DASHBOARD VIEW ────────────────────────────────────────────
  if (view === "dashboard") return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      <style>{CSS}</style>
      <Nav />

      {/* Metrics bar */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
        <MetricTile label="Total Files" value={records.length} sub="All time" accent={T.text} animate />
        <MetricTile label="Approved" value={approved.length} sub={`${approvalRate}% approval rate`} accent={T.green} animate />
        <MetricTile label="Declined" value={declined.length} sub="Did not qualify" accent={T.red} animate />
        <MetricTile label="Total Funded" value={fmtShort(totalFunded)} sub="Approved volume" accent={T.goldLt} />
        <MetricTile label="Avg Deal Size" value={approved.length ? fmtShort(totalFunded / approved.length) : "$0"} sub="Per approval" accent={T.blue} />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ color: T.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Underwriting Intelligence Platform</div>
            <div style={{ color: T.text, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>File Review Dashboard</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[["all","ALL"],["approved","APPROVED"],["declined","DECLINED"]].map(([f,label]) => (
              <button key={f} onClick={() => setDashFilter(f)}
                style={{ background: dashFilter===f ? T.blue : "none", color: dashFilter===f ? "#fff" : T.textMid, border: `1px solid ${dashFilter===f ? T.blue : T.border}`, borderRadius: 4, padding: "6px 14px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, cursor: "pointer", transition: "all 0.15s" }}>
                {label}
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: T.border, margin: "0 4px" }} />
            <button className="btn-hover" onClick={() => { setView("analyze"); reset(); }}
              style={{ background: T.blue, color: "#fff", border: "none", borderRadius: 4, padding: "7px 16px", fontSize: 10, fontWeight: 800, letterSpacing: 1.2, cursor: "pointer" }}>
              + ANALYZE FILE
            </button>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 64, textAlign: "center" }}>
            <div style={{ color: T.textDim, fontSize: 32, marginBottom: 16 }}>◈</div>
            <div style={{ color: T.textMid, fontWeight: 600, marginBottom: 8 }}>No files in this view</div>
            <div style={{ color: T.textDim, fontSize: 13, marginBottom: 24 }}>Analyze a bank statement to populate the dashboard</div>
            <button onClick={() => { setView("analyze"); reset(); }} style={{ background: T.blue, color: "#fff", border: "none", borderRadius: 4, padding: "10px 24px", fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>Analyze First File →</button>
          </div>
        ) : (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
            {/* Table head */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.1fr 0.8fr 0.8fr 0.9fr 0.7fr", padding: "10px 20px", borderBottom: `1px solid ${T.border}`, background: T.raised }}>
              {["BUSINESS","INDUSTRY","AVG REVENUE","NSFS","POSITION","STATUS",""].map((h,i) => (
                <div key={i} style={{ color: T.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 1.5 }}>{h}</div>
              ))}
            </div>
            {filtered.map((rec, i) => (
              <div key={rec.id} className="row-hover"
                style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.1fr 0.8fr 0.8fr 0.9fr 0.7fr", padding: "14px 20px", borderBottom: i < filtered.length-1 ? `1px solid ${T.border}` : "none", alignItems: "center", background: i%2===0 ? "transparent" : T.bg+"44" }}>
                <div>
                  <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{rec.businessName}</div>
                  <div style={{ color: T.textDim, fontSize: 10, marginTop: 2 }}>{rec.timestamp}</div>
                </div>
                <div style={{ color: T.textMid, fontSize: 12 }}>{rec.industry || "—"}</div>
                <div style={{ color: T.goldLt, fontWeight: 700, fontSize: 13, fontFamily: T.mono }}>{rec.avgRevenue ? fmt(rec.avgRevenue) : "—"}</div>
                <div style={{ color: (rec.nsfCount||0) > 2 ? T.red : T.textMid, fontWeight: 700, fontSize: 13 }}>{rec.nsfCount ?? "—"}</div>
                <div style={{ color: T.textMid, fontSize: 12 }}>{rec.position ? `${posLabel(rec.position)} POS` : "—"}</div>
                <div><Label color={rec.status==="approved" ? "green" : "red"}>{rec.status==="approved" ? "APPROVED" : "DECLINED"}</Label></div>
                <div>
                  {rec.status === "approved" && (
                    <button className="btn-hover" onClick={() => setSelRecord(rec)}
                      style={{ background: "none", color: T.blue, border: `1px solid ${T.blueDim}`, borderRadius: 3, padding: "4px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, cursor: "pointer" }}>
                      VIEW
                    </button>
                  )}
                  {rec.status === "declined" && <div style={{ color: T.textDim, fontSize: 10 }}>{rec.declineReason?.slice(0,30)}...</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record modal */}
      {selRecord && (
        <div style={{ position: "fixed", inset: 0, background: "#000C", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setSelRecord(null)}>
          <div style={{ background: T.surface, border: `1px solid ${T.borderLt}`, borderRadius: 8, padding: 32, maxWidth: 480, width: "92%", animation: "slideIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ color: T.textDim, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Approval Detail</div>
                <div style={{ color: T.text, fontWeight: 800, fontSize: 18 }}>{selRecord.businessName}</div>
                <div style={{ color: T.textMid, fontSize: 12, marginTop: 2 }}>{selRecord.industry}</div>
              </div>
              <button onClick={() => setSelRecord(null)} style={{ background: "none", border: "none", color: T.textDim, fontSize: 20, cursor: "pointer", padding: 4 }}>×</button>
            </div>
            <Divider my={0} />
            {[["Funded Amount", fmt(selRecord.fundedAmount), T.goldLt], ["Factor Rate", `${selRecord.factorRate}x`, T.text], ["Payback Amount", fmt(selRecord.paybackAmount), T.text], ["Term", selRecord.term, T.text], ["Payment", `$${Number(selRecord.paymentAmount||0).toLocaleString()} / ${selRecord.paymentType}`, T.green], ["Position", `${posLabel(selRecord.position)} Position`, T.text]].map(([lbl,val,col]) => (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ color: T.textMid, fontSize: 13 }}>{lbl}</span>
                <span style={{ color: col, fontWeight: 700, fontSize: 13, fontFamily: T.mono }}>{val}</span>
              </div>
            ))}
            {selRecord.note && <div style={{ marginTop: 12, color: T.textMid, fontSize: 12 }}><span style={{ color: T.text, fontWeight: 600 }}>Note: </span>{selRecord.note}</div>}
            {selRecord.brokerEmail && <div style={{ marginTop: 6, color: T.textDim, fontSize: 11 }}>Sent to: {selRecord.brokerEmail}</div>}
            <div style={{ marginTop: 12, color: T.textDim, fontSize: 10 }}>{selRecord.timestamp}</div>
            <button className="btn-hover" onClick={() => { navigator.clipboard.writeText(`APPROVAL — ${selRecord.businessName}\n${posLabel(selRecord.position)} POSITION\nFunded: ${fmt(selRecord.fundedAmount)}\nFactor: ${selRecord.factorRate}x\nPayback: ${fmt(selRecord.paybackAmount)}\nTerm: ${selRecord.term}\nPayment: $${selRecord.paymentAmount}/${selRecord.paymentType}`); }}
              style={{ marginTop: 16, width: "100%", background: T.blue, color: "#fff", border: "none", borderRadius: 4, padding: "10px 0", fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>
              COPY OFFER TO CLIPBOARD
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── ANALYZE VIEW ──────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      <style>{CSS}</style>
      <Nav />

      {/* UPLOAD */}
      {step === "upload" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 52px)", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 580 }}>
            <div style={{ marginBottom: 40, textAlign: "center" }}>
              <div style={{ color: T.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>Prime Time Funders</div>
              <div style={{ color: T.text, fontSize: 38, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1 }}>AI Underwriting<br /><span style={{ color: T.blue }}>Intelligence</span></div>
              <div style={{ color: T.textMid, fontSize: 14, marginTop: 14, lineHeight: 1.6 }}>Upload up to 6 months of bank statements.<br />Analyzed together for maximum accuracy.</div>
            </div>

            <div
              onClick={() => fileRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
              style={{ border: `1px solid ${files.length ? T.blue : T.border}`, borderRadius: 6, background: T.surface, padding: "48px 32px", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s", marginBottom: 16 }}>
              <div style={{ color: files.length ? T.blue : T.textDim, fontSize: 36, marginBottom: 14 }}>⬆</div>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                {files.length ? `${files.length} statement${files.length > 1 ? "s" : ""} selected` : "Drop bank statements here"}
              </div>
              <div style={{ color: T.textDim, fontSize: 12, marginBottom: 18 }}>
                {files.length ? files.map(f => f.name).join(" · ") : "PDF format only — up to 6 files"}
              </div>
              <div style={{ display: "inline-block", background: files.length ? T.blue : T.raised, color: files.length ? "#fff" : T.textMid, border: `1px solid ${files.length ? T.blue : T.border}`, borderRadius: 4, padding: "8px 20px", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                {files.length ? "CHANGE FILES" : "SELECT FILES"}
              </div>
              <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={e => handleFileSelect(e.target.files)} />
            </div>

            {files.length > 0 && (
              <button className="btn-hover" onClick={handleAnalyze}
                style={{ width: "100%", background: T.blue, color: "#fff", border: "none", borderRadius: 5, padding: "15px 0", fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase" }}>
                ⚡ Analyze {files.length} Statement{files.length > 1 ? "s" : ""} Now
              </button>
            )}
            {error && <div style={{ color: T.red, marginTop: 12, fontSize: 12, textAlign: "center" }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 28 }}>
              {[["⬡","Position Detection","Identifies all MCA lenders by name"],["⬡","Risk Analysis","NSFs, negatives, stacking risk"],["⬡","Funding Calc","Recommends amount, rate & terms"]].map(([icon,title,sub]) => (
                <div key={title} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 5, padding: "14px 12px", textAlign: "center" }}>
                  <div style={{ color: T.blue, fontSize: 18, marginBottom: 6 }}>{icon}</div>
                  <div style={{ color: T.text, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{title}</div>
                  <div style={{ color: T.textDim, fontSize: 10, lineHeight: 1.4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANALYZING */}
      {step === "analyzing" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 52px)" }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 40, marginBottom: 20, display: "inline-block", animation: "spin 1.5s linear infinite", color: T.blue }}>◈</div>
            <div style={{ color: T.text, fontSize: 18, fontWeight: 800, letterSpacing: -0.5, marginBottom: 24 }}>Analyzing {files.length} Statement{files.length > 1 ? "s" : ""}...</div>
            {["Extracting text from PDFs","Identifying MCA positions by lender","Calculating revenue averages","Flagging risk factors","Generating funding recommendation"].map((s,i) => (
              <div key={i} style={{ color: T.textMid, fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue, flexShrink: 0 }} />{s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULTS */}
      {step === "results" && analysis && (() => {
        const term = analysis.offerConfig.terms[selTerm] || analysis.offerConfig.terms[0];
        const funded = analysis.recommendedFunding;
        const payback = (funded * analysis.offerConfig.factorRate).toFixed(2);
        const payment = calcPayment(funded, analysis.offerConfig.factorRate, term.weeks, term.payment);
        const canFund = Boolean(analysis.qualified);
        const riskColor = { Low: T.green, Medium: T.amber, High: T.red, Decline: T.red }[analysis.overallRiskRating] || T.textMid;
        return (
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }}>
            {/* Report header */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "20px 24px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: T.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Underwriting Report · {files.length} Statement{files.length>1?"s":""} Analyzed</div>
                <div style={{ color: T.text, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{analysis.businessName}</div>
                <div style={{ color: T.textMid, fontSize: 12, marginTop: 4 }}>{analysis.bankName} · {analysis.industry}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: T.textDim, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Risk Rating</div>
                <div style={{ color: riskColor, fontWeight: 800, fontSize: 20, fontFamily: T.mono }}>{analysis.overallRiskRating}</div>
              </div>
            </div>

            {/* Key metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                ["AVG MONTHLY REVENUE", fmt(analysis.averageMonthlyRevenue), `${analysis.monthlyDeposits?.length||0} months analyzed`, T.goldLt],
                ["EXISTING POSITIONS", analysis.positionCount, `Approving as ${posLabel(analysis.approvedPosition)} position`, analysis.positionCount >= 3 ? T.red : T.text],
                ["NSF COUNT", analysis.nsfCount, `${analysis.negativeDays} negative balance day${analysis.negativeDays!==1?"s":""}`, analysis.nsfCount > 5 ? T.red : analysis.nsfCount > 2 ? T.amber : T.green],
              ].map(([lbl,val,sub,col]) => (
                <div key={lbl} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "16px 20px" }}>
                  <div style={{ color: T.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{lbl}</div>
                  <div style={{ color: col, fontSize: 28, fontWeight: 800, fontFamily: T.mono, letterSpacing: -1 }}>{val}</div>
                  <div style={{ color: T.textDim, fontSize: 11, marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Positions */}
            {analysis.existingPositions?.length > 0 && (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "16px 20px", marginBottom: 16 }}>
                <div style={{ color: T.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Identified Positions</div>
                {analysis.existingPositions.map((p,i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < analysis.existingPositions.length-1 ? `1px solid ${T.border}` : "none" }}>
                    <div>
                      <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{p.lender}</div>
                      <div style={{ color: T.textDim, fontSize: 11, marginTop: 2 }}>{p.type} · {p.frequency} payments</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: T.goldLt, fontWeight: 700, fontSize: 13, fontFamily: T.mono }}>{fmt(p.estimatedBalance)}</div>
                      <div style={{ color: T.textDim, fontSize: 11 }}>{fmt(p.dailyOrWeeklyPayment)}/{p.frequency==="daily"?"day":"week"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Risk / Strengths */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[["⚠ Risk Flags", T.red, analysis.riskFlags, T.redDim], ["✓ Strengths", T.green, analysis.positiveFactors, T.greenDim]].map(([title, col, items, bg]) => (
                <div key={title} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "16px 18px" }}>
                  <div style={{ color: col, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>{title}</div>
                  {items?.length > 0 ? items.map((f,i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <span style={{ color: col, fontSize: 10, flexShrink: 0, marginTop: 2 }}>▸</span>
                      <span style={{ color: T.textMid, fontSize: 12, lineHeight: 1.4 }}>{f}</span>
                    </div>
                  )) : <div style={{ color: T.textDim, fontSize: 12 }}>None identified</div>}
                </div>
              ))}
            </div>

            {/* Funding rec */}
            {canFund ? (
              <div style={{ background: T.surface, border: `1px solid ${T.blueDim}`, borderRadius: 6, padding: "20px 22px" }}>
                <div style={{ color: T.blue, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Funding Recommendation</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
                  {[["FUNDED",fmt(funded),T.goldLt],["FACTOR",`${analysis.offerConfig.factorRate}x`,T.text],["PAYBACK",fmt(payback),T.text],[`${term.payment==="daily"?"DAILY":"WEEKLY"} PMT`,`$${Number(payment).toLocaleString()}`,T.green]].map(([l,v,c]) => (
                    <div key={l} style={{ background: T.raised, borderRadius: 4, padding: "12px 14px" }}>
                      <div style={{ color: T.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>{l}</div>
                      <div style={{ color: c, fontSize: 20, fontWeight: 800, fontFamily: T.mono }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {analysis.offerConfig.terms.map((t,i) => (
                    <button key={i} onClick={() => setSelTerm(i)}
                      style={{ flex: 1, padding: "8px 0", background: selTerm===i ? T.blueDim : T.raised, border: `1px solid ${selTerm===i ? T.blue : T.border}`, color: selTerm===i ? T.blue : T.textMid, borderRadius: 4, fontWeight: 700, fontSize: 11, cursor: "pointer", letterSpacing: 0.5 }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <textarea placeholder="Underwriter notes (optional)..." value={uwNote} onChange={e => setUwNote(e.target.value)}
                  style={{ width: "100%", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "10px 12px", fontSize: 12, marginBottom: 14, resize: "vertical", minHeight: 48, boxSizing: "border-box", fontFamily: "inherit" }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-hover" onClick={handleApprove}
                    style={{ flex: 3, background: T.green, color: "#fff", border: "none", borderRadius: 4, padding: "13px 0", fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: 0.5 }}>
                    ✓ APPROVE & GENERATE OFFER
                  </button>
                  <button className="btn-hover" onClick={handleDecline}
                    style={{ flex: 1, background: "none", color: T.red, border: `1px solid ${T.red}55`, borderRadius: 4, padding: "13px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    ✕ DECLINE
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: T.redDim, border: `1px solid ${T.red}44`, borderRadius: 6, padding: 28, textAlign: "center" }}>
                <div style={{ color: T.red, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>File Does Not Qualify</div>
                <div style={{ color: T.textMid, fontSize: 13, marginBottom: 20 }}>{analysis.declineReason || "Revenue below minimum or risk too high"}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={handleDecline} style={{ background: T.red, color: "#fff", border: "none", borderRadius: 4, padding: "10px 20px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>LOG DECLINE</button>
                  <button onClick={reset} style={{ background: "none", color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 4, padding: "10px 20px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>← BACK</button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* APPROVED */}
      {step === "approved" && approval && (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ color: T.green, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>✓ Offer Approved</div>
            <div style={{ color: T.text, fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>{approval.businessName}</div>
            <div style={{ color: T.textDim, fontSize: 12, marginTop: 4 }}>Saved to dashboard · {approval.timestamp}</div>
          </div>

          {/* Offer card */}
          <div style={{ background: T.surface, border: `1px solid ${T.borderLt}`, borderRadius: 6, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
              <Label color="gold">{posLabel(approval.position)} POSITION</Label>
              <Label color="green">APPROVED</Label>
            </div>
            {[["Funded Amount",fmt(approval.fundedAmount),T.goldLt],["Factor Rate",`${approval.factorRate}x`,T.text],["Payback Amount",fmt(approval.paybackAmount),T.text],["Term",approval.term,T.text],[`${approval.paymentType==="daily"?"Daily":"Weekly"} Payment`,`$${Number(approval.paymentAmount).toLocaleString()}`,T.green]].map(([lbl,val,col]) => (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ color: T.textMid, fontSize: 13 }}>{lbl}</span>
                <span style={{ color: col, fontWeight: 700, fontSize: 14, fontFamily: T.mono }}>{val}</span>
              </div>
            ))}
            {approval.note && <div style={{ marginTop: 12, color: T.textDim, fontSize: 12 }}><span style={{ color: T.text }}>Note: </span>{approval.note}</div>}
          </div>

          {/* CLOSING MODE SELECTOR */}
          {!closingMode && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: T.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>How Are You Closing This Deal?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="btn-hover" onClick={() => setClosingMode("broker")}
                  style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "18px 16px", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ color: T.blue, fontSize: 18, marginBottom: 8 }}>📧</div>
                  <div style={{ color: T.text, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Send to Broker / ISO</div>
                  <div style={{ color: T.textDim, fontSize: 11, lineHeight: 1.4 }}>Email the offer to your broker for client closing</div>
                </button>
                <button className="btn-hover" onClick={() => setClosingMode("direct")}
                  style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "18px 16px", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ color: T.green, fontSize: 18, marginBottom: 8 }}>📞</div>
                  <div style={{ color: T.text, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Direct Client Closing</div>
                  <div style={{ color: T.textDim, fontSize: 11, lineHeight: 1.4 }}>Generate an AI closing script for your call</div>
                </button>
              </div>
            </div>
          )}

          {/* BROKER EMAIL */}
          {closingMode === "broker" && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ color: T.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Send to Broker / ISO</div>
                <button onClick={() => setClosingMode(null)} style={{ background: "none", border: "none", color: T.textDim, fontSize: 18, cursor: "pointer" }}>×</button>
              </div>
              <input type="email" placeholder="Broker email address..." value={brokerEmail} onChange={e => setBrokerEmail(e.target.value)}
                style={{ width: "100%", background: T.raised, border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, padding: "10px 12px", fontSize: 13, marginBottom: 10, boxSizing: "border-box", fontFamily: "inherit" }} />
              <button className="btn-hover" onClick={handleSendEmail} disabled={!brokerEmail || emailStatus === "sending" || emailStatus === "sent"}
                style={{ width: "100%", background: emailStatus==="sent" ? T.green : brokerEmail ? T.blue : T.raised, color: brokerEmail ? "#fff" : T.textDim, border: "none", borderRadius: 4, padding: "11px 0", fontWeight: 700, fontSize: 12, cursor: brokerEmail ? "pointer" : "not-allowed", letterSpacing: 0.5 }}>
                {emailStatus==="sending" ? "SENDING..." : emailStatus==="sent" ? "✓ EMAIL SENT" : "SEND APPROVAL EMAIL"}
              </button>
              {emailStatus==="error" && <div style={{ color: T.amber, fontSize: 11, marginTop: 8 }}>{emailErr}</div>}
              {emailStatus!=="sent" && <div style={{ color: T.textDim, fontSize: 10, marginTop: 8, textAlign: "center" }}>Optional EmailJS setup uses Railway VITE_EMAILJS_* variables</div>}
            </div>
          )}

          {/* DIRECT CLOSING SCRIPT */}
          {closingMode === "direct" && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ color: T.textDim, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>AI Closing Script</div>
                <button onClick={() => setClosingMode(null)} style={{ background: "none", border: "none", color: T.textDim, fontSize: 18, cursor: "pointer" }}>×</button>
              </div>
              {!script && !scriptLoading && (
                <button className="btn-hover" onClick={handleGetScript}
                  style={{ width: "100%", background: T.green, color: "#fff", border: "none", borderRadius: 4, padding: "12px 0", fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>
                  ⚡ GENERATE CLOSING SCRIPT
                </button>
              )}
              {scriptLoading && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ color: T.blue, fontSize: 24, animation: "spin 1.5s linear infinite", display: "inline-block" }}>◈</div>
                  <div style={{ color: T.textMid, fontSize: 12, marginTop: 8 }}>Generating personalized closing script...</div>
                </div>
              )}
              {script && (
                <>
                  <div style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: 4, padding: "16px 14px", maxHeight: 360, overflowY: "auto", marginBottom: 10 }}>
                    {script.split("\n").map((line, i) => (
                      <div key={i} style={{ color: line.match(/^(OPENING|PRESENT OFFER|OBJECTION|CLOSE|FALLBACK)/i) ? T.blue : line.startsWith("**") ? T.text : T.textMid, fontWeight: line.match(/^(OPENING|PRESENT OFFER|OBJECTION|CLOSE|FALLBACK)/i) ? 800 : 400, fontSize: 12, lineHeight: 1.6, marginBottom: line === "" ? 8 : 0 }}>
                        {line.replace(/\*\*/g, "")}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(script)}
                    style={{ width: "100%", background: T.raised, color: T.text, border: `1px solid ${T.border}`, borderRadius: 4, padding: "9px 0", fontWeight: 700, fontSize: 11, cursor: "pointer", letterSpacing: 0.5 }}>
                    COPY SCRIPT TO CLIPBOARD
                  </button>
                </>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-hover" onClick={reset}
              style={{ flex: 1, background: "none", color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 4, padding: "11px 0", fontWeight: 700, fontSize: 11, cursor: "pointer", letterSpacing: 0.5 }}>
              ← ANALYZE NEW FILE
            </button>
            <button className="btn-hover" onClick={() => navigator.clipboard.writeText(`APPROVAL — ${approval.businessName}\n${posLabel(approval.position)} POSITION\nFunded: ${fmt(approval.fundedAmount)}\nFactor: ${approval.factorRate}x\nPayback: ${fmt(approval.paybackAmount)}\nTerm: ${approval.term}\nPayment: $${approval.paymentAmount}/${approval.paymentType}`)}
              style={{ flex: 1, background: T.raised, color: T.text, border: `1px solid ${T.border}`, borderRadius: 4, padding: "11px 0", fontWeight: 700, fontSize: 11, cursor: "pointer", letterSpacing: 0.5 }}>
              📋 COPY OFFER
            </button>
            <button className="btn-hover" onClick={() => setView("dashboard")}
              style={{ flex: 1, background: T.blue, color: "#fff", border: "none", borderRadius: 4, padding: "11px 0", fontWeight: 700, fontSize: 11, cursor: "pointer", letterSpacing: 0.5 }}>
              📊 DASHBOARD
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
