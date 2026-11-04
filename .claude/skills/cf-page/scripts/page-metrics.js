// Counts elements, depth, distinct style names (verbatim, since a trailing non-breaking space makes a separate Webflow style) and Client First V3 classes and the main-wrapper sections of a Webflow get_all_elements tree, and prints the cf-page section map; runnable as a CLI.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEBUG = false;

const USAGE = 'usage: page-metrics.js <tree.json> [--json]\n';

const V3_SIZES =
  '(0|xxtiny|xtiny|tiny|xxsmall|xsmall|small|medium|large|xlarge|xxlarge|huge|xhuge|xxhuge)';
const DIRECTIONS = '(-(top|bottom|left|right|horizontal|vertical))?';

const CF_PATTERNS = [
  /^(page-wrapper|main-wrapper|padding-global)$/,
  /^section_[a-z0-9][a-z0-9_-]*$/,
  /^container-(small|medium|large)$/,
  /^padding-section-[a-z-]+$/,
  /^heading-style-h[1-6]$/,
  /^text-(size|weight|style|align|color)-[a-z0-9-]+$/,
  /^background-color-[a-z]+$/,
  new RegExp(`^(margin|padding)${DIRECTIONS}-${V3_SIZES}$`),
  new RegExp(`^gap-${V3_SIZES}$`),
  /^max-width-[a-z-]+$/,
  /^hide(-[a-z-]+)?$/,
  /^grid-[a-z0-9-]+$/,
  /^display-[a-z-]+$/,
  /^icon-[a-z0-9-]+$/,
  /^(button|spacing-clean|align-center|text-rich-text)$/,
  /^overflow-[a-z]+$/,
  /^z-index-[0-9]+$/,
  /^pointer-events-[a-z]+$/,
  /^aspect-ratio-[a-z]+$/,
  /^[a-z0-9]+(-[a-z0-9]+)*_[a-z0-9]+(-[a-z0-9]+)*$/,
];

export function normaliseStyleName(name) {
  return String(name ?? '').trim();
}

export function isCfClass(name) {
  return CF_PATTERNS.some((pattern) => pattern.test(name));
}

export function loadTree(json) {
  const value = typeof json === 'string' ? JSON.parse(json) : json;
  const data = value?.result?.[0]?.data ?? value?.data ?? value;
  if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
    throw new Error('not a Webflow element tree: expected {result:[{data}]} or a Body node');
  }
  return data;
}

const rawClassesOf = (node) => (node.styleNames ?? []).filter((name) => normaliseStyleName(name));
const classesOf = (node) => rawClassesOf(node).map(normaliseStyleName);
const childrenOf = (node) => (Array.isArray(node.children) ? node.children : []);
const isComponent = (node) => node.type === 'ComponentInstance';
const componentName = (node) => node.instanceDetails?.name ?? 'Component';
const labelOf = (node) => classesOf(node)[0] ?? (node.type || 'Element');

function subtree(node) {
  let elements = 0;
  let depth = 0;
  const components = [];
  const visit = (current, level) => {
    elements++;
    depth = Math.max(depth, level);
    if (isComponent(current)) components.push(componentName(current));
    for (const child of childrenOf(current)) visit(child, level + 1);
  };
  visit(node, 0);
  return { elements, depth, components };
}

function isHidden(node, classes) {
  return (
    node.settings?.visibility === false ||
    classes.includes('hide')
  );
}

function findMainWrapper(node) {
  if (classesOf(node).includes('main-wrapper')) return node;
  for (const child of childrenOf(node)) {
    const found = findMainWrapper(child);
    if (found) return found;
  }
  return null;
}

function describeSection(node, index) {
  const classes = classesOf(node);
  const component = isComponent(node);
  const hidden = isHidden(node, classes);
  const { elements, depth, components } = subtree(node);
  let action = 'rebuild';
  if (component) action = 'keep';
  else if (hidden) action = 'drop';
  return {
    index,
    name: component ? componentName(node) : classes.join(' ') || node.type || 'Element',
    classes: rawClassesOf(node),
    tag: node.settings?.tag ?? node.settings?.block?.tag ?? null,
    type: node.type ?? '',
    elements,
    depth,
    components,
    hidden,
    isComponent: component,
    action,
  };
}

