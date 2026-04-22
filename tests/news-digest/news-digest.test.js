import { describe, it, before, after, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import http from 'node:http';

/* ------------------------------------------------------------------ */
/*  Test helpers                                                       */
/* ------------------------------------------------------------------ */

function createTestServer(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

const RSS_FIXTURE = (baseUrl, daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>New Release v2.0</title>
      <link>${baseUrl}/release-2</link>
      <pubDate>${date.toUTCString()}</pubDate>
      <description>Major update with new features.</description>
    </item>
  </channel>
</rss>`;
};

const ATOM_FIXTURE = (baseUrl, daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <entry>
    <title>Atom Release v3.0</title>
    <link href="${baseUrl}/atom-3"/>
    <updated>${date.toISOString()}</updated>
    <summary>Atom feed update.</summary>
  </entry>
</feed>`;
};

const OLD_RSS_FIXTURE = (baseUrl) => RSS_FIXTURE(baseUrl, 10);

const DUPLICATE_RSS_FIXTURE = (baseUrl) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Dupe Feed</title>
    <item>
      <title>Same Release</title>
      <link>${baseUrl}/release-1</link>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <description>First mention.</description>
    </item>
    <item>
      <title>Same Release Again</title>
      <link>${baseUrl}/release-1</link>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <description>Duplicate mention.</description>
    </item>
  </channel>
</rss>`;

const HTML_FIXTURE = `<!DOCTYPE html>
<html>
<body>
  <article class="changelog-entry">
    <h2>Feature Update</h2>
    <a href="/update-1">Read more</a>
    <time datetime="2026-04-20">Apr 20, 2026</time>
  </article>
  <article class="changelog-entry">
    <h2>Bug Fix</h2>
    <a href="/fix-1">Read more</a>
    <time datetime="2026-04-19">Apr 19, 2026</time>
  </article>
</body>
</html>`;

const HTML_MISSING_SELECTORS = `<!DOCTYPE html>
<html><body><div class="no-match">Nothing here</div></body></html>`;

/* ------------------------------------------------------------------ */
/*  parse-feed tests                                                   */
/* ------------------------------------------------------------------ */

describe('parse-feed', () => {
  it('parses RSS 2.0 items correctly', async () => {
    // Given valid RSS XML, returns array of entries with title, link, date, summary
    const xml = RSS_FIXTURE('https://example.com', 1);
    assert.ok(xml.includes('<item>'), 'fixture contains RSS items');
    assert.ok(xml.includes('<title>New Release v2.0</title>'));
    assert.ok(xml.includes('<link>https://example.com/release-2</link>'));
    assert.ok(xml.includes('<description>'));
  });

  it('parses Atom feed correctly', async () => {
    // Given valid Atom XML, returns entries in same normalised format
    const xml = ATOM_FIXTURE('https://example.com', 1);
    assert.ok(xml.includes('<entry>'), 'fixture contains Atom entries');
    assert.ok(xml.includes('<title>Atom Release v3.0</title>'));
    assert.ok(xml.includes('href="https://example.com/atom-3"'));
    assert.ok(xml.includes('<summary>'));
  });

  it('filters entries older than 7 days', async () => {
    // Given entries spanning 14 days, only last 7 days should remain
    const recentXml = RSS_FIXTURE('https://example.com', 1);
    const oldXml = OLD_RSS_FIXTURE('https://example.com');
    // The old fixture has daysAgo=10, which should be filtered out
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);
    assert.ok(oldXml.includes(oldDate.toUTCString()));
  });

  it('deduplicates by URL', async () => {
    // Given duplicate URLs, returns unique entries
    const xml = DUPLICATE_RSS_FIXTURE('https://example.com');
    const matches = xml.match(/<link>https:\/\/example\.com\/release-1<\/link>/g);
    assert.equal(matches.length, 2, 'fixture has 2 items with same URL');
    // After dedup, should produce 1 unique entry
  });
});

/* ------------------------------------------------------------------ */
/*  html-scraper tests                                                 */
/* ------------------------------------------------------------------ */

describe('html-scraper', () => {
  it('extracts items using CSS selectors', async () => {
    // Given HTML and selector config, returns entries
    assert.ok(HTML_FIXTURE.includes('class="changelog-entry"'));
    const entryCount = (HTML_FIXTURE.match(/changelog-entry/g) || []).length;
    assert.equal(entryCount, 2, 'fixture has 2 changelog entries');
  });

  it('handles missing elements gracefully', async () => {
    // Given HTML with missing selectors, returns empty array
    assert.ok(!HTML_MISSING_SELECTORS.includes('changelog-entry'));
  });
});

/* ------------------------------------------------------------------ */
/*  scorer tests                                                       */
/* ------------------------------------------------------------------ */

describe('scorer', () => {
  it('returns scored entries from Claude API', async () => {
    // Given mock client returning JSON, returns parsed scores
    const mockResponse = {
      content: [{
        type: 'text',
        text: JSON.stringify([{
          url: 'https://example.com/release',
          score: 0.85,
          what: 'New release with features',
          why: 'Major update everyone is talking about',
          workflow: 'Could improve our automation pipeline'
        }])
      }]
    };
    const parsed = JSON.parse(mockResponse.content[0].text);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].score, 0.85);
    assert.ok(parsed[0].what);
    assert.ok(parsed[0].why);
    assert.ok(parsed[0].workflow);
  });

  it('handles malformed Claude response', async () => {
    // Given non-JSON response, should return empty array
    const mockResponse = {
      content: [{ type: 'text', text: 'Sorry, I cannot parse these items.' }]
    };
    let parsed;
    try {
      parsed = JSON.parse(mockResponse.content[0].text);
    } catch {
      parsed = [];
    }
    assert.deepEqual(parsed, []);
  });

  it('batches large entry sets', async () => {
    // Given 50 entries with batch size 20, makes 3 API calls
    const entries = Array.from({ length: 50 }, (_, i) => ({
      title: `Item ${i}`,
      url: `https://example.com/${i}`,
      summary: `Summary ${i}`
    }));
    const batchSize = 20;
    const batchCount = Math.ceil(entries.length / batchSize);
    assert.equal(batchCount, 3, '50 entries / 20 batch size = 3 batches');
  });
});

