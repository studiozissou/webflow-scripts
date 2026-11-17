// Serialises a pipeline result into findings.json: meta, coverage, health, sanity, summary, every uncollapsed finding, tool bugs, diff and parity.

export function buildJsonReport(result, { parity = null, generatedAt = new Date() } = {}) {
  return {
    schemaVersion: result.schemaVersion,
    meta: {
      url: result.url,
      client: result.client,
      mode: result.mode,
      generatedAt: generatedAt.toISOString(),
      pagesFetched: result.facts.length,
      checksRun: result.checksRun,
      checksSkipped: result.checksSkipped,
      timing: result.timing,
    },
    coverage: result.sanity.coverage,
    health: result.health,
    sanity: { abort: result.sanity.abort, banners: result.sanity.banners, suspect: result.sanity.suspect },
    render: result.renderStats,
    reverify: result.reverifyStats,
    templates: result.stats.templates,
    hosts: result.stats.hosts,
    summary: result.summary,
    findings: result.findings,
    toolBugs: result.rejected,
    failedChecks: result.failedChecks,
    diff: result.diff,
    parity,
  };
}

export function generateJsonReport(result, options) {
  return JSON.stringify(buildJsonReport(result, options), null, 2);
}
