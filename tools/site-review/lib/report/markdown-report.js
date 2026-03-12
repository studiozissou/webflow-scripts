/**
 * markdown-report.js — Findings to client-readable markdown report
 *
 * Groups findings by severity, sorts within groups by category,
 * and renders all present finding fields.
 */

const SEVERITY_ORDER = ['critical', 'warning', 'info'];

const SEVERITY_HEADINGS = {
  critical: 'Critical Issues',
  warning: 'Warnings',
  info: 'Informational',
};

/**
 * Extract domain from a URL string.
 * @param {string} url
 * @returns {string}
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Format milliseconds to a human-readable duration string.
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Render a single finding as markdown.
 * @param {Object} finding
 * @returns {string}
 */
function renderFinding(finding) {
  const lines = [];
  lines.push(`### ${finding.title}`);
  lines.push('');
  lines.push(finding.description);
  lines.push('');

  if (finding.url) lines.push(`**Page:** ${finding.url}`);
  if (finding.category) lines.push(`**Category:** ${finding.category}`);
  if (finding.element) lines.push(`**Element:** ${finding.element}`);
  if (finding.actual !== undefined) lines.push(`**Actual:** ${finding.actual}`);
  if (finding.expected !== undefined) lines.push(`**Expected:** ${finding.expected}`);
  if (finding.recommendation) lines.push(`**Recommendation:** ${finding.recommendation}`);

  lines.push('');
  return lines.join('\n');
}

/**
 * Generate a client-readable markdown report.
 *
 * @param {{ findings: Array, summary: Object, timing: Object }} results
 * @param {{ url: string, tier: number, pagesAudited: number, checksRun: number }} meta
 * @returns {string} Markdown string
 */
function generateMarkdownReport(results, meta) {
  const domain = extractDomain(meta.url);
  const lines = [];

  // Title
  lines.push(`# Site Review: ${domain}`);
  lines.push('');

  // Meta table
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push(`| Date | ${new Date().toISOString().split('T')[0]} |`);
  lines.push(`| Tier | ${meta.tier} |`);
  lines.push(`| Pages Audited | ${meta.pagesAudited} |`);
  lines.push(`| Checks Run | ${meta.checksRun} |`);
  lines.push(`| Duration | ${formatDuration(results.timing.total)} |`);
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|----------|-------|');
  lines.push(`| Critical | ${results.summary.critical} |`);
  lines.push(`| Warning | ${results.summary.warning} |`);
  lines.push(`| Info | ${results.summary.info} |`);
  lines.push(`| **Total** | **${results.summary.total}** |`);
  lines.push('');

  // Findings grouped by severity
  for (const severity of SEVERITY_ORDER) {
    const group = results.findings
      .filter((f) => f.severity === severity)
      .sort((a, b) => (a.category || '').localeCompare(b.category || ''));

    if (group.length === 0) continue;

    lines.push(`## ${SEVERITY_HEADINGS[severity]}`);
    lines.push('');

    for (const finding of group) {
      lines.push(renderFinding(finding));
    }
  }

  return lines.join('\n');
}

export { generateMarkdownReport };
