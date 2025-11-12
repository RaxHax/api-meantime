# Icelandic Mortgage Comparison API

A Firebase Functions (1st gen) TypeScript service that scrapes real-time Icelandic mortgage
rates from [Aurbjörg](https://aurbjorg.is/samanburdur/husnaedislan) and exposes them via REST and
GraphQL endpoints.

> **What changed?** 2nd gen Cloud Functions were previously enabled through the
> `functions.endpoints` block in `firebase.json`. Those deployments default to a private
> Cloud Run service which returned `403` for unauthenticated requests. The API now deploys as a
> classic HTTPS function (`functions.https.onRequest`) with explicit region/memory configuration so
> that public requests succeed out-of-the-box.

## Features

- 🔄 Playwright-based scraper with retry and polite crawling controls
- ⚡ 15 minute cache backed by Firestore with in-memory hot cache
- 👥 Support for standard and *Fyrstu íbúðarkaup* (first buyer) loan products
- 📊 Rate comparison, historical tracking, and CSV/JSON exports
- 🌐 REST + GraphQL APIs with bilingual (EN/IS) messaging
- 🛡️ Request throttling, gzip compression, CORS, and structured logging
- 🔔 Webhook support for rate change notifications

## Architecture at a Glance

```
functions/src
├── http/app.ts              Express + Apollo application factory
├── index.ts                 Firebase entry point (https + scheduler exports)
├── controllers/             REST handlers
├── graphql/                 Apollo schema + resolvers
├── middleware/              Cache and rate limit guards
├── scrapers/                Playwright scrapers
├── services/                Firestore cache + business logic
└── utils/                   Logger, parsers, validators, types
```

## Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Playwright browser binaries (`npx playwright install --with-deps`)
- Access to a Firebase project with Firestore enabled

## Configuration

The service is controlled via environment variables or Firebase config:

| Variable | Description | Default |
| --- | --- | --- |
| `FUNCTION_REGION` | Deployment region for both the HTTPS API and Pub/Sub scheduler | `europe-west1` |
| `FUNCTION_TIMEOUT` | HTTPS function timeout (seconds) | `120` |
| `FUNCTION_MEMORY` | HTTPS function memory allocation | `1GB` |
| `SCRAPER_MAX_RETRIES` | Retry count for Playwright scraper | `3` |
| `PLAYWRIGHT_HEADLESS` | Set to `false` to run Playwright headed | `true` |
| `RATE_COLLECTION` | Firestore collection for cached loan documents | `loans_cache` |

Configure the variables locally via `.env` or in Firebase using
`firebase functions:config:set key=value` (CLI automatically injects them as runtime environment
variables). When exporting values for a one-off deploy, remember that Windows shells use a different
syntax than Unix shells:

| Shell | Example |
| --- | --- |
| macOS/Linux (`bash`, `zsh`) | `export FUNCTION_REGION=europe-west1` |
| Windows Command Prompt | `set FUNCTION_REGION=europe-west1` |
| Windows PowerShell | `$env:FUNCTION_REGION = "europe-west1"` |

## Installation

```bash
npm install
(cd functions && npm install)
```

## Local Development

1. Build the TypeScript sources:
   ```bash
   cd functions
   npm run build
   ```
2. Start the Firebase emulator (HTTPS function + scheduler):
   ```bash
   npx firebase emulators:start --only functions
   ```
3. Hit the local endpoint (default port 5001):
   ```bash
   curl http://127.0.0.1:5001/<project-id>/europe-west1/api/api/health
   ```

## Deployment

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:api,functions:scheduledScrape
```

The deploy command provisions:
- `api`: HTTPS function that serves Express/GraphQL.
- `scheduledScrape`: Pub/Sub scheduled job that refreshes the Firestore cache every 15 minutes.

## Endpoints

| Route | Method | Description |
| --- | --- | --- |
| `/` | `GET` | Service metadata & documentation link |
| `/api/health` | `GET` | Health check |
| `/api/last-update` | `GET` | Most recent scrape timestamps |
| `/api/v1/loans/all` | `GET` | Cached loan portfolio (standard loans) |
| `/api/v1/loans/first-buyer` | `GET` | Cached loan portfolio for first-time buyers |
| `/api/v1/loans/bank/:bankName` | `GET` | Loans filtered by provider name |
| `/api/v1/loans/compare?banks=a,b` | `GET` | Compare loan providers |
| `/api/v1/loans/best-rate?type=indexed` | `GET` | Best rate snapshot |
| `/api/v1/loans/export?format=csv` | `GET` | Export dataset as CSV/JSON |
| `/api/v1/loans/history?bank=arion` | `GET` | Last N snapshots from scrape history |
| `/api/v1/webhooks` | `POST` | Register webhook for rate change alerts |
| `/api/v1/webhooks/test` | `POST` | Trigger test webhook payload |
| `/api/v1/graphql` | `POST` | GraphQL endpoint |

## Troubleshooting Firebase Deployments

- **403 Forbidden when calling the function URL** – The previous setup created a 2nd gen
  Cloud Run-backed function that rejected anonymous traffic. Deploying with the 1st gen `https`
  trigger (this repository's current configuration) makes the endpoint public. If you deploy using
  `gcloud functions deploy` ensure `--allow-unauthenticated` is present.
- **Playwright fails inside Cloud Functions** – Make sure the function memory is at least `1GB`
  and `npx playwright install --with-deps` has been run before deployment so the browsers are
  packaged.
- **`firebase deploy` errors while enabling services (HTTP 429)** – The first deployment needs the
  Cloud Functions, Cloud Build, and Artifact Registry APIs. You can pre-enable them once via the
  Google Cloud Console or by running `gcloud services enable cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com`. If the CLI still reports a 429, wait
  a minute and re-run the deploy; the service enablement is cached once it succeeds.
- **Cache reads return empty** – Confirm Firestore security rules allow the Cloud Function service
  account to read/write the `RATE_COLLECTION` and that the scheduled scraper has executed at least
  once.

## Testing & Linting

```bash
cd functions
npm run test
npm run lint
```

## Monitoring & Alerts

- Cloud Logging captures scraper and API logs (structured via Pino).
- Use Cloud Monitoring dashboards to alert on latency (>500 ms) and error rates.
- Configure budget alerts via Google Cloud Billing for cost governance.

## Additional Resources

- [OpenAPI Specification](docs/openapi.yaml)
- [Postman Collection](docs/postman_collection.json)
- [Firestore Rules](firestore/firestore.rules)
