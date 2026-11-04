// Maps published Webflow CSS classes to the nearest Client First text size and weight utility (ties go to the smaller size, and text-size-* beats heading-style-* at equal size) and runs the V3 foundation gate; runnable as a CLI.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseCssClasses,
  readBlocks,
  splitTopLevel,
  stripCssComments,
} from '../../../../tools/webflow/validate-section.js';
import { loadTree, normaliseStyleName, pageMetrics } from './page-metrics.js';

const DEBUG = false;

const USAGE =
  'usage: css-sizes.js <css-file-or-url> [--scale <client.json>|css] [--json] ' +
  '[--gate [--tree <tree.json>]] [class ...]\n';
const BASE_PX = 16;
const MAX_VAR_HOPS = 10;

export const DEFAULT_SCALE = Object.freeze({
  'heading-style-h1': 64,
  'heading-style-h2': 48,
  'heading-style-h3': 32,
  'heading-style-h4': 24,
  'heading-style-h5': 20,
  'heading-style-h6': 16,
  'text-size-large': 24,
  'text-size-medium': 20,
  'text-size-regular': 16,
  'text-size-small': 14,
  'text-size-tiny': 12,
});

export const WEIGHT_SCALE = Object.freeze({
  'text-weight-light': 300,
  'text-weight-normal': 400,
  'text-weight-medium': 500,
  'text-weight-semibold': 600,
  'text-weight-bold': 700,
  'text-weight-xbold': 800,
});

const FOUNDATION_CLASSES = [
  'heading-style-h1',
  'heading-style-h2',
  'heading-style-h3',
  'heading-style-h4',
  'heading-style-h5',
  'heading-style-h6',
  'text-size-large',
  'text-size-medium',
  'text-size-regular',
  'text-size-small',
  'text-size-tiny',
  'text-weight-*',
  'container-large',
  'container-medium',
  'container-small',
  'page-wrapper',
  'main-wrapper',
];
const SECTION_PADDING_VAR = '--_layout---section-padding--';

const round = (n, places = 4) => Math.round(n * 10 ** places) / 10 ** places;

function topLevelRules(css) {
  return readBlocks(stripCssComments(css))
    .filter((block) => !block.prelude.startsWith('@'))
    .map(({ prelude, body }) => ({ selector: prelude, body }));
}

function declarations(body) {
  return splitTopLevel(body, ';')
    .map((chunk) => {
      const colon = chunk.indexOf(':');
      if (colon === -1) return null;
      return {
        property: chunk.slice(0, colon).trim(),
        value: chunk.slice(colon + 1).trim(),
      };
    })
    .filter((d) => d && d.property);
}

export function resolveVars(css) {
  const vars = new Map();
  for (const rule of topLevelRules(css)) {
    const selectors = splitTopLevel(rule.selector, ',').map((s) => s.trim());
    if (!selectors.some((s) => s === ':root' || s === 'html' || s === 'body')) continue;
    for (const { property, value } of declarations(rule.body)) {
      if (property.startsWith('--')) vars.set(property, value);
    }
  }
  return vars;
}

function resolveValue(value, vars, hops = 0) {
  if (value == null) return null;
  let text = String(value).replace(/!\s*important\s*$/i, '').trim();
  if (hops > MAX_VAR_HOPS) return null;
  let start = text.indexOf('var(');
  while (start !== -1) {
    let depth = 0;
    let end = start + 3;
    for (; end < text.length; end++) {
      if (text[end] === '(') depth++;
      else if (text[end] === ')' && --depth === 0) break;
    }
    if (end >= text.length) return null;
    const [name, ...rest] = splitTopLevel(text.slice(start + 4, end), ',');
    const fallback = rest.length ? rest.join(',').trim() : null;
    const own = vars.get(name.trim());
    const replacement = resolveValue(own ?? fallback, vars, hops + 1);
    if (replacement == null) return null;
    text = text.slice(0, start) + replacement + text.slice(end + 1);
    start = text.indexOf('var(');
  }
  return text;
}

function lengthPx(value) {
  const m = /^(-?\d*\.?\d+)(px|rem|em|%)$/i.exec(value ?? '');
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === 'px') return n;
  if (unit === '%') return (n / 100) * BASE_PX;
  return n * BASE_PX;
}

function weightValue(value) {
  if (value == null) return null;
  if (/^\d+$/.test(value)) return Number(value);
  if (value === 'bold') return 700;
  if (value === 'normal') return 400;
  return null;
}

