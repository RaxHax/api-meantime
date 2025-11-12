# Firebase Deployment Guide

This guide walks through deploying the Icelandic Mortgage Comparison API to Firebase using the
1st generation Cloud Functions runtime.

## 1. Authenticate and Select Project

```bash
firebase login
firebase use <your-project-id>
```

## 2. Install Dependencies

```bash
npm install
(cd functions && npm install && npm run build)
```

Running `npm run build` ensures the compiled JavaScript is placed in `functions/lib` before
deployment.

## 3. Install Playwright Browsers

The scraper requires Chromium binaries. Install them locally so Firebase bundles them with the
function deployment:

```bash
cd functions
npx playwright install --with-deps
```

## 4. Configure Runtime Options

The HTTPS function and scheduler use shared runtime options from `functions/src/config/index.ts`.
Set overrides via environment variables (locally through `.env` or when deploying):

| Shell | Example |
| --- | --- |
| macOS/Linux (`bash`, `zsh`) | `export FUNCTION_REGION=europe-west1` |
| Windows Command Prompt | `set FUNCTION_REGION=europe-west1` |
| Windows PowerShell | `$env:FUNCTION_REGION = "europe-west1"` |

Repeat for `FUNCTION_MEMORY` and `FUNCTION_TIMEOUT`, or store the values in a `.env` file.

## 5. Deploy

```bash
cd ..
firebase deploy --only functions:api,functions:scheduledScrape
```

If this is your first deploy on a project, pre-enable the required Google Cloud APIs to avoid the
CLI needing to do it during deploy (which can hit per-minute quotas):

```bash
gcloud services enable cloudfunctions.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

If you need to redeploy only the API without the scheduler:

```bash
firebase deploy --only functions:api
```

## 6. Verify

The public URL follows this pattern:

```
https://<FUNCTION_REGION>-<PROJECT_ID>.cloudfunctions.net/api
```

Try hitting the health endpoint:

```bash
curl https://europe-west1-<PROJECT_ID>.cloudfunctions.net/api/api/health
```

A JSON payload should be returned. If you receive `403 Forbidden`, ensure you are deploying the
first generation function (this repository's default) or re-run the deploy command with the
`--allow-unauthenticated` flag when using `gcloud`.

## 7. Scheduled Scraper

The `scheduledScrape` Pub/Sub trigger runs every 15 minutes in the configured region. You can
trigger a manual refresh by invoking the HTTPS API endpoints or by temporarily changing the
schedule expression in `functions/src/services/scheduler.ts`.

## 8. Firestore Security

Ensure the Firebase service account used by Cloud Functions can read and write the
`RATE_COLLECTION` (defaults to `loans_cache`) and related history collections. Deploy the
provided security rules if you have not already:

```bash
firebase deploy --only firestore:rules
```

With these steps the API should operate end-to-end on Firebase.
