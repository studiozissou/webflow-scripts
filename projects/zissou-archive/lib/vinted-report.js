// Renders the standalone Vinted flags page with keyboard Buy / Maybe / Junk marking.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

function safeUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : '#';
}

function money(value, currency = 'EUR') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return `${currency === 'EUR' ? '€' : `${currency} `}${value.toFixed(2)}`;
}

function ratio(flag) {
  return flag.cap > 0 && typeof flag.price === 'number' ? flag.price / flag.cap : Number.POSITIVE_INFINITY;
}

function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replaceAll(String.fromCharCode(0x2028), '\\u2028')
    .replaceAll(String.fromCharCode(0x2029), '\\u2029');
}

function card(flag, index) {
  const meta = [flag.brand, flag.size, flag.condition].filter(Boolean).map(esc).join(' · ');
  const thumb = flag.thumbnail
    ? `<img src="${esc(safeUrl(flag.thumbnail))}" alt="" width="96" height="128" loading="lazy">`
    : '<div class="noimg" aria-hidden="true"></div>';
  return `<li><article class="card" tabindex="0" data-index="${index}" aria-label="${esc(flag.title)}">
${thumb}
<div class="body">
<h2>${esc(flag.title)}</h2>
<p class="price">${esc(money(flag.totalPrice ?? flag.price, flag.currency))} <span class="muted">incl. fee</span> · ❤ ${esc(flag.favourites ?? 0)}</p>
<p>${meta}</p>
<p class="why">${esc(flag.reason)} <span class="muted">(${esc(flag.queryId)})</span></p>
<p><a href="${esc(safeUrl(flag.url))}" target="_blank" rel="noopener noreferrer">Open on Vinted</a> <span class="mark" data-mark></span></p>
</div>
</article></li>`;
}

const STYLE = `body{font:16px/1.5 system-ui,sans-serif;margin:0 auto;max-width:48rem;padding:1.5rem;color:#111;background:#fafafa}
h1{font-size:1.5rem;margin:0}ol{list-style:none;padding:0;display:grid;gap:1rem}
.card{display:flex;gap:1rem;padding:1rem;background:#fff;border:1px solid #ccc;border-radius:.5rem}
.card:focus{outline:3px solid #1a4fd6;outline-offset:2px}.card[data-verdict=buy]{border-color:#137333;background:#eef8f0}
.card[data-verdict=maybe]{border-color:#b06000;background:#fff6e5}.card[data-verdict=junk]{opacity:.55}
.card img,.noimg{flex:none;width:6rem;height:8rem;object-fit:cover;background:#ddd;border-radius:.25rem}
.card h2{font-size:1rem;margin:0;white-space:pre-line}.card p{margin:.25rem 0}.price{font-weight:700}
.muted{color:#555;font-weight:400}.mark{font-weight:700}.health{background:#fde8e8;border:1px solid #b3261e;padding:.75rem 1rem;border-radius:.5rem}
kbd{border:1px solid #999;border-radius:.25rem;padding:0 .3rem;font-size:.875rem}`;

const SCRIPT = `(()=>{const flags=JSON.parse(document.getElementById('flags-data').textContent);
const verdictUrl=JSON.parse(document.getElementById('verdict-url').textContent);
const live=document.getElementById('live');const cards=[...document.querySelectorAll('.card')];
const names={b:'buy',m:'maybe',j:'junk'};const labels={buy:'Buy',maybe:'Maybe',junk:'Junk'};
function say(t){live.textContent='';setTimeout(()=>{live.textContent=t},30)}
async function mark(card,verdict){const f=flags[Number(card.dataset.index)];card.dataset.verdict=verdict;
card.querySelector('[data-mark]').textContent=labels[verdict];
if(!verdictUrl){say(labels[verdict]+' (not saved: no server): '+f.title);return}
try{const r=await fetch(verdictUrl,{method:'POST',headers:{'content-type':'application/json'},
body:JSON.stringify({id:f.id,verdict,title:f.title,url:f.url,price:f.price,queryId:f.queryId})});
if(!r.ok)throw new Error(r.status);say('Marked '+labels[verdict]+': '+f.title)}
catch(e){say('Could not save '+labels[verdict]+' for '+f.title)}}
document.addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;
const card=document.activeElement&&document.activeElement.closest('.card');const i=cards.indexOf(card);
if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(!cards.length)return;e.preventDefault();
const n=i===-1?0:Math.min(cards.length-1,Math.max(0,i+(e.key==='ArrowDown'?1:-1)));cards[n].focus();return}
const v=names[e.key.toLowerCase()];if(v&&card){e.preventDefault();mark(card,v)}});
if(cards[0])cards[0].focus()})();`;

export function renderReport({ flags = [], health = [], runAt = '', verdictUrl = null } = {}) {
  const sorted = [...flags].sort((a, b) => ratio(a) - ratio(b));
  const data = sorted.map(({ id, title, url, price, queryId }) => ({ id, title, url, price, queryId }));
  const banner = health.length
    ? `<div class="health" role="alert"><strong>Health warning</strong><ul>${health.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>`
    : '';
  const list = sorted.length
    ? `<ol>${sorted.map(card).join('\n')}</ol>`
    : '<p>No new flags this run.</p>';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vinted flags (${sorted.length})</title>
<style>${STYLE}</style>
</head>
<body>
<header>
<h1>Vinted flags: ${sorted.length} new</h1>
<p class="muted">Run ${esc(runAt)}. <kbd>↑</kbd>/<kbd>↓</kbd> or <kbd>Tab</kbd> to move, <kbd>B</kbd> Buy, <kbd>M</kbd> Maybe, <kbd>J</kbd> Junk.</p>
</header>
${banner}
<main>
${list}
</main>
<div id="live" class="muted" aria-live="polite" role="status"></div>
<script type="application/json" id="flags-data">${jsonForScript(data)}</script>
<script type="application/json" id="verdict-url">${jsonForScript(verdictUrl ?? null)}</script>
<script>${SCRIPT}</script>
</body>
</html>
`;
}
