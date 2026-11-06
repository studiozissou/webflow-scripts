// Compares our final counts with a SEMrush counts file per taxonomy entry, in matching units, during the parallel run.

export const PARITY_TOLERANCE = Object.freeze({ ratio: 0.1, absolute: 2 });

export function withinTolerance(ours, theirs, tolerance = PARITY_TOLERANCE) {
  return Math.abs(ours - theirs) <= Math.max(tolerance.ratio * Math.max(ours, theirs), tolerance.absolute);
}

function countBy(findings, predicate) {
  const counts = new Map();
  for (const f of findings) {
    if (!predicate(f)) continue;
    counts.set(f.taxonomyId, (counts.get(f.taxonomyId) ?? 0) + 1);
  }
  return counts;
}

export function buildParity({ findings, taxonomy, semrushCounts }) {
  if (!semrushCounts?.counts) return null;
  const ours = countBy(findings, (f) => f.state === 'fail' && !f.transient && !f.excludedFromParity);
  const unknowns = countBy(findings, (f) => f.state === 'unknown');
  const fixedAfterLoad = countBy(findings, (f) => f.tags?.includes('fixed-after-load'));
  const rows = [];
  for (const entry of taxonomy) {
    if (entry.semrushId == null) continue;
    const theirs = semrushCounts.counts[String(entry.semrushId)];
    if (theirs === undefined && entry.check) continue;
    const count = entry.check ? ours.get(entry.id) ?? 0 : null;
    const reasons = [];
    if (!entry.check) reasons.push('not covered in v1');
    if (unknowns.get(entry.id)) reasons.push(`${unknowns.get(entry.id)} unknown, not counted`);
    if (fixedAfterLoad.get(entry.id)) reasons.push(`${fixedAfterLoad.get(entry.id)} fixed after load, not counted`);
    const ok = count === null || theirs === undefined ? null : withinTolerance(count, theirs);
    if (ok === false) reasons.push('outside tolerance: reason needed');
    rows.push({
      taxonomyId: entry.id,
      label: entry.label,
      semrushId: entry.semrushId,
      unit: entry.unit,
      ours: count,
      semrush: theirs ?? null,
      withinTolerance: ok,
      reasons,
    });
  }
  return { date: semrushCounts.date, project: semrushCounts.project, snapshot: semrushCounts.snapshot, tolerance: PARITY_TOLERANCE, rows };
}
