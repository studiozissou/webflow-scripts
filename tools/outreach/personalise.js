// Collects business-specific facts with source URLs (seed love note, site heuristics, GBP topics and review snippets) and picks the seed or lookalike opener.
import { pageText } from './text.js';

const YEAR = /\b(?:sinds|since|opgericht|founded|established|est\.)[^.!?]{0,30}?\b(19\d{2}|20\d{2})\b/iu;
const OWNER = /\b(?:eigenaar|eigenaresse|owner|chef|opgericht door|founded by|run by)\s*:?\s+(\p{L}[\p{L}-]+)/giu;
const SIGNATURE = /\b(?:bekend om|beroemd om|famous for|known for|onze specialiteit is|our speciality is|our specialty is)\s+(?:(?:onze|ons|de|het|our|the)\s+)?([^.,!?;:]{3,40}?)(?=[.,!?;:]|$)/iu;

const isCapitalised = (word) => word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase();

export function siteFacts(html, url) {
  const text = pageText(html);
  if (!text) return [];
  const facts = [];
  const owner = [...text.matchAll(OWNER)].map((m) => m[1]).find(isCapitalised);
  if (owner) facts.push({ kind: 'owner', value: owner, source: url });
  const year = text.match(YEAR);
  if (year) facts.push({ kind: 'founded', value: year[1], source: url });
  const signature = text.match(SIGNATURE);
  if (signature) facts.push({ kind: 'signature', value: signature[1].trim(), source: url });
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const title = pageText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const phrase = h1 ? pageText(h1[1]) : '';
  const words = phrase.split(' ').filter(Boolean).length;
  if (words >= 3 && words <= 12 && phrase.toLowerCase() !== title.toLowerCase()) facts.push({ kind: 'phrase', value: phrase, source: url });
  return facts;
}

export function gbpFacts(info, reviews) {
  const source = info?.check_url ?? null;
  const topics = Object.entries(info?.place_topics ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => ({ kind: 'review-theme', value: topic, source }));
  const snippets = (reviews ?? [])
    .map((r) => (r?.review_text ?? '').trim().split(/(?<=[.!?])\s+/)[0])
    .filter((s) => s && s.length <= 120)
    .slice(0, 2)
    .map((s) => ({ kind: 'review', value: s, source }));
  return [...topics, ...snippets];
}

export function personalise({ row, pages = [], info = null, reviews = null }) {
  const opener = row.source === 'seed' ? 'seed' : 'lookalike';
  const all = [];
  if (opener === 'seed' && row.love?.trim()) all.push({ kind: 'love', value: row.love.trim(), source: 'seeds.json' });
  for (const page of pages) all.push(...siteFacts(page.html ?? '', page.url));
  all.push(...gbpFacts(info, reviews));
  const seen = new Set();
  const facts = all.filter((f) => {
    const key = `${f.kind}:${f.value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    facts,
    opener,
    ownerName: facts.find((f) => f.kind === 'owner')?.value ?? null,
    draftKind: facts.length ? 'personal' : 'generic',
  };
}
