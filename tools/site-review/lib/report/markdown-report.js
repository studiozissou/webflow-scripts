// Renders report.md from a pipeline result: coverage, health, sanity, findings collapsed by fingerprint with evidence, site-wide patterns, fixed after load, transient, unknown, tool bugs, diff and parity.

import { HEALTH_FORMULA } from '../health.js';

const SEVERITY_ORDER = ['error', 'warning', 'notice'];
const HEADINGS = { error: 'Errors', warning: 'Warnings', notice: 'Notices' };
const MAX_ROWS = 25;

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

function path(key) {
  try {
    const url = new URL(key);
    return `${url.pathname}${url.search}`;
  } catch {
    return key ?? '';
  }
}

function formatValue(value) {
  if (value === null || value === undefined) return 'absent';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 120);
  return String(value).slice(0, 120);
}

function table(header, rows) {
  if (rows.length === 0) return [];
  return [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`, ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`), ''];
}

function evidenceRows(findings) {
  return findings.slice(0, MAX_ROWS).map((f) => [
    path(f.url),
    f.target ? path(f.target) : '',
    formatValue(f.evidence?.value),
    f.evidence?.status ?? '',
    f.evidence?.source ?? '',
    f.renderChecked ? 'yes' : 'no',
    f.evidence?.snippet ? `\`${f.evidence.snippet.slice(0, 80).replace(/`/g, "'")}\`` : '',
  ]);
}

function liveFails(findings) {
  return findings.filter((f) => f.state === 'fail' && !f.transient && !f.tags?.includes('fixed-after-load'));
}

function findingsSection(result) {
  const lines = [];
  const sitewideIds = new Set(result.collapsed.sitewide.map((s) => s.taxonomyId));
  const groups = new Map(result.collapsed.groups.map((g) => [g.fingerprint, g]));
  const live = liveFails(result.findings);

  for (const severity of SEVERITY_ORDER) {
    const ofSeverity = live.filter((f) => f.severity === severity && !sitewideIds.has(f.taxonomyId));
    if (ofSeverity.length === 0) continue;
    lines.push(`## ${HEADINGS[severity]}`, '');
    const byType = new Map();
    for (const f of ofSeverity) byType.set(f.taxonomyId, [...(byType.get(f.taxonomyId) ?? []), f]);
    for (const [taxonomyId, list] of [...byType].sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`### ${list[0].label} (\`${taxonomyId}\`): ${list.length} ${list[0].unit === 'link' ? 'links' : 'pages'}`, '');
      const typeGroups = [...groups.values()].filter((g) => g.taxonomyId === taxonomyId && g.count > 1);
      if (typeGroups.length > 0) {
        lines.push(...table(['Fingerprint', 'Kind', 'Pages', 'Example page', 'Example value'], typeGroups.slice(0, MAX_ROWS).map((g) => [
          g.kind === 'target' ? path(g.sample?.targetKey ?? g.fingerprint) : (g.sample?.evidence?.snippet ?? '').slice(0, 60),
          g.kind,
          g.count,
          path(g.sample?.url),
          formatValue(g.sample?.evidence?.value),
        ])));
      }
      lines.push(...table(['Page', 'Target', 'Value', 'Status', 'Source', 'Rendered', 'Snippet'], evidenceRows(list)));
      if (list.length > MAX_ROWS) lines.push(`${list.length - MAX_ROWS} more in findings.json.`, '');
    }
  }
  return lines;
}

function diffSection(diff) {
  if (!diff) return [];
  const rows = Object.entries(diff.byType)
    .filter(([, v]) => v.fixed || v.new || v.stillOpen || v.unverified)
    .map(([id, v]) => [id, v.fixed, v.stillOpen, v.new, v.unverified ?? 0]);
  const lines = ['## Change since the previous snapshot', ''];
  lines.push(...table(['Issue', 'Fixed', 'Still open', 'New', 'Unverified'], rows));
  if (diff.unverified?.length) lines.push('Unverified: open last month, but the page or target could not be checked this month (unknown, transient or not fetched). Not counted as fixed.', '');
  for (const [label, list] of [['Fixed', diff.fixed], ['New', diff.new]]) {
    if (list.length === 0) continue;
    lines.push(`**${label}:**`, '', ...list.slice(0, MAX_ROWS).map((e) => `- \`${e.taxonomyId}\` ${path(e.urlKey)}${e.targetKey ? ` → ${path(e.targetKey)}` : ''}`), '');
  }
  return lines;
}

function paritySection(parity) {
  if (!parity) return [];
  return [
    `## Parity with SEMrush (${parity.date}, snapshot ${parity.snapshot ?? 'n/a'})`,
    '',
    `Tolerance: within max(${parity.tolerance.ratio * 100}%, ±${parity.tolerance.absolute}). Our counts exclude transient, unknown and fixed-after-load findings.`,
    '',
    ...table(['Issue', 'SEMrush ID', 'Unit', 'Ours', 'SEMrush', 'Within', 'Reason'], parity.rows.map((r) => [
      r.label,
      r.semrushId,
      r.unit,
      r.ours ?? 'not covered',
      r.semrush ?? '',
      r.withinTolerance === null ? '' : r.withinTolerance ? 'yes' : 'no',
      r.reasons.join('; '),
    ])),
  ];
}

