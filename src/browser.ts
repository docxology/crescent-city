/**
 * Browser management module.
 * Handles Playwright browser lifecycle and Cloudflare bypass.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { SCRAPE_TIMEOUT_MS, CLOUDFLARE_WAIT_MS } from "./constants.js";
import { createLogger } from "./logger.js";

const log = createLogger("browser");

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let browser: Browser | null = null;
let context: BrowserContext | null = null;

export async function launchBrowser(): Promise<BrowserContext> {
  if (context) return context;

  log.info("Launching Chromium browser (non-headless)");
  browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  context = await browser.newContext({ userAgent: USER_AGENT });
  log.info("Browser context created");
  return context;
}

export async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close();
    context = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
    log.info("Browser closed");
  }
}

/**
 * Navigate to a URL, waiting for Cloudflare to clear.
 * Returns the page after content has loaded.
 */
export async function navigateWithCloudflare(
  page: Page,
  url: string,
  opts: { timeout?: number } = {}
): Promise<void> {
  const timeout = opts.timeout ?? SCRAPE_TIMEOUT_MS;

  await page.goto(url, { waitUntil: "domcontentloaded", timeout });

  // Wait for Cloudflare Turnstile challenge to resolve
  await page.waitForFunction(
    () => !document.title.includes("Just a moment"),
    { timeout }
  );

  // Give the SPA time to render content
  await page.waitForTimeout(CLOUDFLARE_WAIT_MS);
}

/**
 * Create a new page with anti-detection measures.
 */
export async function newPage(): Promise<Page> {
  const ctx = await launchBrowser();
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  return page;
}

