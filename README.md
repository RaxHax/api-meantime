# Icelandic Mortgage Comparison API

A Firebase Functions TypeScript service that scrapes real-time Icelandic mortgage rates from [Aurbjörg](https://aurbjorg.is/samanburdur/husnaedislan) and exposes them via REST and GraphQL endpoints.

## Features

- 🔄 Playwright-based scraper with retry and polite crawling controls
- ⚡ 15 minute cache backed by Firestore with in-memory hot cache
- 👥 Support for standard and *Fyrstu íbúðarkaup* (first buyer) loan products
- 📊 Rate comparison, historical tracking, and CSV/JSON exports
- 🌐 REST + GraphQL APIs with bilingual (EN/IS) messaging
- 🛡️ Request throttling, gzip compression, CORS, and structured logging
- 🔔 Webhook support for rate change notifications

## Project Structure

```
functions/
  src/
    controllers/
    graphql/
    middleware/
    scrapers/
    services/
    utils/
  test/
firestore/
docs/
.github/workflows/
```

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Playwright dependencies (`npx playwright install --with-deps`)

### Installation

```bash
npm install
(cd functions && npm install)
```

### Local Development

```bash
npm run build
npm run serve
```

The `serve` script uses `ts-node` to run the Express app locally. To emulate Firebase Functions, run:

```bash
cd functions
npx firebase emulators:start --only functions
```

### Testing

```bash
cd functions
npm run test
```

### Linting & Formatting

```bash
cd functions
npm run lint
```

### Deployment

1. Configure environment variables in Firebase (`firebase functions:config:set ...`).
2. Deploy Firestore security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. Deploy the API:
   ```bash
   firebase deploy --only functions:api,functions:scheduledScrape
   ```
4. Schedule scraping with Cloud Scheduler (already defined in code).

### Firestore Collections

| Collection              | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `loans_cache`           | Cached loan datasets                         |
| `scrape_history`        | Historical snapshots for fallbacks           |
| `error_logs`            | Scraper/API errors for observability        |
| `webhook_subscriptions` | Registered webhook listeners                 |

## Configuration

| Variable                | Description                             |
| ----------------------- | --------------------------------------- |
| `SCRAPER_MAX_RETRIES`   | Override default scraper retry count    |
| `PLAYWRIGHT_HEADLESS`   | Set to `false` to run Playwright headed |
| `LOG_LEVEL`             | Pino logger level (default `info`)      |

## Monitoring & Alerts

- Cloud Logging captures scraper and API logs.
- Create Google Cloud Monitoring alerts for latency (>500ms) and error rates.
- Configure budget alerts via Google Cloud Billing for cost governance.

## Additional Resources

- [OpenAPI Specification](docs/openapi.yaml)
- [Postman Collection](docs/postman_collection.json)
- [CI Workflow](.github/workflows/ci.yml)
- [Firestore Rules](firestore/firestore.rules)

## GDPR Notice

No personal data is collected. Cached provider data includes only publicly available financial metrics.
