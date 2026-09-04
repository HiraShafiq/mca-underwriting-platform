# MCA Underwriting Intelligence

An AI-powered underwriting platform built for Merchant Cash Advance (MCA) file review and decision support.

The platform analyzes business bank statements, identifies existing financing positions, evaluates cash-flow risk, detects NSFs and negative balance activity, and generates structured funding recommendations for underwriter review.

## Live Demo

https://mca-underwriting-platform.vercel.app/

> For demonstration purposes, use synthetic or redacted bank statements only.

## Key Features

- Multi-month bank statement analysis
- Average monthly revenue calculation
- NSF and negative balance detection
- Existing MCA position identification
- Estimated outstanding balance and payment analysis
- Risk flag and positive-factor detection
- Automated risk rating
- Position-based underwriting logic
- Funding amount recommendations
- Daily and weekly payment calculations
- Approval and decline workflow
- AI-generated closing scripts
- Underwriting dashboard with historical decisions
- Client-side PDF text extraction
- Secure server-side Anthropic API integration

## How It Works

```text
Bank Statements
      ↓
PDF Text Extraction
      ↓
Vercel Serverless API
      ↓
AI Underwriting Analysis
      ↓
Risk Assessment
      ↓
Funding Recommendation
      ↓
Underwriter Review
```

The frontend never receives the Anthropic API key. AI requests are routed through Vercel server-side functions using environment variables.

## Technology Stack

- React
- Vite
- JavaScript
- Anthropic Claude API
- PDF.js
- Vercel Serverless Functions
- Browser localStorage

## Security Architecture

The Anthropic API key is stored only as a server-side environment variable:

```js
process.env.ANTHROPIC_API_KEY
```

It is never embedded in frontend JavaScript.

The application also includes request validation, security headers, server-side underwriting logic, environment-based secret management, and best-effort API rate limiting. For strict distributed production rate limiting, use Vercel Firewall or a shared rate-limit store.

## Data Handling

- PDFs are opened locally in the user's browser.
- PDF.js extracts statement text client-side.
- Extracted text is sent to `/api/analyze`.
- The serverless backend communicates with Anthropic.
- Uploaded PDFs are not intentionally stored by the application.
- Dashboard records remain in browser `localStorage`.
- No production database is included.

## Local Development

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env
```

Add your Anthropic credentials to `.env`:

```text
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Run:

```bash
npm run dev
```

Then open `http://localhost:5173`.

## Vercel Deployment

Add these Environment Variables in Vercel:

```text
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
```

Do not place the Anthropic key in a `VITE_` variable or commit it to GitHub.

The production API endpoints are implemented as Vercel serverless functions:

```text
/api/analyze
/api/closing-script
/api/health
```

## Project Structure

```text
mca-underwriting-platform/
├── api/
│   ├── analyze.js
│   ├── closing-script.js
│   └── health.js
├── lib/
│   └── ai.js
├── src/
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── README.md
├── SECURITY.md
├── server.js
├── vercel.json
└── vite.config.js
```

## Current Status

This project is a working prototype designed to demonstrate AI-assisted commercial underwriting workflows. AI-generated recommendations support human underwriting review and are not intended to replace final underwriting judgment.

## Disclaimer

This project is a demonstration of AI-assisted underwriting technology. It should not be used as a substitute for formal underwriting policies, compliance review, legal review, or human decision-making when processing real financial applications.