export function generateMarkdownReport(result, { parity = null, generatedAt = new Date() } = {}) {
  const lines = [];
  const host = (() => {
    try {
      return new URL(result.url).host;
    } catch {
      return result.url;
    }
  })();
  const { coverage } = result.sanity;
  lines.push(`# Site review: ${host}`, '');
  lines.push(...table(['Field', 'Value'], [
    ['Date', generatedAt.toISOString().slice(0, 10)],
    ['Mode', result.mode],
    ['Client', result.client ?? 'none'],
    ['Pages fetched', result.facts.length],
    ['Hosts', Object.keys(result.stats.hosts ?? {}).join(', ')],
    ['Checks run', result.checksRun.length],
    ['Rendered pages', result.renderStats.rendered ?? 0],
  ]));

  if (result.sanity.abort) {
    lines.push(`> **Run aborted (${result.sanity.abort.code}).** ${result.sanity.abort.message}`, '');
    lines.push('No findings are reported from an aborted run; nothing was scored or snapshotted.', '');
    return lines.join('\n');
  }
  for (const banner of result.sanity.banners) lines.push(`> **${banner.code}:** ${banner.message}`, '');

  lines.push('## Coverage', '');
  lines.push(`${coverage.fetched} of ${coverage.sitemapUrls} sitemap URLs fetched (${Math.round(coverage.ratio * 1000) / 10}%).`, '');

  lines.push('## Health', '');
  const h = result.health;
  lines.push(`**${h.score ?? 'n/a'} / 100**: ${h.pages} pages, ${h.errorPages} with single-page errors, ${h.warningPages} with single-page warnings only, ${h.sharedIssues?.length ?? 0} shared issues costing ${h.sharedDamage ?? 0} pages.`, '');
  lines.push(`Formula: \`score = round(100 × (1 − (E + 0.5 × W + S) / P))\`, S = Σ weight × (1 + log2 pages reached) per shared issue. This is the site-review score, not SEMrush's Site Health figure.[^health]`, '');

  const s = result.summary;
  lines.push(...table(['Errors', 'Warnings', 'Notices', 'Fixed after load', 'Transient', 'Unknown'], [[s.error, s.warning, s.notice, s.fixedAfterLoad, s.transient, s.unknown]]));

  if (result.sanity.suspect.length > 0) {
    lines.push('## Suspect counts', '');
    lines.push(...table(['Issue', 'Count', 'Previous'], result.sanity.suspect.map((x) => [x.taxonomyId, x.count, x.previous])));
  }

  if (result.collapsed.sitewide.length > 0) {
    lines.push('## Site-wide patterns', '');
    lines.push('Each fires on more than 90% of fetched pages and is shown once here. Every page still counts in the score and the diff.', '');
    lines.push(...table(['Issue', 'Pages', 'Share'], result.collapsed.sitewide.map((x) => [x.taxonomyId, x.pages, `${Math.round(x.ratio * 100)}%`])));
  }

  lines.push(...findingsSection(result));

  const fixed = result.findings.filter((f) => f.tags?.includes('fixed-after-load'));
  if (fixed.length > 0) {
    lines.push('## Fixed after load', '');
    lines.push('The raw HTML fails but the rendered page passes. Crawlers read the raw HTML first, so these are notices with no score weight and stay out of parity totals.', '');
    lines.push(...table(['Issue', 'Page', 'Raw value'], fixed.slice(0, MAX_ROWS).map((f) => [f.taxonomyId, path(f.url), formatValue(f.evidence?.value)])));
  }

  const transient = result.findings.filter((f) => f.transient);
  if (transient.length > 0) {
    lines.push('## Transient', '');
    lines.push('Failed during the crawl but not on the re-verify fetch. Not counted.', '');
    lines.push(...table(['Issue', 'Page', 'Target', 'Crawl status'], transient.slice(0, MAX_ROWS).map((f) => [f.taxonomyId, path(f.url), f.target ? path(f.target) : '', f.evidence?.status])));
  }

  const unknown = result.findings.filter((f) => f.state === 'unknown');
  if (unknown.length > 0) {
    lines.push('## Unknown', '');
    lines.push('Not checked or not checkable. Never counted as issues.', '');
    const byReason = new Map();
    for (const f of unknown) {
      const key = `${f.taxonomyId}|${f.reason}`;
      byReason.set(key, [...(byReason.get(key) ?? []), f]);
    }
    lines.push(...table(['Issue', 'Reason', 'Count', 'Example'], [...byReason].map(([key, list]) => {
      const [id, reason] = key.split('|');
      return [id, reason, list.length, path(list[0].target ?? list[0].url)];
    })));
  }

  if (result.rejected.length > 0 || result.failedChecks.length > 0) {
    lines.push('## Tool bugs', '');
    for (const r of result.rejected.slice(0, MAX_ROWS)) lines.push(`- Rejected row \`${r.row?.taxonomyId}\` on ${path(r.row?.url)}: ${r.errors.join(', ')}`);
    for (const c of result.failedChecks) lines.push(`- Check \`${c.name}\` threw: ${c.message}`);
    lines.push('');
  }

  lines.push(...diffSection(result.diff));
  lines.push(...paritySection(parity));
  lines.push(`[^health]: ${HEALTH_FORMULA}. Pages are classified by the highest score weight among their final fails (error 1.0, warning 0.5, notice 0). Transient, unknown and fixed-after-load findings carry no weight. See tools/site-review/README.md.`, '');
  return lines.join('\n');
}
