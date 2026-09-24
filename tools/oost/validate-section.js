// Validates Oost Client First section files against the site CSS; runnable as a CLI.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEBUG = false;

export const SCHEMES = [
  'cream',
  'white',
  'buff',
  'yellow',
  'green-light',
  'green',
  'green-dark',
];

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
const RAW_TEXT_TAGS = new Set(['script', 'style']);
const PADDING_OK =
  /^(padding-|spacer-|button)|(_group|_card|_item|_wrapper|_component|_field|_box)$/;
const CMS_OPEN = /^\s*cms:([\w-]+)\s*$/;
const CMS_CLOSE = /^\s*\/cms:([\w-]+)\s*$/;

function stripCssComments(css) {
  let out = '';
  let quote = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      out += ch;
      if (ch === '\\') {
        out += css[++i] ?? '';
      } else if (ch === quote) {
        quote = null;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
    } else if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 1;
    } else {
      out += ch;
    }
  }
  return out;
}

function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === '\\') current += text[++i] ?? '';
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === separator && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

function readBlocks(css) {
  const blocks = [];
  let i = 0;
  while (i < css.length) {
    let prelude = '';
    let quote = null;
    while (i < css.length) {
      const ch = css[i];
      if (quote) {
        if (ch === '\\') {
          prelude += ch + (css[i + 1] ?? '');
          i += 2;
          continue;
        }
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '{' || ch === '}' || ch === ';') {
        break;
      }
      prelude += ch;
      i++;
    }
    if (i >= css.length) break;
    if (css[i] !== '{') {
      i++;
      continue;
    }
    let depth = 1;
    const start = ++i;
    quote = null;
    while (i < css.length && depth > 0) {
      const ch = css[i];
      if (quote) {
        if (ch === '\\') i++;
        else if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
      }
      i++;
    }
    blocks.push({ prelude: prelude.trim(), body: css.slice(start, i - 1) });
  }
  return blocks;
}

function parseDeclarations(body) {
  return splitTopLevel(body, ';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const colon = chunk.indexOf(':');
      if (colon === -1) return null;
      return {
        property: chunk.slice(0, colon).trim().toLowerCase(),
        value: chunk.slice(colon + 1).trim(),
      };
    })
    .filter(Boolean);
}

function subjectCompound(selector) {
  const compounds = selector
    .replace(/\s*([>+~])\s*/g, ' ')
    .trim()
    .split(/\s+/);
  return compounds[compounds.length - 1] ?? '';
}

function classNamesIn(fragment) {
  return [...fragment.replace(/::?[\w-]+(\([^)]*\))?/g, '').matchAll(/\.([\w-]+)/g)].map(
    (m) => m[1],
  );
}

function addRule(map, selectorList, declarations, media) {
  for (const raw of splitTopLevel(selectorList, ',')) {
    const selector = raw.trim();
    if (!selector) continue;
    for (const name of classNamesIn(selector)) {
      if (!map.has(name)) map.set(name, []);
    }
    const subject = subjectCompound(selector);
    if (subject.includes('::')) continue;
    for (const name of classNamesIn(subject)) {
      map.get(name).push(...declarations.map((d) => ({ ...d, media })));
    }
  }
}

function collectRules(css, map, media) {
  for (const block of readBlocks(css)) {
    if (block.prelude.startsWith('@')) {
      if (/^@(media|supports|layer|container)\b/i.test(block.prelude)) {
        collectRules(block.body, map, block.prelude);
      }
      continue;
    }
    addRule(map, block.prelude, parseDeclarations(block.body), media);
  }
}

export function parseCssClasses(css) {
  const map = new Map();
  collectRules(stripCssComments(css), map, null);
  return map;
}

function parseAttributes(source) {
  const attrs = {};
  const pattern = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const m of source.matchAll(pattern)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

function readTag(html, start) {
  let i = start;
  let quote = null;
  while (i < html.length) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
    i++;
  }
  return -1;
}

