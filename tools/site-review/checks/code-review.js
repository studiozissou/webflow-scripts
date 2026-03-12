/**
 * code-review.js — AI-powered custom code quality review
 *
 * Extracts inline <script> and <style> content from page HTML,
 * filters out known library/tracking scripts, and sends custom
 * code to Claude for quality analysis via the Anthropic SDK.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createFinding } from '../lib/finding.js';

const meta = {
  name: 'code-review',
  label: 'Code Review (AI)',
  category: 'code-quality',
  tier: 1,
  parallel: false,
};

const RATE_LIMIT_MS = 2000;

const VALID_SEVERITIES = ['critical', 'warning', 'info'];

/**
 * Known library/tracking signatures. If any of these appear
 * in the first 5 non-empty lines of a script, it is skipped.
 */
const KNOWN_LIBRARY_SIGNATURES = [
  'gsap',
  'ScrollTrigger',
  'SplitText',
  'jQuery',
  '$(',
  'Finsweet',
  'Webflow.push',
  'gtag(',
  'ga(',
  'hotjar',
  'crisp',
  'intercom',
  '_hsq',
];

/**
 * Delay for the given ms.
 * @param {number} ms
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a script body matches known library patterns.
 * Looks at the first 5 non-empty lines for any signature.
 * @param {string} scriptContent
 * @returns {boolean}
 */
function isLibraryScript(scriptContent) {
  const lines = scriptContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const headLines = lines.slice(0, 5).join('\n');

  return KNOWN_LIBRARY_SIGNATURES.some((sig) => headLines.includes(sig));
}

/**
 * Extract custom inline code (scripts + styles) from HTML.
 * Skips scripts with src attributes and known library scripts.
 *
 * @param {string} html - Full page HTML
 * @returns {string} Concatenated custom code
 */
function extractCustomCode(html) {
  const parts = [];

  // Extract inline scripts (no src attribute)
  const scriptRegex = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1].trim();
    if (!content) continue;
    if (isLibraryScript(content)) continue;
    parts.push(`// --- inline script ---\n${content}`);
  }

  // Extract inline styles
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((match = styleRegex.exec(html)) !== null) {
    const content = match[1].trim();
    if (!content) continue;
    parts.push(`/* --- inline style --- */\n${content}`);
  }

  return parts.join('\n\n');
}

/**
 * Send code to Claude for review and return structured findings.
 *
 * @param {string} code - Custom code to review
 * @param {string} pageUrl - URL of the page the code came from
 * @param {object} client - Anthropic client instance
 * @returns {Promise<object[]>} Array of Finding objects
 */
async function reviewCode(code, pageUrl, client) {
  if (!code || !code.trim()) {
    return [];
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Review this custom website code for quality issues. Return a JSON array of findings.

Each finding should have: severity ("critical"|"warning"|"info"), title, description, recommendation.

Look for:
- Code quality issues (unused variables, unreachable code)
- Performance concerns (blocking scripts, layout thrash, forced reflows)
- Security risks (inline eval, exposed API keys, XSS vectors)
- Modernisation opportunities (var → const/let, callbacks → async/await)

Only report real issues. If the code is clean, return an empty array [].

Code to review:
\`\`\`
${code}
\`\`\`

Return ONLY a valid JSON array, no markdown wrapping.`,
      },
    ],
  });

  const rawText = response.content[0]?.text ?? '';

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return [
      createFinding({
        check: 'code-review',
        severity: 'info',
        category: 'code-quality',
        title: 'AI response parse failure',
        description: `Could not parse the AI code review response as JSON for ${pageUrl}.`,
        url: pageUrl,
        recommendation: 'Re-run the review or inspect the code manually.',
      }),
    ];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((item) => item && item.title && item.description)
    .map((item) => {
      const severity = VALID_SEVERITIES.includes(item.severity)
        ? item.severity
        : 'info';

      return createFinding({
        check: 'code-review',
        severity,
        category: 'code-quality',
        title: item.title,
        description: item.description,
        url: pageUrl,
        recommendation: item.recommendation || undefined,
      });
    });
}

/**
 * Main check entry point.
 *
 * @param {object} opts
 * @param {string} opts.url - Base site URL
 * @param {string[]} opts.pages - Page URLs to check
 * @param {object} opts.config - Site review config
 * @param {object} opts.log - Logger
 * @param {Function} opts.fetchPage - Page fetcher
 * @returns {Promise<object[]>} Array of Finding objects
 */
async function check({ url, pages, config, log, fetchPage }) {
  // Allow injecting a mock client for tests
  const client = config.anthropicClient || null;

  // If no injected client, check for API key
  if (!client && !process.env.ANTHROPIC_API_KEY) {
    log.warn('code-review: skipping — no Anthropic API key configured');
    return [];
  }

  const anthropic = client || new Anthropic();
  const findings = [];
  let isFirst = true;

  for (const pageUrl of pages) {
    if (!isFirst) {
      await delay(RATE_LIMIT_MS);
    }
    isFirst = false;

    log.log(`code-review: extracting custom code from ${pageUrl}`);
    const { html } = await fetchPage(pageUrl);
    const code = extractCustomCode(html);

    if (!code.trim()) {
      log.log(`code-review: no custom code found on ${pageUrl}`);
      continue;
    }

    log.log(`code-review: reviewing ${code.length} chars of custom code from ${pageUrl}`);
    const pageFindings = await reviewCode(code, pageUrl, anthropic);
    findings.push(...pageFindings);
  }

  return findings;
}

export { check, meta, extractCustomCode, reviewCode };
