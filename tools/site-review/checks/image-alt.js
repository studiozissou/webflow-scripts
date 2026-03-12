/**
 * image-alt.js — Missing alt text and dimension detection
 *
 * Parses HTML with regex to find <img> tags and check for
 * missing alt attributes, empty alt on non-decorative images,
 * and missing width/height attributes (CLS contributors).
 */

import { createFinding } from '../lib/finding.js';

const meta = {
  name: 'image-alt',
  label: 'Image Alt Text',
  category: 'accessibility',
  tier: 1,
  parallel: true,
};

/**
 * Extract all <img> tags from HTML as raw strings.
 * @param {string} html
 * @returns {string[]}
 */
function extractImgTags(html) {
  const matches = html.match(/<img\b[\s\S]*?\/?>/gi);
  return matches || [];
}

/**
 * Get an attribute value from a tag string.
 * @param {string} tag
 * @param {string} attr
 * @returns {string|null} - null if attribute not present, string if present (may be empty)
 */
function getAttr(tag, attr) {
  // Match attr="value", attr='value', or attr (boolean)
  const pattern = new RegExp(`\\b${attr}=["']([^"']*)["']`, 'i');
  const match = tag.match(pattern);
  if (match) return match[1];

  // Check for boolean attribute (no value)
  const boolPattern = new RegExp(`\\b${attr}(?:\\s|/?>|$)`, 'i');
  if (boolPattern.test(tag)) return '';

  return null;
}

/**
 * Check if an image tag is marked as decorative.
 * @param {string} tag
 * @returns {boolean}
 */
function isDecorative(tag) {
  const role = getAttr(tag, 'role');
  if (role === 'presentation') return true;

  const ariaHidden = getAttr(tag, 'aria-hidden');
  if (ariaHidden === 'true') return true;

  return false;
}

async function check({ url, pages, config, log, fetchPage }) {
  const findings = [];

  for (const pageUrl of pages) {
    log.log(`image-alt: checking ${pageUrl}`);

    const { html } = await fetchPage(pageUrl);
    const imgTags = extractImgTags(html);

    for (const tag of imgTags) {
      const src = getAttr(tag, 'src') || '(unknown)';
      const alt = getAttr(tag, 'alt');

      // No alt attribute at all
      if (alt === null) {
        findings.push(createFinding({
          check: 'image-alt',
          severity: 'warning',
          category: 'accessibility',
          title: 'Missing alt attribute',
          description: `Image is missing an alt attribute entirely.`,
          url: pageUrl,
          element: src,
          recommendation: 'Add descriptive alt text, or alt="" for decorative images.',
        }));
      }
      // Empty alt on non-decorative image
      else if (alt === '' && !isDecorative(tag)) {
        findings.push(createFinding({
          check: 'image-alt',
          severity: 'info',
          category: 'accessibility',
          title: 'Empty alt on non-decorative image',
          description: 'Image has alt="" but is not marked as decorative (no role="presentation" or aria-hidden="true").',
          url: pageUrl,
          element: src,
          recommendation: 'Add descriptive alt text, or mark as decorative with role="presentation".',
        }));
      }

      // Missing width AND height (CLS)
      const width = getAttr(tag, 'width');
      const height = getAttr(tag, 'height');
      if (width === null && height === null) {
        findings.push(createFinding({
          check: 'image-alt',
          severity: 'info',
          category: 'performance',
          title: 'Image missing width and height',
          description: 'Image lacks both width and height attributes, which can contribute to Cumulative Layout Shift (CLS).',
          url: pageUrl,
          element: src,
          recommendation: 'Add width and height attributes to prevent layout shifts during loading.',
        }));
      }
    }
  }

  return findings;
}

export { check, meta };
