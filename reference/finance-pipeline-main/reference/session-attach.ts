// layer1-rpa/src/session/session-attach.ts
// Attaches to an existing authenticated browser session via Chrome DevTools Protocol.
// The client MUST already be logged in before this is called.
// This module never drives login, never touches credentials.

import { chromium, Browser, BrowserContext, Page } from "playwright";

const CDP_PORT = process.env.CDP_PORT || "9222";
const CDP_URL = `http://localhost:${CDP_PORT}`;

export interface SessionHandle {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  detach: () => Promise<void>;
}

/**
 * Attaches to the client's existing authenticated browser session.
 * Client must have launched Chrome with: --remote-debugging-port=9222
 * Client must have already completed login + 2FA before calling this.
 */
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

  // Use the first available page — client should have the bank portal active
  const page = pages[0];

  console.log(`[Layer1] Attached to page: ${await page.title()}`);
  console.log(`[Layer1] URL: ${page.url()}`);

  return {
    browser,
    context,
    page,
    detach: async () => {
      // Disconnect without closing the browser — client keeps their session
      await browser.close();
      console.log("[Layer1] Detached from session. Client session preserved.");
    },
  };
}

/**
 * Validates that the current page looks like an authenticated bank portal.
 * Does NOT check credentials — just verifies we are past the login screen.
 */
export async function verifyAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  const title = await page.title();

  // Heuristic: if we are still on a login page, warn the operator
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
