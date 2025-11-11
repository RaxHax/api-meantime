# Deployment Guide

## Firebase Setup

1. **Initialize project**
   ```bash
   firebase login
   firebase use <project-id>
   ```

2. **Enable APIs**
   - Cloud Functions
   - Firestore in Native mode
   - Cloud Scheduler
   - Cloud Logging

3. **Configure environment variables**
   ```bash
   firebase functions:config:set scraper.user_agent="IcelandicMortgageBot/1.0" webhook.secret="<random>"
   ```

4. **Install dependencies**
   ```bash
   npm install
   (cd functions && npm install)
   ```

5. **Deploy functions and schedule**
   ```bash
   firebase deploy --only functions:api,functions:scheduledScrape
   ```

6. **Deploy Firestore rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

## Cloud Scheduler

Create a scheduler job to invoke the `scheduledScrape` Pub/Sub trigger:

```bash
gcloud scheduler jobs create pubsub mortgage-scrape \
  --schedule="*/15 * * * *" \
  --topic=projects/<project-id>/topics/firebase-schedule-scheduledScrape \
  --message-body='{}'
```

## Monitoring

- Configure Cloud Logging sinks for long-term storage.
- Create uptime checks hitting `/api/health`.
- Set alerting policies for error ratio >2% and latency >500ms.

## Budget Alerts

Use Google Cloud Billing budgets with email alerts for monthly spend thresholds.

## Playwright Dependencies

On first deployment ensure the runtime has Playwright Chromium binaries:

```bash
cd functions
npx playwright install chromium
```

Add the command to your CI/CD pipeline if necessary.
