#!/usr/bin/env node

/**
 * wf-gen.js — Webflow Clipboard JSON Generator
 *
 * Generate Webflow-native elements from text descriptions and inject them
 * into the Designer clipboard via Chrome DevTools Protocol.
 *
 * Usage:
 *   npm run wf-gen -- --description "hero section with heading and CTA"
 *   npm run wf-gen -- --description "pricing grid with three cards" --dry-run
 *   npm run wf-gen -- --description "contact form" --no-inject
 *
 * Flags:
 *   --description "..."   Generate from text via Anthropic API
 *   --dry-run              Print JSON to stdout, no inject
 *   --no-inject            Print JSON + fallback one-liner, no inject
 *   --model <id>           Override model (default: claude-sonnet-4-6)
 */

import { generateJson } from './generate-json.js';
import { validateWfJson } from './validate-wf-json.js';
import { injectToClipboard } from './inject-clipboard.js';

/**
 * Client First utility class names that already exist in the project (v3 set plus
 * the v2 names still found in older builds). These are stripped from the
 * generated JSON by default so Webflow matches them to the existing project
 * classes instead of creating duplicates.
 */
const CF_SIZES = [
  '0', 'xxtiny', 'xtiny', 'tiny', 'xxsmall', 'xsmall', 'small', 'medium',
  'large', 'xlarge', 'xxlarge', 'huge', 'xhuge', 'xxhuge',
];
const CF_DIRECTIONS = ['top', 'bottom', 'left', 'right', 'horizontal', 'vertical'];
const CF_SPACING = CF_SIZES.flatMap((size) => [
  `margin-${size}`,
  `padding-${size}`,
  `gap-${size}`,
  ...CF_DIRECTIONS.flatMap((dir) => [`margin-${dir}-${size}`, `padding-${dir}-${size}`]),
]);
const CF_UTILITY_CLASSES = new Set([
  // Structure
  'page-wrapper', 'main-wrapper',
  'padding-global', 'container-large', 'container-medium', 'container-small',
  'padding-section-small', 'padding-section-medium', 'padding-section-large',
  'padding-section-top-small', 'padding-section-top-medium', 'padding-section-top-large',
  'padding-section-bottom-small', 'padding-section-bottom-medium', 'padding-section-bottom-large',
  // Headings
  'heading-style-h1', 'heading-style-h2', 'heading-style-h3',
  'heading-style-h4', 'heading-style-h5', 'heading-style-h6',
  // Text size
  'text-size-large', 'text-size-medium', 'text-size-regular',
  'text-size-small', 'text-size-tiny',
  // Text weight
  'text-weight-light', 'text-weight-normal', 'text-weight-medium',
  'text-weight-semibold', 'text-weight-bold', 'text-weight-xbold',
  // Text style (v3 set, plus the v2 names)
  'text-style-allcaps', 'text-style-balance', 'text-style-pretty', 'text-style-italic',
  'text-style-link', 'text-style-muted', 'text-style-nowrap', 'text-style-quote',
  'text-style-strikethrough', 'text-style-1line', 'text-style-2lines', 'text-style-3lines',
  'text-style-uppercase', 'text-style-underline',
  // Text align
  'text-align-left', 'text-align-center', 'text-align-right',
  // Text color
  'text-color-primary', 'text-color-secondary', 'text-color-tertiary',
  'text-color-alternate',
  // Inherit
  'text-color-inherit', 'text-size-inherit', 'text-weight-inherit',
  'text-decoration-inherit', 'border-radius-inherit',
  // Background color
  'background-color-primary', 'background-color-secondary',
  'background-color-tertiary', 'background-color-alternate',
  // Spacing: margin-*, padding-*, gap-* in every size and direction
  ...CF_SPACING,
  'spacing-clean',
  // v2 spacers, still present in older builds
  'spacer-xxsmall', 'spacer-xsmall', 'spacer-small', 'spacer-medium',
  'spacer-large', 'spacer-xlarge', 'spacer-xxlarge',
  // Grid and display
  'grid-autofit', 'grid-autofit-css', 'grid-autofill-css', 'grid-span-full',
  ...CF_SIZES.flatMap((size) => [`grid-autofit-${size}`, `grid-autofill-${size}`]),
  'display-inline', 'display-inline-flex', 'display-contents',
  // Layout
  'max-width-full', 'max-width-full-tablet', 'max-width-full-mobile-landscape',
  'max-width-full-mobile-portrait',
  'max-width-xxlarge', 'max-width-xlarge', 'max-width-large', 'max-width-medium',
  'max-width-small', 'max-width-xsmall', 'max-width-xxsmall',
  'align-center', 'overflow-hidden', 'overflow-auto', 'overflow-visible',
  'overflow-scroll', 'overflow-clip', 'disable-select', 'text-area-vertical',
  'hide', 'hide-mobile-portrait', 'hide-mobile-landscape', 'hide-tablet', 'hide-desktop',
  'z-index-1', 'z-index-2', 'z-index-3', 'layer',
  'pointer-events-none', 'pointer-events-auto',
  'aspect-ratio-square', 'aspect-ratio-portrait', 'aspect-ratio-landscape',
  'aspect-ratio-widescreen',
  'aspect-ratio-1/1', 'aspect-ratio-16/9', 'aspect-ratio-4/3', 'aspect-ratio-3/2',
  'icon-height-small', 'icon-height-medium', 'icon-height-large',
  'icon-1x1-small', 'icon-1x1-medium', 'icon-1x1-large',
  'icon-1rem', 'icon-small', 'icon-medium', 'icon-large',
  'button',
]);

