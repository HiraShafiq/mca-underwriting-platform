# Security Notes

## Secrets

Never commit real secrets to this repository.

Server-only secrets:

- `ANTHROPIC_API_KEY`
- `APP_PASSWORD`

Public frontend configuration, if used:

- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`

Anything prefixed with `VITE_` must be assumed visible to users of the website.

## If a secret is accidentally committed

1. Revoke or rotate the secret immediately.
2. Remove it from the current code.
3. If the repository was shared, consider cleaning Git history too, but rotation is still required.

## Financial data

Use synthetic or redacted financial documents during demos. This starter does not claim PCI, SOC 2, GLBA, or other regulatory compliance.

## Access control

For a private demo, configure `APP_USERNAME` and `APP_PASSWORD` on Railway. Because Railway terminates public traffic over HTTPS, the Basic Auth credentials are protected in transit when using the HTTPS Railway domain. Do not expose this application over plain HTTP on an untrusted network.
