/**
 * finding.js — Finding factory and validator for site-review
 *
 * Creates structured finding objects with deterministic IDs
 * derived from check name + title + url.
 */

import { createHash } from 'node:crypto';
import { SEVERITIES, CATEGORIES } from '../config.js';

const REQUIRED_FIELDS = ['check', 'severity', 'category', 'title', 'description'];

/**
 * Generate a short deterministic hash from input strings.
 * @param  {...string} parts
 * @returns {string} 8-char hex hash
 */
function shortHash(...parts) {
  const input = parts.filter(Boolean).join('|');
  return createHash('sha256').update(input).digest('hex').slice(0, 8);
}

/**
 * Create a validated finding object.
 *
 * @param {object} opts
 * @param {string} opts.check       - Check identifier (e.g. 'meta-tags', 'psi')
 * @param {string} opts.severity    - 'critical' | 'warning' | 'info'
 * @param {string} opts.category    - 'performance' | 'seo' | 'accessibility' | 'security' | 'code-quality'
 * @param {string} opts.title       - Short summary
 * @param {string} opts.description - Detailed explanation
 * @param {string} [opts.url]       - Page URL where issue found
 * @param {string} [opts.element]   - CSS selector or element description
 * @param {*}      [opts.actual]    - Problematic value
 * @param {*}      [opts.expected]  - What it should be
 * @param {string} [opts.recommendation] - How to fix
 * @param {object} [opts.meta]      - Check-specific data
 * @returns {object} Finding object with generated id
 */
function createFinding(opts) {
  for (const field of REQUIRED_FIELDS) {
    if (opts[field] == null || opts[field] === '') {
      throw new Error(`${field} is required`);
    }
  }

  if (!SEVERITIES.includes(opts.severity)) {
    throw new Error(`Invalid severity "${opts.severity}". Must be one of: ${SEVERITIES.join(', ')}`);
  }

  if (!CATEGORIES.includes(opts.category)) {
    throw new Error(`Invalid category "${opts.category}". Must be one of: ${CATEGORIES.join(', ')}`);
  }

  const id = `${opts.check}-${shortHash(opts.check, opts.title, opts.url)}`;

  const finding = {
    id,
    check: opts.check,
    severity: opts.severity,
    category: opts.category,
    title: opts.title,
    description: opts.description,
  };

  // Attach optional fields only if provided
  if (opts.url !== undefined) finding.url = opts.url;
  if (opts.element !== undefined) finding.element = opts.element;
  if (opts.actual !== undefined) finding.actual = opts.actual;
  if (opts.expected !== undefined) finding.expected = opts.expected;
  if (opts.recommendation !== undefined) finding.recommendation = opts.recommendation;
  if (opts.meta !== undefined) finding.meta = opts.meta;

  return finding;
}

/**
 * Validate a raw finding object (e.g. loaded from JSON).
 *
 * @param {object} finding
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateFinding(finding) {
  const errors = [];

  for (const field of [...REQUIRED_FIELDS, 'id']) {
    if (finding[field] == null || finding[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (finding.severity && !SEVERITIES.includes(finding.severity)) {
    errors.push(`Invalid severity "${finding.severity}". Must be one of: ${SEVERITIES.join(', ')}`);
  }

  if (finding.category && !CATEGORIES.includes(finding.category)) {
    errors.push(`Invalid category "${finding.category}". Must be one of: ${CATEGORIES.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

export { createFinding, validateFinding };
