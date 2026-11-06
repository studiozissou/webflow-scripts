// Unit tests for robots.txt parsing and longest-match rule evaluation in lib/robots.js.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseRobots, robotsFor } from '../../tools/site-review/lib/robots.js';
import { DEFAULT_USER_AGENT } from '../../tools/site-review/config.js';

const TEXT = `# comment
User-agent: Googlebot
User-agent: bingbot
Disallow: /nogoogle

User-agent: site-review
Disallow: /private
Allow: /private/open
Crawl-delay: 2

User-agent: *
Disallow: /admin
Allow: /admin/public$
Disallow: /*.pdf$
Disallow: /tie
Allow: /tie
Sitemap: https://example.com/sitemap.xml
`;

describe('robots', () => {
  it('parses groups, rules, crawl delay and sitemaps', () => {
    const parsed = parseRobots(TEXT);
    assert.equal(parsed.groups.length, 3);
    assert.deepEqual(parsed.groups[0].agents, ['googlebot', 'bingbot']);
    assert.equal(parsed.groups[1].crawlDelay, 2);
    assert.deepEqual(parsed.sitemaps, ['https://example.com/sitemap.xml']);
    assert.deepEqual(parsed.errors, []);
  });

  it('picks the most specific agent group in the user agent, else *', () => {
    const own = robotsFor(parseRobots(TEXT), DEFAULT_USER_AGENT);
    assert.equal(own.crawlDelay, 2);
    assert.equal(own.isAllowed('/private/x'), false);
    assert.equal(own.isAllowed('/private/open/x'), true);
    assert.equal(own.isAllowed('/admin'), true);
    const other = robotsFor(parseRobots(TEXT), 'curl/8');
    assert.equal(other.crawlDelay, null);
    assert.equal(other.isAllowed('/private/x'), true);
    assert.equal(other.isAllowed('/admin/x'), false);
  });

  it('applies longest match, Allow on a tie, * and $', () => {
    const rules = robotsFor(parseRobots(TEXT), 'curl/8');
    assert.equal(rules.isAllowed('/admin/public'), true);
    assert.equal(rules.isAllowed('/admin/public/more'), false);
    assert.equal(rules.isAllowed('/files/a.pdf'), false);
    assert.equal(rules.isAllowed('/files/a.pdf?x=1'), true);
    assert.equal(rules.isAllowed('/tie'), true);
    assert.equal(rules.isAllowed('/robots.txt'), true);
  });

  it('allows everything for empty text and reports format errors', () => {
    assert.equal(robotsFor(parseRobots(''), 'x').isAllowed('/a'), true);
    const parsed = parseRobots('Disallow: /early\nUser-agent: *\nnonsense line\nCrawl-delay: soon\nFoo: bar\nDisallow:\n');
    assert.deepEqual(parsed.errors.map((error) => error.line), [1, 3, 4, 5]);
    assert.equal(robotsFor(parsed, 'x').isAllowed('/early'), true);
  });
});
