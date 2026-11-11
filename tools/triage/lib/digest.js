// Numbers a whole digest post for replies by number: numberParts() walks the main digest and its thread replies in posting order, gives each item line (one that opens with a label such as 3., B1., Q2., S4., V1. or A1.) the next number 1..N, rewrites a lettered label wherever it stands as a whole word on the same line (so "Reply go B1" follows it; a bare number in the text, like "3 open tasks", is never touched), leaves headers and plain lines alone, and returns the state items with their new n (old label kept as was) plus any item whose label had no line.
const ITEM = /^(\s*)([A-Z]?\d{1,3})([.)])(\s)/;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function numberParts(parts = []) {
  let next = 1;
  const items = [];
  const missing = [];
  const out = parts.map((part) => {
    const map = new Map();
    const lines = String(part.text ?? '').split('\n').map((line) => {
      const m = ITEM.exec(line);
      if (!m) return line;
      const n = String(next++);
      map.set(m[2], n);
      const tail = line.slice(m[0].length);
      const rest = /^\d/.test(m[2]) ? tail : tail.replace(new RegExp(`(?<![\\w])${escape(m[2])}(?![\\w])`, 'g'), n);
      return `${m[1]}${n}${m[3]}${m[4]}${rest}`;
    });
    for (const item of part.items ?? []) {
      const was = String(item.n ?? item.label ?? '');
      const n = map.get(was.toUpperCase()) ?? map.get(was);
      if (n) items.push({ ...item, n, was });
      else missing.push({ part: part.name ?? null, n: was });
    }
    return { name: part.name ?? null, text: lines.join('\n') };
  });
  return { parts: out, items, missing, count: next - 1 };
}