export function parseHtml(html) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const errors = [];
  let i = 0;
  const top = () => stack[stack.length - 1];
  const pushText = (value) => {
    if (value) top().children.push({ type: 'text', value });
  };
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      pushText(html.slice(i));
      break;
    }
    pushText(html.slice(i, lt));
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      if (end === -1) {
        errors.push('parse: unterminated comment');
        break;
      }
      top().children.push({ type: 'comment', value: html.slice(lt + 4, end) });
      i = end + 3;
      continue;
    }
    if (html.startsWith('<!', lt) || html.startsWith('<?', lt)) {
      const end = html.indexOf('>', lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    const closing = html[lt + 1] === '/';
    const nameMatch = /^[a-zA-Z][\w-]*/.exec(html.slice(lt + (closing ? 2 : 1)));
    if (!nameMatch) {
      pushText('<');
      i = lt + 1;
      continue;
    }
    const tag = nameMatch[0].toLowerCase();
    const end = readTag(html, lt);
    if (end === -1) {
      errors.push(`parse: unterminated tag <${tag}`);
      break;
    }
    i = end + 1;
    if (closing) {
      if (VOID_TAGS.has(tag)) continue;
      const openIndex = stack.map((n) => n.tag).lastIndexOf(tag);
      if (openIndex <= 0) {
        errors.push(`parse: unexpected </${tag}>`);
        continue;
      }
      if (openIndex !== stack.length - 1) {
        errors.push(`parse: mismatched </${tag}>, expected </${top().tag}>`);
      }
      stack.length = openIndex;
      continue;
    }
    const inner = html.slice(lt + 1 + tag.length, end);
    const selfClosing = /\/\s*$/.test(inner);
    const node = {
      type: 'element',
      tag,
      attrs: parseAttributes(inner.replace(/\/\s*$/, '')),
      children: [],
    };
    top().children.push(node);
    if (RAW_TEXT_TAGS.has(tag)) {
      const close = html.toLowerCase().indexOf(`</${tag}`, i);
      const stop = close === -1 ? html.length : close;
      node.children.push({ type: 'text', value: html.slice(i, stop) });
      i = close === -1 ? html.length : readTag(html, close) + 1;
      continue;
    }
    if (!VOID_TAGS.has(tag) && !selfClosing) stack.push(node);
  }
  for (const open of stack.slice(1)) errors.push(`parse: unclosed <${open.tag}>`);
  return { root, errors };
}

const classesOf = (node) => (node.attrs?.class ?? '').split(/\s+/).filter(Boolean);
const elementChildren = (node) => node.children.filter((c) => c.type === 'element');
const describeNode = (node) => {
  const cls = classesOf(node);
  return `<${node.tag}${cls.length ? `.${cls.join('.')}` : ''}>`;
};

function walk(node, visit) {
  for (const child of node.children) {
    visit(child);
    if (child.type === 'element') walk(child, visit);
  }
}

function checkRoot(tree, errors) {
  const top = tree.children;
  const roots = top.filter((c) => c.type === 'element');
  if (top.some((c) => c.type === 'text' && c.value.trim())) {
    errors.push('rule 1: text outside the root element');
  }
  if (roots.length !== 1) {
    errors.push(`rule 1: expected exactly one root element, found ${roots.length}`);
    return roots[0] ?? null;
  }
  const root = roots[0];
  if (root.tag !== 'section')
    errors.push(`rule 1: root must be <section>, found <${root.tag}>`);
  const first = classesOf(root)[0] ?? '';
  if (!/^section_[a-z0-9][\w-]*$/.test(first)) {
    errors.push('rule 1: root must carry class="section_<name> …" as its first class');
  }
  return root;
}

function checkScheme(root, knownSchemes, errors) {
  const schemes = classesOf(root).filter((c) => c.startsWith('scheme-'));
  if (schemes.length !== 1) {
    errors.push(
      `rule 2: root must carry exactly one scheme- class, found ${schemes.length}`,
    );
    return;
  }
  const mode = schemes[0].slice('scheme-'.length);
  if (!knownSchemes.includes(mode)) {
    errors.push(
      `rule 2: unknown scheme "${schemes[0]}" (allowed: ${knownSchemes.join(', ')})`,
    );
  }
}

function checkChain(root, errors) {
  const cls = classesOf(root);
  const exempt =
    /^section_(nav|footer)$/.test(cls[0] ?? '') ||
    cls.some((c) => c.startsWith('nav_') || c.startsWith('footer_'));
  const steps = [
    { label: 'padding-global', test: (c) => c === 'padding-global' },
    {
      label: 'container-small|medium|large',
      test: (c) => /^container-(small|medium|large)$/.test(c),
    },
    {
      label: 'padding-section-small|medium|large',
      test: (c) => /^padding-section-(small|medium|large)$/.test(c),
    },
  ];
  let node = root;
  for (const [index, step] of steps.entries()) {
    if (exempt && index > 0) return;
    const child = elementChildren(node)[0];
    if (!child || !classesOf(child).some(step.test)) {
      const found = child ? describeNode(child) : 'nothing';
      errors.push(
        `rule 3: expected ${describeNode(node)} › .${step.label} as first child, found ${found}`,
      );
      return;
    }
    node = child;
  }
}

