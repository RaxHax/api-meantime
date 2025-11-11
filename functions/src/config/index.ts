export const config = {
  firestore: {
    projectId: process.env.GCLOUD_PROJECT,
    rateCollection: process.env.RATE_COLLECTION ?? 'loans_cache'
  },
  scraping: {
    url: 'https://aurbjorg.is/samanburdur/husnaedislan',
    maxRetries: Number(process.env.SCRAPER_MAX_RETRIES ?? '3'),
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false'
  }
};
