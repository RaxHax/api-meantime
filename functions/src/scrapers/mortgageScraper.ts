import { chromium, Browser } from 'playwright';
import { logger } from '../utils/logger';
import { parseLoanProviders, RawLoanRow } from '../utils/dataParser';
import { ScrapeResult } from '../utils/types';
import { config } from '../config';

const BASE_URL = config.scraping.url;

interface ScrapeOptions {
  firstBuyer: boolean;
  maxRetries?: number;
}

const DEFAULT_RETRIES = 3;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractTableRows = async (browser: Browser, firstBuyer: boolean): Promise<RawLoanRow[]> => {
  const context = await browser.newContext();
  context.setExtraHTTPHeaders({
    'User-Agent':
      'Mozilla/5.0 (compatible; IcelandicMortgageBot/1.0; +https://github.com/your-org)'
  });
  const page = await context.newPage();
  try {
    await page.goto(BASE_URL, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await page.waitForTimeout(4000);

    if (firstBuyer) {
      await page.getByRole('button', { name: 'Fyrstu íbúðarkaup' }).click({ timeout: 5000 });
      await page.waitForTimeout(1500);
    }

    await page.waitForSelector('table', { timeout: 20000 });

    const rows = await page.$$eval(
      'table tbody tr',
      (trs, firstBuyerFlag: boolean) =>
        trs.map((row, index) => {
          const element = row as any;
          const cells = Array.from(element.querySelectorAll('td')) as any[];
          const textContent = (cellIndex: number) => cells[cellIndex]?.textContent?.trim() ?? null;
          const img = cells[0]?.querySelector('img');
          return {
            id: `${firstBuyerFlag ? 'first' : 'standard'}-${index}`,
            name: textContent(0) ?? 'Óþekkt',
            logoUrl: img?.getAttribute('src') ?? '',
            year: textContent(1),
          ltvPercentage: textContent(2),
          originationFee: textContent(3),
          nonIndexedVariable: textContent(4),
          nonIndexedFixed3yr: textContent(5),
          nonIndexedFixed5yr: textContent(6),
          indexedVariable: textContent(7),
          indexedFixed: textContent(8),
          prepaymentFee: textContent(9),
          loanType: textContent(10),
          isFirstBuyer: firstBuyerFlag
        };
        }),
      firstBuyer,
    );
    return rows as RawLoanRow[];
  } finally {
    await context.close();
  }
};

export const scrapeLoans = async ({
  firstBuyer,
  maxRetries = config.scraping.maxRetries || DEFAULT_RETRIES
}: ScrapeOptions): Promise<ScrapeResult> => {
  let attempt = 0;
  const scrapedAt = new Date();

  while (attempt < maxRetries) {
    attempt += 1;
    let browser: Browser | undefined;
    try {
      browser = await chromium.launch({
        headless: config.scraping.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const rows = await extractTableRows(browser, firstBuyer);
      const providers = parseLoanProviders(rows, scrapedAt);
      await browser.close();
      return { providers, scrapedAt };
    } catch (error) {
      logger.error({ error, attempt }, 'Failed to scrape mortgage data');
      if (attempt >= maxRetries) {
        throw error;
      }
      const backoff = Math.pow(2, attempt) * 1000;
      await delay(backoff);
      if (browser) {
        await browser.close();
      }
    }
  }

  throw new Error('Failed to scrape mortgage loans after retries');
};
