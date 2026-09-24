import { chromium, Browser, BrowserContext, Page } from "playwright";

const CDP_PORT = process.env.CDP_PORT || "9222";
// CDP_URL wins outright when set, since it's the only way to reach a browser
// running outside this process's own network namespace (e.g. the Docker
// host via host.docker.internal, or a dedicated browser container).
const CDP_URL = process.env.CDP_URL || `http://localhost:${CDP_PORT}`;

export interface SessionHandle {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  detach: () => Promise<void>;
}

export async function attachToSession(): Promise<SessionHandle> {
  console.log(`[Layer1] Attaching to existing browser session at ${CDP_URL}`);

  const browser = await chromium.connectOverCDP(CDP_URL);
  const contexts = browser.contexts();

  if (contexts.length === 0) {
    throw new Error(
      "No browser contexts found. Ensure the client is logged into the bank portal."
    );
  }

  const context = contexts[0];
  const pages = context.pages();

  if (pages.length === 0) {
    throw new Error(
      "No open pages found. Ensure the bank portal tab is open and authenticated."
    );
  }

  const page = pages[0];

  console.log(`[Layer1] Attached to page: ${await page.title()}`);
  console.log(`[Layer1] URL: ${page.url()}`);

  return {
    browser,
    context,
    page,
    detach: async () => {
      await browser.close();
      console.log("[Layer1] Detached from session. Client session preserved.");
    },
  };
}

export async function verifyAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  const title = await page.title();

  const loginIndicators = ["login", "signin", "sign-in", "authenticate"];
  const isOnLoginPage = loginIndicators.some(
    (indicator) =>
      url.toLowerCase().includes(indicator) ||
      title.toLowerCase().includes(indicator)
  );

  if (isOnLoginPage) {
    console.warn(
      "[Layer1] WARNING: Page appears to be a login screen. " +
        "Client must complete authentication before starting extraction."
    );
    return false;
  }

  return true;
}