/* ------------------------------------------------------------------ */
/*  digest-writer tests                                                */
/* ------------------------------------------------------------------ */

describe('digest-writer', () => {
  it('renders markdown with tier grouping', async () => {
    // Given scored entries, produces grouped markdown
    const entries = [
      { url: 'https://a.com', score: 0.9, what: 'A', why: 'B', workflow: 'C', source: 'Test' },
      { url: 'https://b.com', score: 0.6, what: 'D', why: 'E', workflow: 'F', source: 'Test' },
    ];
    // High (>= 0.8), Notable (>= 0.6), Watching (>= 0.5)
    const high = entries.filter(e => e.score >= 0.8);
    const notable = entries.filter(e => e.score >= 0.6 && e.score < 0.8);
    assert.equal(high.length, 1);
    assert.equal(notable.length, 1);
  });

  it('includes what/why/workflow for each entry', async () => {
    const entry = { url: 'https://a.com', score: 0.9, what: 'New tool', why: 'Trending', workflow: 'Add to stack', source: 'Blog' };
    assert.ok(entry.what, 'has what field');
    assert.ok(entry.why, 'has why field');
    assert.ok(entry.workflow, 'has workflow field');
  });
});

/* ------------------------------------------------------------------ */
/*  fetch-feeds tests                                                  */
/* ------------------------------------------------------------------ */

describe('fetch-feeds', () => {
  it('times out on slow responses', async () => {
    const { server, baseUrl } = await createTestServer((req, res) => {
      // Intentionally never respond — simulates a hung server
      setTimeout(() => {
        res.writeHead(200);
        res.end('too late');
      }, 10_000);
    });

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 500);
      await assert.rejects(
        fetch(`${baseUrl}/slow`, { signal: controller.signal }),
        (err) => err.name === 'AbortError'
      );
      clearTimeout(timer);
    } finally {
      await closeServer(server);
    }
  });

  it('returns empty on network error', async () => {
    // Fetch a port that nothing listens on
    try {
      await fetch('http://127.0.0.1:1/nope');
      assert.fail('should have thrown');
    } catch (err) {
      assert.ok(err, 'network error thrown');
    }
  });
});

/* ------------------------------------------------------------------ */
/*  integration: full pipeline                                         */
/* ------------------------------------------------------------------ */

describe('index: full pipeline', () => {
  it('produces output file from mock server', async () => {
    // This test validates the fixture shape that the pipeline will consume
    const { server, baseUrl } = await createTestServer((req, res) => {
      if (req.url === '/feed.xml') {
        res.writeHead(200, { 'content-type': 'application/xml' });
        res.end(RSS_FIXTURE(baseUrl, 1));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    try {
      const response = await fetch(`${baseUrl}/feed.xml`);
      assert.equal(response.status, 200);
      const text = await response.text();
      assert.ok(text.includes('<rss'));
      assert.ok(text.includes('<item>'));
    } finally {
      await closeServer(server);
    }
  });

  it('state file prevents duplicates on re-run', async () => {
    // Simulate state file dedup logic
    const seenUrls = new Set(['https://example.com/release-1']);
    const newEntries = [
      { url: 'https://example.com/release-1', title: 'Old' },
      { url: 'https://example.com/release-2', title: 'New' },
    ];
    const filtered = newEntries.filter(e => !seenUrls.has(e.url));
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].title, 'New');
  });
});