export function pageMetrics(tree) {
  const body = loadTree(tree);
  const classSet = new Set();
  const components = [];
  let elements = 0;
  let maxDepth = 0;
  const visit = (node, depth, path) => {
    elements++;
    maxDepth = Math.max(maxDepth, depth);
    for (const name of rawClassesOf(node)) classSet.add(name);
    if (isComponent(node)) {
      components.push({ name: componentName(node), path: path.join(' > ') });
    }
    const nextPath = [...path, labelOf(node)];
    for (const child of childrenOf(node)) visit(child, depth + 1, nextPath);
  };
  visit(body, 0, []);

  const mainWrapper = findMainWrapper(body);
  const container = mainWrapper ?? childrenOf(body).find((child) => child.type === 'Block');
  const sections = container
    ? childrenOf(container).map((child, i) => describeSection(child, i + 1))
    : [];

  const classes = [...classSet].sort();
  const cfClasses = classes.filter((name) => isCfClass(normaliseStyleName(name)));
  const untrimmedClasses = classes.filter((name) => name !== normaliseStyleName(name));
  const metrics = {
    elements,
    maxDepth,
    distinctClasses: classes.length,
    classes,
    cfClasses,
    cfRatio: classes.length ? cfClasses.length / classes.length : 0,
    untrimmedClasses,
    components,
    sections,
    mainWrapperFound: Boolean(mainWrapper),
  };
  DEBUG && console.log('pageMetrics', metrics.elements, metrics.maxDepth);
  return metrics;
}

const cell = (value) => String(value).replace(/\|/g, '\\|');

export function sectionMapMarkdown(metrics) {
  const lines = [
    '| # | Section classes | Type / tag | Elements | Depth | Components | Hidden | Action |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const s of metrics.sections) {
    const name = s.isComponent ? `${s.name} (component)` : s.name;
    const typeTag = s.tag ? `${s.type || 'Element'} / ${s.tag}` : s.type || 'Element';
    lines.push(
      `| ${[
        s.index,
        cell(name),
        cell(typeTag),
        s.elements,
        s.depth,
        cell(s.components.join(', ')),
        s.hidden ? 'yes' : 'no',
        s.action,
      ].join(' | ')} |`,
    );
  }
  const percent = (metrics.cfRatio * 100).toFixed(1);
  lines.push(
    '',
    `Totals: ${metrics.elements} elements, max depth ${metrics.maxDepth}, ${metrics.distinctClasses} distinct classes, ${metrics.cfClasses.length} Client First (${percent}%), ${metrics.sections.length} sections`,
  );
  const tally = ['keep', 'rebuild', 'drop'].map((action) => {
    const rows = metrics.sections.filter((s) => s.action === action);
    const total = rows.reduce((sum, s) => sum + s.elements, 0);
    return `${action} ${rows.length} (${total} elements)`;
  });
  lines.push(`Actions: ${tally.join(', ')}`);
  if (!metrics.mainWrapperFound) {
    lines.push("Note: main-wrapper not found; sections are the children of Body's first Block.");
  }
  return `${lines.join('\n')}\n`;
}

export function main(argv) {
  const json = argv.includes('--json');
  const [file] = argv.filter((arg) => arg !== '--json');
  if (!file) {
    process.stderr.write(USAGE);
    return 2;
  }
  let metrics;
  try {
    metrics = pageMetrics(readFileSync(file, 'utf8'));
  } catch (err) {
    process.stderr.write(`could not read ${file}: ${err.message}\n`);
    return 2;
  }
  const output = json ? `${JSON.stringify(metrics, null, 2)}\n` : sectionMapMarkdown(metrics);
  process.stdout.write(output);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
