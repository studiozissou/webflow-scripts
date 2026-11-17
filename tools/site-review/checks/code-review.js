// Asks a model to review a page's custom inline code in quick mode only, so it is excluded from audit mode.

import Anthropic from '@anthropic-ai/sdk';
import { sleep } from '../lib/finding.js';
import { contentPages, pageRow, siteRow } from './_shared.js';

export const meta = { name: 'code-review', taxonomyIds: ['code-review'], tier: 1, crossPage: false, audit: false };

const RATE_LIMIT_MS = 2000;
const VALID_SEVERITIES = ['critical', 'warning', 'info'];
const KNOWN_LIBRARY_SIGNATURES = [
  'gsap', 'ScrollTrigger', 'SplitText', 'jQuery', '$(', 'Finsweet', 'Webflow.push', 'gtag(', 'ga(', 'hotjar', 'crisp', 'intercom', '_hsq',
];

function isLibraryScript(content) {
  const head = content.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 5).join('\n');
  return KNOWN_LIBRARY_SIGNATURES.some((signature) => head.includes(signature));
}

export function extractCustomCode(html) {
  const parts = [];
  const scriptRegex = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html ?? '')) !== null) {
    const content = match[1].trim();
    if (content && !isLibraryScript(content)) parts.push(`// --- inline script ---\n${content}`);
  }
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((match = styleRegex.exec(html ?? '')) !== null) {
    const content = match[1].trim();
    if (content) parts.push(`/* --- inline style --- */\n${content}`);
  }
  return parts.join('\n\n');
}

export async function reviewCode(code, client) {
  if (!code || !code.trim()) return { issues: [], parsed: true };
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
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
    }],
  });
  let parsed;
  try {
    parsed = JSON.parse(response.content[0]?.text ?? '');
  } catch {
    return { issues: [], parsed: false };
  }
  if (!Array.isArray(parsed)) return { issues: [], parsed: false };
  const issues = parsed
    .filter((item) => item && item.title && item.description)
    .map((item) => ({
      severity: VALID_SEVERITIES.includes(item.severity) ? item.severity : 'info',
      title: item.title,
      description: item.description,
      recommendation: item.recommendation ?? null,
    }));
  return { issues, parsed: true };
}

export async function check({ facts = [], site, config, log, fetchPage } = {}) {
  const notRun = () => [siteRow(site, facts, 'code-review', { state: 'unknown', reason: 'not_run', selector: 'script, style', snippet: '' })];
  const client = config?.anthropicClient ?? null;
  if (typeof fetchPage !== 'function') return notRun();
  if (!client && !process.env.ANTHROPIC_API_KEY) {
    log?.warn?.('code-review: skipping, no Anthropic API key configured');
    return notRun();
  }
  const anthropic = client ?? new Anthropic();
  const pause = config?.codeReviewDelayMs ?? RATE_LIMIT_MS;
  const rows = [];
  let first = true;
  for (const fact of contentPages(facts)) {
    const page = await fetchPage(fact.url);
    const code = extractCustomCode(page?.body ?? page?.html ?? '');
    if (!code.trim()) continue;
    if (!first && pause > 0) await sleep(pause);
    first = false;
    const { issues, parsed } = await reviewCode(code, anthropic);
    if (!parsed) {
      rows.push(pageRow(fact, 'code-review', { state: 'unknown', reason: 'not_run', selector: 'script, style', snippet: code }));
    } else if (issues.length > 0) {
      rows.push(pageRow(fact, 'code-review', {
        value: issues.map((issue) => `${issue.severity}: ${issue.title}`), selector: 'script, style', snippet: code,
      }));
    }
  }
  return rows;
}
