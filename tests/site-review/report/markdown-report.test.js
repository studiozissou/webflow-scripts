// Tests report.md: sections for coverage, health, findings collapsed by fingerprint, fixed after load, transient, unknown, tool bugs and abort.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateMarkdownReport } from '../../../tools/site-review/lib/report/markdown-report.js';
import { HEALTH_FORMULA } from '../../../tools/site-review/lib/health.js';
import { buildResult } from './_result.js';

describe('markdown report', () => {
  const md = generateMarkdownReport(buildResult(), { generatedAt: new Date('2026-11-06T00:00:00Z') });

  it('has the heading, the coverage banner and coverage', () => {
    assert.match(md, /^# Site review: example\.com/);
    assert.match(md, /> \*\*low_coverage:\*\* 3 of 4/);
    assert.match(md, /3 of 4 sitemap URLs fetched \(75%\)/);
  });

  it('quotes the health formula and says it is not the SEMrush figure', () => {
    assert.ok(md.includes(HEALTH_FORMULA));
    assert.match(md, /not SEMrush's Site Health figure/);
  });

  it('collapses a shared broken target into one fingerprint row with a page count', () => {
    assert.match(md, /### broken internal link \(`broken-internal-link`\): 2 links/);
    assert.match(md, /\| \/gone \| target \| 2 \|/);
  });

  it('lists fixed-after-load, transient, unknown and tool bugs in their own sections, outside the issues', () => {
    assert.match(md, /## Fixed after load[\s\S]*title-too-short/);
    assert.match(md, /## Transient[\s\S]*\/flaky/);
    assert.match(md, /## Unknown[\s\S]*\| page-fetch \| non_html \| 1 \|/);
    assert.match(md, /## Tool bugs[\s\S]*evidence\.snippet missing/);
    assert.ok(!/### title too short/.test(md));
  });

  it('an aborted run reports the abort and no findings', () => {
    const result = buildResult();
    result.sanity.abort = { code: 'bot_wall', message: 'One page body on 95% of pages: probable bot wall.' };
    const aborted = generateMarkdownReport(result);
    assert.match(aborted, /Run aborted \(bot_wall\)/);
    assert.ok(!aborted.includes('## Errors'));
  });
});
