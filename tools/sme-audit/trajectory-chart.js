// Draws the /sme-audit traffic trajectory chart (measured monthly visits, then do-nothing and every-fix projection bands) as SVG, optionally rendered to PNG with headless Chrome; runnable as a CLI.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 960;
const H = 540;
const PAD = { left: 70, right: 190, top: 70, bottom: 70 };
const COLORS = { doNothing: '#2a78d6', everyFix: '#eb6834', ink: '#1f1f1e', muted: '#6b6a63', grid: '#e6e5e0', surface: '#fcfcfb' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HORIZON = 12;

const niceStep = (max) => {
  const raw = max / 5;
  const power = 10 ** Math.floor(Math.log10(raw));
  const factor = [1, 2, 2.5, 5, 10].find((f) => f * power >= raw);
  return factor * power;
};

const addMonths = (month, n) => {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

const validate = ({ history, doNothing, everyFix }) => {
  if (!Array.isArray(history) || history.length < 2) throw new Error('history needs at least two months of { month, visits }');
  for (const [name, series] of [['doNothing', doNothing], ['everyFix', everyFix]]) {
    if (!Array.isArray(series) || series.length === 0) throw new Error(`${name} needs at least one { after, low, high } point`);
    for (const p of series) {
      if (!(p.after > 0 && p.after <= HORIZON && p.low <= p.high)) throw new Error(`${name} point is invalid: ${JSON.stringify(p)}`);
    }
  }
};

export function buildTrajectoryChart(data) {
  validate(data);
  const { history, doNothing, everyFix } = data;
  const title = data.title ?? 'Monthly site visits from Google: do nothing vs every fix';
  const subtitle = data.subtitle ?? `Last ${history.length} months measured (Semrush estimate). Next ${HORIZON} months projected as ranges.`;
  const nowIndex = history.length - 1;
  const span = nowIndex + HORIZON;
  const top = Math.max(...history.map((h) => h.visits), ...everyFix.map((p) => p.high), ...doNothing.map((p) => p.high));
  const step = niceStep(top);
  const axisMax = Math.ceil(top / step) * step;
  const yMax = axisMax * 1.04;
  const x = (i) => PAD.left + ((W - PAD.left - PAD.right) * i) / span;
  const y = (v) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / yMax);
  const f = (n) => n.toFixed(1);
  const now = history[nowIndex].visits;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system,Helvetica,Arial,sans-serif">`,
    `<rect width="${W}" height="${H}" fill="${COLORS.surface}"/>`,
    `<text x="${PAD.left}" y="32" font-size="20" font-weight="600" fill="${COLORS.ink}">${title}</text>`,
    `<text x="${PAD.left}" y="54" font-size="13" fill="${COLORS.muted}">${subtitle}</text>`,
  ];

  for (let v = 0; v <= axisMax; v += step) {
    out.push(`<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${f(y(v))}" y2="${f(y(v))}" stroke="${COLORS.grid}" stroke-width="1"/>`);
    out.push(`<text x="${PAD.left - 10}" y="${f(y(v) + 4)}" font-size="12" fill="${COLORS.muted}" text-anchor="end">${v}</text>`);
  }

  for (let i = 0; i <= span; i += 1) {
    const { year, month } = addMonths(history[0].month, i);
    if (i !== 0 && (month - 1) % 3 !== (addMonths(history[0].month, 0).month - 1) % 3) continue;
    const withYear = i === 0 || month === 1 || i === nowIndex || i === span;
    const label = `${MONTHS[month - 1]}${withYear ? ` ${String(year).slice(2)}` : ''}`;
    out.push(`<text x="${f(x(i))}" y="${H - PAD.bottom + 22}" font-size="12" fill="${COLORS.muted}" text-anchor="middle">${label}</text>`);
  }

  out.push(`<line x1="${f(x(nowIndex))}" x2="${f(x(nowIndex))}" y1="${PAD.top}" y2="${H - PAD.bottom}" stroke="${COLORS.muted}" stroke-width="1" stroke-dasharray="3 4"/>`);
  out.push(`<text x="${f(x(nowIndex) + 6)}" y="${PAD.top + 12}" font-size="12" fill="${COLORS.muted}">Today</text>`);

  const band = (series, color) => {
    const pts = [{ after: 0, low: now, high: now }, ...series].map((p) => ({ i: nowIndex + p.after, low: p.low, high: p.high, mid: (p.low + p.high) / 2 }));
    const upper = pts.map((p) => `${f(x(p.i))},${f(y(p.high))}`).join(' ');
    const lower = [...pts].reverse().map((p) => `${f(x(p.i))},${f(y(p.low))}`).join(' ');
    out.push(`<polygon points="${upper} ${lower}" fill="${color}" fill-opacity="0.14"/>`);
    out.push(`<polyline points="${pts.map((p) => `${f(x(p.i))},${f(y(p.mid))}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="6 4"/>`);
    for (const p of pts.slice(1)) out.push(`<circle cx="${f(x(p.i))}" cy="${f(y(p.mid))}" r="4.5" fill="${color}" stroke="${COLORS.surface}" stroke-width="2"/>`);
    return pts[pts.length - 1];
  };
  const lastDn = band(doNothing, COLORS.doNothing);
  const lastFx = band(everyFix, COLORS.everyFix);

  out.push(`<polyline points="${history.map((h, i) => `${f(x(i))},${f(y(h.visits))}`).join(' ')}" fill="none" stroke="${COLORS.ink}" stroke-width="2"/>`);
  for (const [i, h] of history.entries()) out.push(`<circle cx="${f(x(i))}" cy="${f(y(h.visits))}" r="4" fill="${COLORS.ink}" stroke="${COLORS.surface}" stroke-width="2"/>`);

  let fxY = y(lastFx.mid);
  let dnY = y(lastDn.mid);
  if (dnY - fxY < 40) [fxY, dnY] = [Math.min(fxY, (fxY + dnY) / 2 - 20), Math.max(dnY, (fxY + dnY) / 2 + 20)];
  const endX = f(x(span) + 10);
  out.push(`<text x="${endX}" y="${f(fxY)}" font-size="13" font-weight="600" fill="${COLORS.ink}">Every fix</text>`);
  out.push(`<text x="${endX}" y="${f(fxY + 16)}" font-size="12" fill="${COLORS.muted}">${lastFx.low}–${lastFx.high} a month</text>`);
  out.push(`<text x="${endX}" y="${f(dnY)}" font-size="13" font-weight="600" fill="${COLORS.ink}">Do nothing</text>`);
  out.push(`<text x="${endX}" y="${f(dnY + 16)}" font-size="12" fill="${COLORS.muted}">${lastDn.low}–${lastDn.high} a month</text>`);

  const visits = history.map((h) => h.visits);
  const minIndex = visits.indexOf(Math.min(...visits));
  const average = Math.round(visits.reduce((a, b) => a + b, 0) / visits.length);
  out.push(`<text x="${f(x(Math.max(minIndex - 3, 1)))}" y="${f(Math.min(y(visits[minIndex]) + 22, H - PAD.bottom - 6))}" font-size="12" fill="${COLORS.muted}">Measured: ${Math.min(...visits)}–${Math.max(...visits)}, average ${average}</text>`);

  let legendX = PAD.left;
  for (const [color, label, dash] of [[COLORS.ink, 'Measured', 'none'], [COLORS.doNothing, 'Do nothing (projected range)', '6 4'], [COLORS.everyFix, 'Every fix (projected range)', '6 4']]) {
    out.push(`<line x1="${legendX}" x2="${legendX + 24}" y1="${H - 22}" y2="${H - 22}" stroke="${color}" stroke-width="2" stroke-dasharray="${dash}"/>`);
    out.push(`<text x="${legendX + 30}" y="${H - 18}" font-size="12" fill="${COLORS.ink}">${label}</text>`);
    legendX += 30 + label.length * 6.6 + 24;
  }

  out.push('</svg>');
  return out.join('\n');
}

export function renderPng(svg, pngPath) {
  const dir = mkdtempSync(join(tmpdir(), 'trajectory-'));
  const html = join(dir, 'chart.html');
  writeFileSync(html, `<html><body style="margin:0">${svg}</body></html>`);
  const result = spawnSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', `--window-size=${W},${H}`, `--screenshot=${pngPath}`, `file://${html}`], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Chrome render failed: ${result.stderr || result.error}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, svgPath, flag] = process.argv.slice(2);
  if (!input || !svgPath) {
    process.stderr.write('Usage: node tools/sme-audit/trajectory-chart.js <input.json> <out.svg> [--png]\n');
    process.exit(1);
  }
  const svg = buildTrajectoryChart(JSON.parse(readFileSync(input, 'utf8')));
  writeFileSync(svgPath, svg);
  if (flag === '--png') renderPng(svg, svgPath.replace(/\.svg$/, '.png'));
  process.stdout.write(`Wrote ${svgPath}${flag === '--png' ? ' and .png' : ''}\n`);
}