function checkElements(root, cssMap, errors) {
  const used = new Set();
  const visit = (node) => {
    if (node.type !== 'element') return;
    if ('style' in node.attrs)
      errors.push(`rule 4: style= attribute on ${describeNode(node)}`);
    const cls = classesOf(node);
    cls.forEach((c) => used.add(c));
    if (/^h[1-6]$/.test(node.tag) && !cls.some((c) => c.startsWith('heading-style-'))) {
      errors.push(`rule 9: ${describeNode(node)} needs a heading-style- class`);
    }
    const spacer = cls.find((c) => c.startsWith('spacer-'));
    if (spacer) {
      if (node.tag !== 'div')
        errors.push(`rule 6: ${spacer} must be a <div>, found <${node.tag}>`);
      if (cls.length !== 1) errors.push(`rule 6: ${spacer} must carry exactly one class`);
      const hasContent = node.children.some(
        (c) => c.type === 'element' || (c.type === 'text' && c.value.trim()),
      );
      if (hasContent) errors.push(`rule 6: ${spacer} must be empty`);
    }
  };
  visit(root);
  walk(root, visit);
  for (const name of used) {
    if (name.startsWith('w-')) continue;
    if (!cssMap.has(name)) {
      errors.push(`rule 5: unknown class "${name}" (not in the CSS)`);
      continue;
    }
    const decls = cssMap.get(name);
    if (
      !name.startsWith('container-') &&
      decls.some((d) => d.property.startsWith('margin'))
    ) {
      errors.push(`rule 7: class "${name}" has a margin declaration`);
    }
    if (!PADDING_OK.test(name) && decls.some((d) => d.property.startsWith('padding'))) {
      errors.push(`rule 7: class "${name}" has a padding declaration`);
    }
  }
}

function checkCmsMarkers(tree, errors) {
  const open = [];
  walk(tree, (node) => {
    if (node.type !== 'comment') return;
    const start = CMS_OPEN.exec(node.value);
    const end = CMS_CLOSE.exec(node.value);
    if (start) open.push(start[1]);
    if (end) {
      const expected = open[open.length - 1];
      if (expected === undefined) {
        errors.push(`rule 8: cms marker "/cms:${end[1]}" closes nothing`);
      } else {
        if (expected !== end[1]) {
          errors.push(`rule 8: cms marker "/cms:${end[1]}" closes "cms:${expected}"`);
        }
        open.pop();
      }
    }
  });
  for (const name of open) errors.push(`rule 8: unclosed cms marker "${name}"`);
}

export function validateSection(html, css, options = {}) {
  const knownSchemes = options.schemes ?? SCHEMES;
  const cssMap = typeof css === 'string' ? parseCssClasses(css) : css;
  const { root: tree, errors: parseErrors } = parseHtml(html);
  const errors = [...parseErrors];
  const root = checkRoot(tree, errors);
  if (root) {
    checkScheme(root, knownSchemes, errors);
    checkChain(root, errors);
    checkElements(root, cssMap, errors);
  }
  checkCmsMarkers(tree, errors);
  DEBUG && console.log('validateSection', errors);
  return { ok: errors.length === 0, errors };
}

export function validateFiles(cssPath, files) {
  const cssMap = parseCssClasses(readFileSync(cssPath, 'utf8'));
  return files.map((file) => ({
    file,
    ...validateSection(readFileSync(file, 'utf8'), cssMap),
  }));
}

export function validateAll(cssPath, dir) {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.html'))
    .sort()
    .map((name) => join(dir, name));
  return validateFiles(cssPath, files);
}

function main(argv) {
  const [cssPath, ...targets] = argv;
  if (!cssPath || targets.length === 0) {
    process.stderr.write(
      'usage: validate-section.js <client-first.css> <section.html|dir …>\n',
    );
    return 2;
  }
  const results = targets.flatMap((target) =>
    statSync(target).isDirectory()
      ? validateAll(cssPath, target)
      : validateFiles(cssPath, [target]),
  );
  let failed = 0;
  for (const result of results) {
    if (result.ok) {
      process.stdout.write(`OK ${result.file}\n`);
    } else {
      failed++;
      for (const error of result.errors)
        process.stderr.write(`${result.file}: ${error}\n`);
    }
  }
  if (failed) process.stderr.write(`${failed} of ${results.length} section(s) failed\n`);
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