function lineHeightValue(value, fontSizePx) {
  if (value == null) return null;
  if (/^\d*\.?\d+$/.test(value)) return Number(value);
  const pct = /^(\d*\.?\d+)%$/.exec(value);
  if (pct) return round(Number(pct[1]) / 100, 3);
  const px = lengthPx(value);
  if (px != null && fontSizePx) return round(px / fontSizePx, 3);
  return null;
}

function selectorKey(selector) {
  return /^(\.-?[_a-zA-Z][\w-]*)+$/.test(selector) ? selector.slice(1) : null;
}

export function classSizes(css) {
  const vars = resolveVars(css);
  const raw = new Map();
  for (const rule of topLevelRules(css)) {
    const typography = declarations(rule.body).filter((d) =>
      ['font-size', 'font-weight', 'line-height'].includes(d.property.toLowerCase()),
    );
    if (!typography.length) continue;
    for (const selector of splitTopLevel(rule.selector, ',')) {
      const key = selectorKey(selector.trim());
      if (!key) continue;
      const entry = raw.get(key) ?? {};
      for (const { property, value } of typography) entry[property.toLowerCase()] = value;
      raw.set(key, entry);
    }
  }
  const sizes = new Map();
  for (const [name, entry] of raw) {
    const fontSizePx = lengthPx(resolveValue(entry['font-size'], vars));
    sizes.set(name, {
      fontSizePx,
      fontSizeRem: fontSizePx == null ? null : round(fontSizePx / BASE_PX),
      fontWeight: weightValue(resolveValue(entry['font-weight'], vars)),
      lineHeight: lineHeightValue(resolveValue(entry['line-height'], vars), fontSizePx),
    });
  }
  DEBUG && console.log('classSizes', sizes.size);
  return sizes;
}

const isHeadingStyle = (name) => /^heading-style-h[1-6]$/.test(name);
const isTextSize = (name) => name.startsWith('text-size-');

function scaleEntries(scale, only) {
  return Object.entries(scale)
    .filter(([name, px]) => {
      if (typeof px !== 'number') return false;
      if (only === 'heading') return isHeadingStyle(name);
      if (only === 'text') return isTextSize(name);
      return isHeadingStyle(name) || isTextSize(name);
    })
    .sort((a, b) => a[1] - b[1] || isTextSize(b[0]) - isTextSize(a[0]));
}

export function nearestUtility(px, scale = DEFAULT_SCALE, { only } = {}) {
  if (px == null || Number.isNaN(px)) return null;
  const entries = scaleEntries(scale, only);
  if (!entries.length) return null;
  let best = entries[0];
  for (const entry of entries) {
    if (Math.abs(px - entry[1]) < Math.abs(px - best[1])) best = entry;
  }
  return {
    class: best[0],
    px: best[1],
    delta: round(px - best[1], 3),
    clamped: px < entries[0][1] || px > entries[entries.length - 1][1],
  };
}

export function nearestWeight(weight) {
  if (weight == null) return null;
  let best = null;
  for (const [name, value] of Object.entries(WEIGHT_SCALE)) {
    if (!best || Math.abs(weight - value) < Math.abs(weight - best[1])) best = [name, value];
  }
  return best[0];
}

function scaleValuePx(value) {
  if (typeof value === 'number') return value;
  return lengthPx(String(value).trim());
}

export function loadScale(path) {
  const overrides = JSON.parse(readFileSync(path, 'utf8'));
  const scale = { ...DEFAULT_SCALE };
  for (const [name, value] of Object.entries(overrides)) {
    const px = scaleValuePx(value);
    if (px != null) scale[name] = px;
  }
  return scale;
}

export function scaleFromCss(css) {
  const sizes = classSizes(css);
  const scale = { ...DEFAULT_SCALE };
  for (const name of Object.keys(DEFAULT_SCALE)) {
    const px = sizes.get(name)?.fontSizePx;
    if (px != null) scale[name] = px;
  }
  return scale;
}

