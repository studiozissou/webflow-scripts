/* Swaps the Designer page disclaimer between the test copy and the report copy as the quiz phase changes. */

export const REPORT_PHASES = ["optin", "confirmation"];

export function syncPageDisclaimer(doc, phase, reportCopy) {
  const el = doc.querySelector('[data-element="disclaimer"]');
  if (!el) return null;
  if (el.dataset.testCopy === undefined) el.dataset.testCopy = el.textContent;
  const text = REPORT_PHASES.includes(phase) ? reportCopy : el.dataset.testCopy;
  el.textContent = text;
  return text;
}
