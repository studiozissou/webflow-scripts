/**
 * compare.js — Diff old vs new entity signals and classify regressions
 *
 * Takes two scored pages (see lib/extract.js#scorePage) and reports what the
 * redesign lost. Severity ranks by how much weight the signal carries for
 * branded search: title and H1 outrank anchor text and profile links.
 */

/** Body-mention drop below this ratio counts as a real regression, not noise. */
const MENTION_DROP_RATIO = 0.5;
/** Ignore mention drops on pages that barely mentioned the entity to begin with. */
const MENTION_MIN_BASELINE = 3;

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

/**
 * Compare a single old/new page pair.
 *
 * @param {object} pair
 * @param {string} [pair.slug]
 * @param {object|null} pair.old - scored old page, or null if it did not exist
 * @param {object|null} pair.current - scored new page, or null if dropped
 * @returns {{slug:string, status:string, regressions:object[], gains:object[], old:object|null, current:object|null}}
 */
function comparePage({ slug = '', old = null, current = null }) {
  if (!old && !current) {
    return { slug, status: 'missing', regressions: [], gains: [], old, current };
  }
  if (!old) {
    return { slug, status: 'new', regressions: [], gains: [], old, current };
  }
  if (!current) {
    return { slug, status: 'dropped', regressions: [], gains: [], old, current };
  }

  const regressions = [];
  const gains = [];

  // --- Boolean presence signals -------------------------------------------
  const booleanSignals = [
    {
      field: 'titleHasEntity',
      lost: 'title-entity-lost',
      gained: 'title-entity-gained',
      severity: 'high',
      label: 'Entity name in <title>',
      oldText: () => old.title,
      newText: () => current.title,
    },
    {
      field: 'h1HasEntity',
      lost: 'h1-entity-lost',
      gained: 'h1-entity-gained',
      severity: 'high',
      label: 'Entity name in H1',
      oldText: () => (old.h1s || []).join(' | '),
      newText: () => (current.h1s || []).join(' | '),
    },
    {
      field: 'descriptionHasEntity',
      lost: 'description-entity-lost',
      gained: 'description-entity-gained',
      severity: 'medium',
      label: 'Entity name in meta description',
      oldText: () => old.description,
      newText: () => current.description,
    },
    {
      field: 'footerHasEntity',
      lost: 'footer-entity-lost',
      gained: 'footer-entity-gained',
      severity: 'low',
      label: 'Entity name in footer',
      oldText: () => old.footerText,
      newText: () => current.footerText,
    },
  ];

  for (const sig of booleanSignals) {
    if (old[sig.field] && !current[sig.field]) {
      regressions.push({
        kind: sig.lost,
        severity: sig.severity,
        label: sig.label,
        oldValue: sig.oldText(),
        newValue: sig.newText(),
      });
    } else if (!old[sig.field] && current[sig.field]) {
      gains.push({ kind: sig.gained, label: sig.label, oldValue: sig.oldText(), newValue: sig.newText() });
    }
  }

  // --- Factual "X is a ..." statements -------------------------------------
  const oldFacts = (old.factualStatements || []).length;
  const newFacts = (current.factualStatements || []).length;
  if (oldFacts > 0 && newFacts < oldFacts) {
    regressions.push({
      kind: 'factual-statements-lost',
      severity: newFacts === 0 ? 'high' : 'medium',
      label: 'Factual entity statements ("X is a ...")',
      oldValue: oldFacts,
      newValue: newFacts,
      detail: old.factualStatements.slice(0, 3),
    });
  } else if (newFacts > oldFacts) {
    gains.push({
      kind: 'factual-statements-gained',
      label: 'Factual entity statements',
      oldValue: oldFacts,
      newValue: newFacts,
    });
  }

  // --- Body mention volume --------------------------------------------------
  const oldMentions = old.entityMentions ?? 0;
  const newMentions = current.entityMentions ?? 0;
  if (oldMentions >= MENTION_MIN_BASELINE && newMentions < oldMentions * MENTION_DROP_RATIO) {
    regressions.push({
      kind: 'entity-mentions-dropped',
      severity: 'medium',
      label: 'Full-name mentions in body copy',
      oldValue: oldMentions,
      newValue: newMentions,
    });
  }

  // --- Set-based signals ----------------------------------------------------
  const lostTypes = diffMissing(old.jsonLdTypes, current.jsonLdTypes);
  if (lostTypes.length) {
    regressions.push({
      kind: 'jsonld-types-lost',
      severity: 'high',
      label: 'JSON-LD types',
      oldValue: (old.jsonLdTypes || []).join(', '),
      newValue: (current.jsonLdTypes || []).join(', '),
      detail: lostTypes,
    });
  }

  const lostPlatforms = diffMissing(
    (old.outboundProfiles || []).map((p) => p.platform),
    (current.outboundProfiles || []).map((p) => p.platform),
  );
  if (lostPlatforms.length) {
    regressions.push({
      kind: 'profile-links-lost',
      severity: 'medium',
      label: 'Outbound profile links (sameAs candidates)',
      oldValue: (old.outboundProfiles || []).length,
      newValue: (current.outboundProfiles || []).length,
      detail: lostPlatforms,
    });
  }

  const oldAnchors = (old.brandedInternalAnchors || []).length;
  const newAnchors = (current.brandedInternalAnchors || []).length;
  if (oldAnchors > 0 && newAnchors < oldAnchors) {
    regressions.push({
      kind: 'branded-anchors-lost',
      severity: 'low',
      label: 'Branded internal anchor text',
      oldValue: oldAnchors,
      newValue: newAnchors,
      detail: (old.brandedInternalAnchors || []).slice(0, 5).map((a) => a.text),
    });
  }

  regressions.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  let status = 'ok';
  if (regressions.length) status = 'regressed';
  else if (gains.length) status = 'improved';

  return { slug, status, regressions, gains, old, current };
}

/** Items present in `before` but missing from `after`. */
function diffMissing(before, after) {
  const has = new Set(after || []);
  return [...new Set(before || [])].filter((x) => !has.has(x));
}

/**
 * Compare every mapped pair.
 * @param {Array<{slug:string, old:object|null, current:object|null}>} pairs
 * @returns {object[]}
 */
function compareSite(pairs) {
  return pairs.map((p) => comparePage(p));
}

/**
 * Roll results up into counts for the report header.
 * @param {object[]} results
 */
function summarise(results) {
  const bySeverity = { high: 0, medium: 0, low: 0 };
  const byKind = {};
  let pagesRegressed = 0;

  for (const r of results) {
    if (r.regressions.length) pagesRegressed += 1;
    for (const reg of r.regressions) {
      bySeverity[reg.severity] = (bySeverity[reg.severity] || 0) + 1;
      byKind[reg.kind] = (byKind[reg.kind] || 0) + 1;
    }
  }

  return {
    pagesCompared: results.length,
    pagesRegressed,
    pagesOk: results.filter((r) => r.status === 'ok').length,
    pagesImproved: results.filter((r) => r.status === 'improved').length,
    pagesNew: results.filter((r) => r.status === 'new').length,
    pagesDropped: results.filter((r) => r.status === 'dropped').length,
    totalRegressions: Object.values(byKind).reduce((a, b) => a + b, 0),
    bySeverity,
    byKind,
  };
}

export { comparePage, compareSite, summarise, MENTION_DROP_RATIO, MENTION_MIN_BASELINE };
