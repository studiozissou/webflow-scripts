/**
 * json-report.js — Findings to structured JSON report
 *
 * Generates a JSON string containing meta, summary, and findings
 * for programmatic consumption or archival.
 */

/**
 * Generate a structured JSON report string.
 *
 * @param {{ findings: Array, summary: Object, timing: Object }} results
 * @param {{ url: string, tier: number, pagesAudited: number, checksRun: number }} meta
 * @returns {string} JSON string
 */
function generateJsonReport(results, meta) {
  const report = {
    meta: {
      url: meta.url,
      tier: meta.tier,
      generatedAt: new Date().toISOString(),
      pagesAudited: meta.pagesAudited,
      checksRun: meta.checksRun,
      duration: results.timing.total,
    },
    summary: results.summary,
    findings: results.findings,
  };

  return JSON.stringify(report, null, 2);
}

export { generateJsonReport };