export function mapClasses(css, scale = DEFAULT_SCALE, names = null) {
  const sizes = classSizes(css);
  const keys = names ?? [...sizes.keys()].filter((k) => sizes.get(k).fontSizePx != null);
  return keys
    .filter((name) => sizes.has(name))
    .map((name) => {
      const size = sizes.get(name);
      const nearest = nearestUtility(size.fontSizePx, scale);
      return {
        class: name,
        fontSizePx: size.fontSizePx,
        fontSizeRem: size.fontSizeRem,
        fontWeight: size.fontWeight,
        lineHeight: size.lineHeight,
        utility: nearest?.class ?? null,
        delta: nearest?.delta ?? null,
        clamped: nearest?.clamped ?? false,
        headingUtility:
          nearestUtility(size.fontSizePx, scale, { only: 'heading' })?.class ?? null,
        textUtility: nearestUtility(size.fontSizePx, scale, { only: 'text' })?.class ?? null,
        weightUtility: nearestWeight(size.fontWeight),
      };
    });
}

export function webflowClassName(styleName) {
  const slug = normaliseStyleName(styleName)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return /^\d/.test(slug) ? `_${slug}` : slug;
}

export function foundationGate(css, { knownClasses = [] } = {}) {
  const classes = new Set([...parseCssClasses(css).keys(), ...knownClasses]);
  const missing = FOUNDATION_CLASSES.filter((name) =>
    name === 'text-weight-*'
      ? ![...classes].some((c) => c.startsWith('text-weight-'))
      : !classes.has(name),
  );
  if (!css.includes(SECTION_PADDING_VAR)) missing.push(`${SECTION_PADDING_VAR}*`);
  return { ok: missing.length === 0, missing };
}

function parseArgs(argv) {
  const args = { source: null, scale: null, json: false, gate: false, tree: null, classes: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--scale') args.scale = argv[++i] ?? null;
    else if (arg === '--tree') args.tree = argv[++i] ?? null;
    else if (arg === '--json') args.json = true;
    else if (arg === '--gate') args.gate = true;
    else if (!args.source) args.source = arg;
    else args.classes.push(arg);
  }
  return args;
}

async function readCss(source) {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }
  return readFileSync(source, 'utf8');
}

const show = (value, suffix = '') => (value == null ? '-' : `${value}${suffix}`);

function formatRow(row) {
  return [
    row.class,
    `${show(row.fontSizePx, 'px')} (${show(row.fontSizeRem, 'rem')})`,
    `weight ${show(row.fontWeight)}`,
    `lh ${show(row.lineHeight)}`,
    `-> ${show(row.utility)} (delta ${show(row.delta)})${row.clamped ? ' clamped' : ''}`,
    show(row.weightUtility),
  ].join('  ');
}

export async function main(argv) {
  const args = parseArgs(argv);
  if (!args.source || (args.scale === null && argv.includes('--scale'))) {
    process.stderr.write(USAGE);
    return 2;
  }
  let css;
  try {
    css = await readCss(args.source);
  } catch (err) {
    process.stderr.write(`could not read ${args.source}: ${err.message}\n`);
    return 2;
  }

  if (args.gate) {
    let knownClasses = [];
    if (args.tree) {
      try {
        const metrics = pageMetrics(loadTree(readFileSync(args.tree, 'utf8')));
        knownClasses = metrics.classes.map((c) => c.trim());
      } catch (err) {
        process.stderr.write(`could not read ${args.tree}: ${err.message}\n`);
        return 2;
      }
    }
    const result = foundationGate(css, { knownClasses });
    if (args.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else if (result.ok) process.stdout.write('OK foundation gate\n');
    else {
      process.stdout.write(`FOUNDATION MISSING: ${result.missing.join(', ')}\n`);
      process.stdout.write('Run task C2 (Client First V3 foundation) before building.\n');
    }
    return result.ok ? 0 : 1;
  }

  let scale = DEFAULT_SCALE;
  if (args.scale === 'css') scale = scaleFromCss(css);
  else if (args.scale) {
    try {
      scale = loadScale(args.scale);
    } catch (err) {
      process.stderr.write(`could not read ${args.scale}: ${err.message}\n`);
      return 2;
    }
  }

  const requested = args.classes.map(webflowClassName);
  const rows = mapClasses(css, scale, requested.length ? requested : null);
  const found = new Set(rows.map((r) => r.class));
  const declared = parseCssClasses(css);
  const unsized = requested.filter((name) => !found.has(name) && declared.has(name));
  const missing = requested.filter((name) => !found.has(name) && !declared.has(name));

  if (args.json) {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
  } else {
    for (const row of rows) process.stdout.write(`${formatRow(row)}\n`);
    for (const name of unsized) {
      process.stdout.write(`${name}  no font-size, weight or line-height\n`);
    }
    for (const name of missing) process.stdout.write(`${name}  not in the CSS\n`);
  }
  return missing.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
