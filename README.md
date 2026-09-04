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
Secure Backend API
      ↓
AI Underwriting Analysis
      ↓
Risk Assessment
      ↓
Funding Recommendation
      ↓
Underwriter Review
```

The frontend never receives the Anthropic API key. AI requests are routed through the backend using server-side environment variables.

## Technology Stack

- React
- Vite
- Node.js
- Express
- Anthropic Claude API
- PDF.js
- Vercel
- JavaScript
- Browser localStorage

## Security Architecture

The Anthropic API key is stored only as a server-side environment variable:

```js
process.env.ANTHROPIC_API_KEY
```

It is never embedded in frontend JavaScript.

The application also includes:

- API rate limiting
- Request validation
- Security headers
- Server-side underwriting logic
- Optional application authentication
- Environment-based secret management

## Data Handling

In the current demo architecture:

- PDFs are opened locally in the user's browser.
- PDF.js extracts statement text client-side.
- Extracted text is sent to the secure `/api/analyze` endpoint.
- The backend communicates with Anthropic.
- Uploaded PDFs are not intentionally stored by the application.
- Dashboard records are stored locally in the user's browser using `localStorage`.
- No production database is currently used.

## Underwriting Workflow

The AI analysis produces structured underwriting information including:

- Business name
- Bank name
- Industry
- Monthly deposits
- Average monthly revenue
- Existing financing positions
- Estimated outstanding balances
- Daily or weekly payments
- NSF count
- Negative balance days
- Largest negative balance
- Risk factors
- Positive factors
- Overall risk rating

The platform then applies underwriting rules to generate a recommended funding amount and payment structure.

All AI-generated recommendations are intended to support human underwriting review, not replace final underwriting judgment.

## Local Development

Requires Node.js 20 or newer.

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Add your Anthropic credentials to `.env`:

```text
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Start the development environment:

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Environment Variables

Required:

```text
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
```

Optional:

```text
APP_USERNAME
APP_PASSWORD
ALLOWED_HOSTS
VITE_EMAILJS_SERVICE_ID
VITE_EMAILJS_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY
```

Never commit `.env` files or API credentials to GitHub.

## Project Structure

```text
mca-underwriting-platform/
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
└── vite.config.js
```

## Current Status

This project is a working prototype designed to demonstrate AI-assisted commercial underwriting workflows.

Future development may include:

- User authentication
- Multi-tenant lender accounts
- PostgreSQL persistence
- Custom lender underwriting policies
- Audit logging
- Role-based access control
- Expanded SBA, equipment financing, term loan, and commercial lending support

## Disclaimer

This project is a demonstration of AI-assisted underwriting technology. It should not be used as a substitute for formal underwriting policies, compliance review, legal review, or human decision-making when processing real financial applications.
