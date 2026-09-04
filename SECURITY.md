# Security Notes

## Secrets

Never commit real secrets to this repository.

Server-only secrets:

- `ANTHROPIC_API_KEY`

Optional browser-visible EmailJS configuration:

- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`

Anything prefixed with `VITE_` must be assumed visible to users of the website.

## Vercel environment variables

Store `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in Vercel Environment Variables. The Anthropic key is read only by the serverless API functions under `/api` and is never intentionally sent to the browser.

## If a secret is accidentally committed

1. Revoke or rotate the secret immediately.
2. Remove it from the current code.
3. Replace the value in Vercel Environment Variables.
4. If the repository was public, consider cleaning Git history too, but rotation is still required.

## Financial data

Use synthetic or redacted financial documents during demos. This prototype does not claim PCI, SOC 2, GLBA, or other regulatory compliance.

## Rate limiting

The serverless endpoints include best-effort per-instance rate limiting. That is useful as a guardrail but is not a strict distributed limit across all serverless instances. For a production deployment, use Vercel Firewall or a shared durable rate-limit store.

## Public demo access

The live demo can remain public for portfolio use. Before processing real customer data or deploying for multiple organizations, add formal authentication, authorization, audit logging, retention controls, and a security/compliance review.
