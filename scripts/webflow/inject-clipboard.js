/**
 * inject-clipboard.js
 *
 * Writes @webflow/XscpData JSON to the Webflow Designer clipboard via CDP.
 * Export: injectToClipboard(jsonString) → boolean
 *
 * Requires Chrome running with --remote-debugging-port=9222
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const CDP_URL = 'http://localhost:9222';
const BACKUP_PATH = '/tmp/wf-clipboard.json';

/**
 * Find the Webflow Designer tab in a CDP-connected browser.
 */
async function findDesignerPage(browser) {
  const contexts = browser.contexts();
  for (const ctx of contexts) {
    const pages = ctx.pages();
    for (const page of pages) {
      if (page.url().includes('webflow.com/design') || page.url().includes('.design.webflow.com')) {
        return { page, context: ctx };
      }
    }
  }
  return { page: null, context: null };
}

/**
 * Inject JSON string into the clipboard for the Webflow Designer.
 * @param {string} jsonString - Stringified @webflow/XscpData JSON
 * @returns {Promise<boolean>} true if injection succeeded
 */
export async function injectToClipboard(jsonString) {
  // Always save backup
  writeFileSync(BACKUP_PATH, jsonString);
  console.error(`Backup saved to ${BACKUP_PATH}`);

  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (err) {
    if (err.message.includes('ECONNREFUSED')) {
      console.error(
        'Chrome not running with CDP. Start it with:\n' +
        '  chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-webflow-dev\n'
      );
    } else {
      console.error('CDP connection failed:', err.message);
    }
    printFallback(jsonString);
    return false;
  }

  const { page, context } = await findDesignerPage(browser);
  if (!page) {
    console.error('No Webflow Designer tab found.');
    printFallback(jsonString);
    await browser.close();
    return false;
  }

  try {
    await context.grantPermissions(['clipboard-write', 'clipboard-read'], {
      origin: new URL(page.url()).origin,
    });
  } catch (err) {
    console.error('Could not grant clipboard permissions:', err.message);
  }

  await page.bringToFront();
  await page.waitForTimeout(300);

  // Set up a copy event handler that will intercept the next copy and
  // replace clipboard contents with our JSON. Don't await — it resolves
  // when the copy event fires, which we trigger afterwards.
  await page.evaluate((json) => {
    window.__wfInjectReady = false;
    window.__wfInjectResult = null;
    const handler = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.clipboardData.setData('application/json', json);
      e.clipboardData.setData('text/plain', json);
      document.removeEventListener('copy', handler, true);
      window.__wfInjectReady = true;
      window.__wfInjectResult = { ok: true };
    };
    document.addEventListener('copy', handler, true);
  }, jsonString);

  // Trigger a real Cmd+C to fire the copy event
  await page.keyboard.press('Meta+c');
  await page.waitForTimeout(500);

  // Check if the handler fired
  const result = await page.evaluate(() => {
    if (window.__wfInjectReady) return window.__wfInjectResult;
    return { ok: false, error: 'Copy event did not fire' };
  });

  if (result.ok) {
    console.error('Clipboard written. Press Cmd+V in the Designer to paste.');
    await browser.close();
    return true;
  }

  console.error('Clipboard write failed:', result.error);
  printFallback(jsonString);
  await browser.close();
  return false;
}

/**
 * Print the fallback console one-liner.
 */
function printFallback(jsonString) {
  console.error('\nFallback: paste this into the Designer console (F12):');
  console.error(`copy(${jsonString})`);
  console.error('\nThen press Cmd+V in the Designer canvas.');
}

// CLI entry point
const isMain = process.argv[1] &&
  (process.argv[1].endsWith('inject-clipboard.js') ||
   process.argv[1].endsWith('inject-clipboard'));

if (isMain) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node inject-clipboard.js <path-to-json>');
    console.error('       echo \'{"type":"@webflow/XscpData",...}\' | node inject-clipboard.js -');
    process.exit(1);
  }

  let jsonString;
  if (filePath === '-') {
    const { readFileSync } = await import('node:fs');
    jsonString = readFileSync('/dev/stdin', 'utf-8');
  } else {
    const { readFileSync } = await import('node:fs');
    jsonString = readFileSync(filePath, 'utf-8');
  }

  const success = await injectToClipboard(jsonString.trim());
  process.exit(success ? 0 : 1);
}