/**
 * Fully remove Client First utility classes from the payload —
 * both style entries and class references on nodes.
 * Elements paste with only custom component classes.
 * Returns { stripped, classNames } for reporting.
 */
function stripClientFirstStyles(json) {
  const cfStyleIds = new Set();
  const cfNames = [];

  json.payload.styles = json.payload.styles.filter((style) => {
    if (CF_UTILITY_CLASSES.has(style.name)) {
      cfStyleIds.add(style._id);
      cfNames.push(style.name);
      return false;
    }
    return true;
  });

  // Remove CF class refs from nodes
  for (const node of json.payload.nodes) {
    if (node.classes) {
      node.classes = node.classes.filter((id) => !cfStyleIds.has(id));
    }
  }

  return { stripped: cfStyleIds.size, classNames: cfNames };
}

function parseArgs(argv) {
  const args = {
    description: null,
    dryRun: false,
    noInject: false,
    keepCf: false,
    model: 'claude-sonnet-4-6',
  };

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--description':
        args.description = argv[++i];
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--no-inject':
        args.noInject = true;
        break;
      case '--keep-cf':
        args.keepCf = true;
        break;
      case '--model':
        args.model = argv[++i];
        break;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.description) {
    console.error('wf-gen — Webflow Clipboard JSON Generator\n');
    console.error('Usage:');
    console.error('  npm run wf-gen -- --description "hero section with heading and CTA"');
    console.error('  npm run wf-gen -- --description "pricing grid" --dry-run');
    console.error('  npm run wf-gen -- --description "contact form" --no-inject');
    console.error('\nFlags:');
    console.error('  --description "..."   Text description of the component');
    console.error('  --dry-run              Print JSON only, no clipboard inject');
    console.error('  --no-inject            Print JSON + fallback, no clipboard inject');
    console.error('  --model <id>           Override model (default: claude-sonnet-4-6)');
    console.error('  --keep-cf              Keep Client First utility class styles in output');
    process.exit(1);
  }

  // Step 1: Generate
  console.error(`Generating XscpData for: "${args.description}"...`);
  let json;
  try {
    json = await generateJson(args.description, { model: args.model });
  } catch (err) {
    console.error('Generation failed:', err.message);
    process.exit(1);
  }

  // Step 2: Validate
  const validation = validateWfJson(json);
  if (!validation.valid) {
    console.error('Validation failed:');
    for (const error of validation.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  // Step 3: Strip Client First utility class definitions (default)
  if (!args.keepCf) {
    const { stripped, classNames } = stripClientFirstStyles(json);
    if (stripped > 0) {
      console.error(`Stripped ${stripped} Client First classes (use --keep-cf to keep)`);
      console.error(`Add these in Designer after paste: ${classNames.join(', ')}`);
    }
  }

  const jsonString = JSON.stringify(json, null, 2);
  const nodeCount = json.payload.nodes.filter((n) => !n.text).length;
  const styleCount = json.payload.styles.length;
  console.error(`Generated: ${nodeCount} elements, ${styleCount} styles`);

  // Step 3: Output
  if (args.dryRun) {
    console.log(jsonString);
    return;
  }

  if (args.noInject) {
    console.log(jsonString);
    console.error('\nFallback: paste this into the Designer console (F12):');
    console.error(`copy(${JSON.stringify(json)})`);
    console.error('\nThen press Cmd+V in the Designer canvas.');
    return;
  }

  // Step 4: Inject
  const success = await injectToClipboard(JSON.stringify(json));
  if (!success) {
    // Fallback already printed by injectToClipboard
    // Also print the full JSON to stdout for reference
    console.log(jsonString);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
