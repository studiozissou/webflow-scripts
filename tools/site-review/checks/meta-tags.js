/**
 * meta-tags.js — Title, description, OG, and canonical validation
 *
 * Parses HTML with regex to check for missing or misconfigured
 * meta tags across all pages. Detects duplicates cross-page.
 */

import { createFinding } from '../lib/finding.js';

const meta = {
  name: 'meta-tags',
  label: 'Meta Tags',
  category: 'seo',
  tier: 1,
  parallel: true,
};

/**
 * Extract the content of a <title> tag from HTML.
 * @param {string} html
 * @returns {string|null}
 */
function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract a meta tag's content attribute by name.
 * @param {string} html
 * @param {string} name
 * @returns {string|null}
 */
function extractMetaContent(html, name) {
  const escaped = escapeRegex(name);
  // Find all <meta> tags, then check if they contain the right name/property
  const metaTagRegex = /<meta\b[\s\S]*?\/?>/gi;
  let tagMatch;
  while ((tagMatch = metaTagRegex.exec(html)) !== null) {
    const tag = tagMatch[0];
    // Check if this tag has the right name or property attribute
    const namePattern = new RegExp(`(?:name|property)=["']${escaped}["']`, 'i');
    if (!namePattern.test(tag)) continue;
    // Extract content value
    const contentMatch = tag.match(/content=["']([\s\S]*?)["']/i);
    if (contentMatch) return contentMatch[1].trim();
    return '';
  }
  return null;
}

/**
 * Check if a canonical link tag exists.
 * @param {string} html
 * @returns {boolean}
 */
function hasCanonical(html) {
  return /<link\s+[^>]*rel=["']canonical["'][^>]*>/i.test(html);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function check({ url, pages, config, log, fetchPage }) {
  const findings = [];
  const titleMap = new Map(); // title -> [urls]
  const descMap = new Map();  // description -> [urls]

  const { titleLength, descriptionLength } = config.thresholds;

  for (const pageUrl of pages) {
    log.log(`meta-tags: checking ${pageUrl}`);

    const { html } = await fetchPage(pageUrl);

    // --- Title ---
    const title = extractTitle(html);
    if (title === null || title === '') {
      findings.push(createFinding({
        check: 'meta-tags',
        severity: 'critical',
        category: 'seo',
        title: 'Missing <title> tag',
        description: 'The page has no <title> tag or it is empty.',
        url: pageUrl,
        recommendation: 'Add a descriptive <title> tag between 30 and 60 characters.',
      }));
    } else {
      // Track for duplicate detection
      const existing = titleMap.get(title) || [];
      existing.push(pageUrl);
      titleMap.set(title, existing);

      // Length checks
      const len = title.length;
      if (len < titleLength.warning.min) {
        findings.push(createFinding({
          check: 'meta-tags',
          severity: 'warning',
          category: 'seo',
          title: 'Title too short',
          description: `Title is ${len} characters, below the recommended minimum of ${titleLength.warning.min}.`,
          url: pageUrl,
          actual: len,
          expected: `${titleLength.warning.min}–${titleLength.warning.max} characters`,
          recommendation: 'Write a more descriptive title.',
        }));
      } else if (len > titleLength.warning.max) {
        findings.push(createFinding({
          check: 'meta-tags',
          severity: 'warning',
          category: 'seo',
          title: 'Title too long',
          description: `Title is ${len} characters, above the recommended maximum of ${titleLength.warning.max}.`,
          url: pageUrl,
          actual: len,
          expected: `${titleLength.warning.min}–${titleLength.warning.max} characters`,
          recommendation: 'Shorten the title to fit within search result display limits.',
        }));
      }
    }

    // --- Meta description ---
    const description = extractMetaContent(html, 'description');
    if (description === null) {
      findings.push(createFinding({
        check: 'meta-tags',
        severity: 'critical',
        category: 'seo',
        title: 'Missing meta description',
        description: 'The page has no <meta name="description"> tag.',
        url: pageUrl,
        recommendation: 'Add a meta description between 70 and 160 characters.',
      }));
    } else {
      const existing = descMap.get(description) || [];
      existing.push(pageUrl);
      descMap.set(description, existing);

      const len = description.length;
      if (len < descriptionLength.warning.min) {
        findings.push(createFinding({
          check: 'meta-tags',
          severity: 'warning',
          category: 'seo',
          title: 'Meta description too short',
          description: `Description is ${len} characters, below the recommended minimum of ${descriptionLength.warning.min}.`,
          url: pageUrl,
          actual: len,
          expected: `${descriptionLength.warning.min}–${descriptionLength.warning.max} characters`,
        }));
      } else if (len > descriptionLength.warning.max) {
        findings.push(createFinding({
          check: 'meta-tags',
          severity: 'warning',
          category: 'seo',
          title: 'Meta description too long',
          description: `Description is ${len} characters, above the recommended maximum of ${descriptionLength.warning.max}.`,
          url: pageUrl,
          actual: len,
          expected: `${descriptionLength.warning.min}–${descriptionLength.warning.max} characters`,
        }));
      }
    }

    // --- Canonical ---
    if (!hasCanonical(html)) {
      findings.push(createFinding({
        check: 'meta-tags',
        severity: 'warning',
        category: 'seo',
        title: 'Missing canonical link',
        description: 'The page has no <link rel="canonical"> tag.',
        url: pageUrl,
        recommendation: 'Add a canonical link to indicate the preferred URL for this page.',
      }));
    }

    // --- OG tags ---
    const ogTags = ['og:title', 'og:description', 'og:image'];
    for (const tag of ogTags) {
      const value = extractMetaContent(html, tag);
      if (value === null || value === '') {
        findings.push(createFinding({
          check: 'meta-tags',
          severity: 'info',
          category: 'seo',
          title: `Missing ${tag}`,
          description: `The page is missing the <meta property="${tag}"> tag.`,
          url: pageUrl,
          recommendation: `Add a ${tag} meta tag for better social media sharing.`,
        }));
      }
    }
  }

  // --- Duplicate detection (cross-page) ---
  for (const [title, urls] of titleMap) {
    if (urls.length > 1) {
      findings.push(createFinding({
        check: 'meta-tags',
        severity: 'warning',
        category: 'seo',
        title: 'Duplicate title across pages',
        description: `The title "${title}" is used on ${urls.length} pages.`,
        url: urls.sort().join(','),
        meta: { duplicateUrls: urls },
        recommendation: 'Each page should have a unique title.',
      }));
    }
  }

  for (const [desc, urls] of descMap) {
    if (urls.length > 1) {
      findings.push(createFinding({
        check: 'meta-tags',
        severity: 'warning',
        category: 'seo',
        title: 'Duplicate description across pages',
        description: `The same meta description is used on ${urls.length} pages.`,
        url: urls.sort().join(','),
        meta: { duplicateUrls: urls },
        recommendation: 'Each page should have a unique meta description.',
      }));
    }
  }

  return findings;
}

export { check, meta };
