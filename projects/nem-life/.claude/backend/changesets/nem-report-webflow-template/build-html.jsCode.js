// Fills the published Webflow report template with the five validated JSON sections and
// the profile, and hands PDFShift a self-contained page. The template is the design
// surface Alex edits; every dynamic value is an element carrying a data-slot attribute.
// A template that lost a slot throws — placeholder copy must never reach a reader.
const p = $('Validate Token').first().json;
const r = $json.report;
const SECTIONS = ['opening', 'reaction', 'origin', 'cost', 'closing'];
const TEMPLATE_URL = 'https://nem-life-1.webflow.io/report-pdf-template';
const FONTS_CSS = 'https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@11d3a83cccce1190e1c1195184e0ca312bae9b33/projects/nem-life/src/report-fonts.css';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

let html = String(await this.helpers.httpRequest({ method: 'GET', url: TEMPLATE_URL, json: false }));

const missing = (what) => new Error('Report template is missing ' + what + ' - check ' + TEMPLATE_URL);

// The whole element carrying the attribute: tag, attributes before, attributes after, inner html.
const elementRe = (attr, name) => new RegExp(
  '<(\\w+)\\b([^>]*?)\\s*' + attr + '="' + name + '"([^>]*)>([\\s\\S]*?)</\\1>'
);

// Replaces the inner html of a text slot, keeping the element and its attributes.
const fillText = (name, value) => {
  const re = elementRe('data-slot', name);
  if (!re.test(html)) throw missing('data-slot="' + name + '"');
  html = html.replace(re, (m, tag, before, after) =>
    '<' + tag + before + ' data-slot="' + name + '"' + after + '>' + value + '</' + tag + '>');
};

// A section placeholder is one paragraph; the prose becomes one paragraph per blank line,
// each carrying the placeholder's class so the Designer's paragraph styling applies.
const fillSection = (name, text) => {
  const re = elementRe('data-slot', name);
  const m = html.match(re);
  if (!m) throw missing('data-slot="' + name + '"');
  const cls = (m[2] + ' ' + m[3]).match(/class="([^"]*)"/);
  const open = '<p' + (cls ? ' class="' + cls[1] + '"' : '') + '>';
  const paras = esc(text).trim().split(/\n{2,}/)
    .map((x) => open + x.replace(/\n/g, '<br>') + '</p>')
    .join('');
  html = html.replace(re, () => '<div data-slot="' + name + '">' + paras + '</div>');
};

// Fixed editorial copy, selected client-side on the conclusion key alone. Empty until
// Alex's Intro lines tab is exported — then the whole block goes, not just the text.
const introLine = String(p.introLine || '').trim();
if (introLine) {
  fillText('intro-line', esc(introLine));
} else {
  if (!elementRe('data-slot', 'intro-line').test(html)) throw missing('data-slot="intro-line"');
  const wrapRe = new RegExp(elementRe('data-slot-wrap', 'intro-line').source, 'g');
  if (!wrapRe.test(html)) throw missing('data-slot-wrap="intro-line"');
  wrapRe.lastIndex = 0;
  html = html.replace(wrapRe, '');
}

const date = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam',
}).format(new Date());

fillText('first-name', esc(p.firstName || ''));
fillText('date', date);
SECTIONS.forEach((k) => fillSection(k, r[k]));

// PDF-safe: no scripts (the WebFont loader, jQuery, init.js), no lazy images (PDFShift does
// not scroll), the brand fonts embedded through a render-blocking stylesheet, print rules.
html = html
  .replace(/<script\b[\s\S]*?<\/script>/gi, '')
  .replace(/\sloading="lazy"/g, '');

const printCss = '<link rel="stylesheet" href="' + FONTS_CSS + '">'
  + '<style>'
  + '@page{size:A4;margin:12mm 0 14mm}'
  + '@page:first{margin-top:0}'
  + '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}'
  + '.report_block.is-final,.report_block.is-disclaimer,.block-conclusion{break-inside:avoid}'
  + 'h2,h2 + div{break-after:avoid}'
  + 'p{orphans:3;widows:3}'
  + 'div[data-slot] > p + p{margin-top:1rem}'
  + 'html,body{overflow-x:clip}'
  + '.report_header .report_bg-olive{top:-2px;bottom:0;left:-50vw;right:-50vw}'
  + '</style>';
if (!html.includes('</head>')) throw missing('a <head>');
html = html.replace('</head>', () => printCss + '</head>');

const reportText = SECTIONS.map((k) => r[k]).join('\n\n');

return [{ json: Object.assign({ html: html, reportText: reportText }, p) }];
