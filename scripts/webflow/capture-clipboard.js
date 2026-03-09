/**
 * capture-clipboard.js
 *
 * Connects to Chrome via CDP (remote debugging port 9222) and captures
 * @webflow/XscpData clipboard JSON from the Webflow Designer.
 *
 * How it works:
 *   - Injects a hidden contenteditable div into the Designer page
 *   - Focuses it and triggers Cmd+V (paste)
 *   - Intercepts the paste event to read all MIME types including application/json
 *   - The Webflow Designer itself is unaffected (paste goes to our hidden div)
 *
 * Usage:
 *   1. Launch Chrome with: chrome
 *   2. Open the Webflow Designer and select/copy an element (Cmd+C)
 *   3. Run: node scripts/webflow/capture-clipboard.js
 *   4. Enter a name for each capture, type "q" to quit
 */

import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = join(__dirname, 'samples');
const CDP_URL = 'http://localhost:9222';

mkdirSync(SAMPLES_DIR, { recursive: true });

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function findDesignerPage(browser) {
  const contexts = browser.contexts();
  for (const ctx of contexts) {
    const pages = ctx.pages();
    for (const page of pages) {
      const url = page.url();
      if (url.includes('webflow.com/design') || url.includes('.design.webflow.com')) {
        return { page, context: ctx };
      }
    }
  }
  return { page: null, context: null };
}

/**
 * Read clipboard by injecting a hidden div, focusing it, pasting into it,
 * and intercepting the paste event to capture all MIME types.
 */
async function readClipboardViaPaste(page) {
  await page.bringToFront();
  await page.waitForTimeout(300);

  // Step 1: Inject a hidden contenteditable div and set up paste listener
  await page.evaluate(() => {
    // Clean up any previous capture target
    const old = document.getElementById('__wf_capture_target');
    if (old) old.remove();

    window.__wfCaptureResult = null;

    const el = document.createElement('div');
    el.contentEditable = 'true';
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.top = '0';
    el.style.width = '1px';
    el.style.height = '1px';
    el.style.opacity = '0.01';
    el.id = '__wf_capture_target';
    document.body.appendChild(el);
    el.focus();

    // Listen on document (capture phase) to catch it before Webflow does
    document.addEventListener('paste', (e) => {
      const texts = {};
      if (e.clipboardData) {
        for (const type of e.clipboardData.types) {
          texts[type] = e.clipboardData.getData(type);
        }
      }
      window.__wfCaptureResult = { ok: true, data: texts };
      // Don't preventDefault — let it pass through naturally
    }, { capture: true, once: true });
  });

  // Step 2: Use Playwright keyboard to trigger a real Cmd+V
  await page.keyboard.press('Meta+v');

  // Step 3: Wait for the paste event to fire and collect the result
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const el = document.getElementById('__wf_capture_target');
    if (el) el.remove();

    if (window.__wfCaptureResult) {
      const r = window.__wfCaptureResult;
      window.__wfCaptureResult = null;
      return r;
    }
    return { ok: false, error: 'Paste event did not fire' };
  });

  return result;
}

async function main() {
  console.log('Connecting to Chrome at', CDP_URL, '...');
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (err) {
    console.error(
      'Could not connect to Chrome. Make sure Chrome is running with:\n' +
      '  chrome\n\n' +
      'Error:', err.message
    );
    process.exit(1);
  }

  console.log('Connected. Looking for Webflow Designer tab...');
  const { page, context } = await findDesignerPage(browser);

  if (!page) {
    console.error('No Webflow Designer tab found. Open a project in the Designer first.');
    await browser.close();
    process.exit(1);
  }
  console.log('Found Designer tab:', page.url());

  // Grant clipboard permissions
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: new URL(page.url()).origin,
    });
    console.log('Clipboard permissions granted.');
  } catch (err) {
    console.warn('Could not grant clipboard permissions:', err.message);
    console.warn('Will attempt capture anyway.');
  }

  let captureCount = 0;
  console.log('\n--- Capture Mode ---');
  console.log('1. Select an element in the Webflow Designer');
  console.log('2. Copy it (Cmd+C)');
  console.log('3. Come back here and enter a name (e.g. "bare-div")');
  console.log('4. Type "q" to quit\n');

  while (true) {
    const name = await ask('Sample name (or "q" to quit): ');
    if (name.toLowerCase() === 'q') break;
    if (!name.trim()) {
      console.log('Skipping empty name.');
      continue;
    }

    const safeName = name.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
    console.log('Reading clipboard via paste interception...');

    const result = await readClipboardViaPaste(page);

    if (!result.ok) {
      console.error('Paste interception failed:', result.error);
      console.log('Make sure you copied an element in the Designer (Cmd+C) before entering the name.');
      continue;
    }

    const mimeTypes = Object.keys(result.data);
    console.log('Clipboard MIME types:', mimeTypes);

    let xscpData = null;

    // Check each MIME type for XscpData JSON
    for (const [mime, content] of Object.entries(result.data)) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.type === '@webflow/XscpData') {
          xscpData = parsed;
          console.log(`Found @webflow/XscpData in MIME type: ${mime}`);
          break;
        }
      } catch {
        // Not JSON, skip
      }
    }

    // Save raw clipboard data (all MIME types)
    const rawPath = join(SAMPLES_DIR, `${safeName}-raw.json`);
    writeFileSync(rawPath, JSON.stringify(result.data, null, 2));
    console.log(`Saved raw clipboard → ${rawPath}`);

    if (xscpData) {
      const jsonPath = join(SAMPLES_DIR, `${safeName}.json`);
      writeFileSync(jsonPath, JSON.stringify(xscpData, null, 2));
      console.log(`Saved XscpData → ${jsonPath}`);
      captureCount++;

      // Quick summary
      const nodes = xscpData.payload?.nodes || [];
      const styles = xscpData.payload?.styles || [];
      console.log(`  Nodes: ${nodes.length}, Styles: ${styles.length}`);
      if (nodes.length > 0) {
        const types = nodes.filter((n) => n.type).map((n) => n.type);
        console.log(`  Node types: ${types.join(', ')}`);
      }
    } else {
      console.log('No @webflow/XscpData found in clipboard.');
      if (mimeTypes.length > 0) {
        console.log('Content preview:');
        for (const [mime, content] of Object.entries(result.data)) {
          console.log(`  ${mime}: ${content.substring(0, 200)}...`);
        }
      } else {
        console.log('Clipboard was empty. Make sure you Cmd+C an element in the Designer first.');
      }
    }
    console.log();
  }

  console.log(`\nDone. Captured ${captureCount} samples in ${SAMPLES_DIR}`);
  rl.close();
  await browser.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
