# MCA Underwriting Intelligence

This project is a secured full-stack version underwriting agent.


## Important privacy note

This application handles financial information. Do not treat this starter project as a substitute for a formal security, privacy, or compliance review before processing real customer data at scale. For demos, use redacted or synthetic statements whenever possible.

## 1. Local setup

Install Node.js 20 or newer, then:

```bash
npm install
cp .env.example .env
```

Edit `.env` and add your Anthropic API key.

For local development:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The backend runs on port 3000 and Vite proxies `/api` requests to it.

## 2. Test a production build locally

```bash
npm run build
NODE_ENV=production npm start
```

Then open:

```text
http://localhost:3000
```

## 3. Push to GitHub

Create a private GitHub repository first. From this project folder:

```bash
git init
git add .
git commit -m "Initial secure underwriting platform"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Do not commit `.env`. It is already blocked by `.gitignore`.

Before your first push, you can verify:

```bash
git status
```

You should not see `.env` staged.

## 4. Deploy to Railway

1. Create a Railway project.
2. Choose **Deploy from GitHub repo**.
3. Select this repository.
4. Railway should detect Node automatically.
5. In the service's **Variables** tab, add:

```text
NODE_ENV=production
ANTHROPIC_API_KEY=your-real-key
ANTHROPIC_MODEL=claude-sonnet-4-6
APP_USERNAME=your-demo-username
APP_PASSWORD=a-long-random-password
```

6. After adding the Anthropic key and password, use Railway's **Seal** option for those sensitive variables.
7. Deploy the staged changes.
8. Open **Settings > Networking > Generate Domain**.
9. Open the generated Railway URL.

If `APP_USERNAME` and `APP_PASSWORD` are configured, your browser will prompt you for credentials before the app loads.

## 5. Optional host lock

Once Railway gives you a domain, you can optionally add:

```text
ALLOWED_HOSTS=your-project.up.railway.app
```

Do not include `https://`, only the hostname.

## 6. Optional EmailJS

The existing broker-email feature is kept optional. If you use EmailJS, set these as Railway variables before the build:

```text
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
```

These are intentionally browser-visible identifiers because variables beginning with `VITE_` are bundled into frontend JavaScript. Never put an Anthropic key, database password, or other private secret in a `VITE_` variable.

If you leave these blank, underwriting and closing-script generation still work, but the broker email action will show a configuration error.

## 7. Anthropic key safety

The only server-side reference is:

```js
process.env.ANTHROPIC_API_KEY
```

Never replace that code with a literal key.

If a real API key was ever committed to GitHub, deleting it from the file is not enough. Revoke that key at the provider and create a new one.

## 8. Data behavior in this version

- PDFs are opened in the user's browser with PDF.js.
- Extracted statement text is sent to your `/api/analyze` endpoint.
- The backend forwards the relevant statement text to Anthropic.
- The browser's dashboard history remains in `localStorage` on that device.
- No database is included.
- Uploaded PDFs are not intentionally stored by this server.

## 9. Recommended next upgrades before real multi-user use

1. Replace Basic Auth with per-user authentication.
2. Add a database with tenant isolation if records need to sync across devices.
3. Add server-side audit logs that do not contain raw bank data.
4. Add a retention/deletion policy.
5. Add malware/file scanning if you later upload PDFs to the server.
6. Add stricter AI output validation, preferably with a schema validator.
7. Have underwriting rules reviewed by your business/compliance team before using automated recommendations as production decisions.
8. Review the third-party data-processing terms applicable to bank-statement data before production use.

## Project structure

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
├── server.js
└── vite.config.js
```
