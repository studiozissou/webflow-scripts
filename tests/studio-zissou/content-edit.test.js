// Unit tests for the Studio Zissou content edits, using inline markdown fixtures and a stubbed link lint only.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setMeta, setAlt, addFaq, addLink, revert } from '../../tools/studio-zissou/content-edit.js';

const TITLE = 'Website prices and care plans, no surprises | Studio Zissou';
const DESC = 'A new small business website from €1,450. Care from €95 a month with a monthly report.';

const MD = `---
slug: /pricing
collection: static
title: ${TITLE}
description: ${DESC}
h1: Prices. All of them.
status: draft
---

## hero
eyebrow: Pricing
heading: Prices. All of them.

## rich-text
### The two builds
**Essentials, €1,450 one-off.** A proven layout with your brand on it and a website care plan after.
Second line of the same paragraph.

Another paragraph about [agencies](/for-agencies).

## faq
heading: Questions about pricing

### Why is there a monthly fee at all?
Because a website that nobody checks decays.

### Can I switch plans?
Any month, up or down.

## cta-band
variant: contact
`;

const ok = () => 0;
const bad = () => 1;

function fm(text, key) {
  const m = text.match(new RegExp(`^${key}: (.*)$`, 'm'));
  return m ? m[1] : undefined;
}

function headings(text) {
  return text.split('\n').filter((l) => /^## /.test(l));
}

describe('setMeta', () => {
  test('sets a valid title and returns before and after', () => {
    const value = 'Website care plan prices, from €95 a month | Studio Zissou';
    const r = setMeta(MD, 'title', value);
    assert.equal(fm(r.text, 'title'), value);
    assert.equal(r.before, TITLE);
    assert.equal(r.after, value);
    assert.equal(fm(r.text, 'description'), DESC);
    assert.deepEqual(headings(r.text), headings(MD));
  });

  test('rejects a title outside 30 to 60 chars or without the brand', () => {
    assert.throws(() => setMeta(MD, 'title', 'Short | Studio Zissou'), /30/);
    assert.throws(() => setMeta(MD, 'title', `${'x'.repeat(50)} | Studio Zissou`), /60/);
    assert.throws(() => setMeta(MD, 'title', 'Website care plan prices from €95 a month, Studio'), /Studio Zissou/);
  });

  test('accepts title boundaries 30 and 60', () => {
    const t30 = `${'a'.repeat(17)}Studio Zissou`;
    const t60 = `${'a'.repeat(47)}Studio Zissou`;
    assert.equal(setMeta(MD, 'title', t30).after.length, 30);
    assert.equal(setMeta(MD, 'title', t60).after.length, 60);
  });

  test('description boundaries 70 and 160', () => {
    assert.equal(setMeta(MD, 'description', 'd'.repeat(70)).after.length, 70);
    assert.equal(setMeta(MD, 'description', 'd'.repeat(160)).after.length, 160);
    assert.throws(() => setMeta(MD, 'description', 'd'.repeat(69)), /70/);
    assert.throws(() => setMeta(MD, 'description', 'd'.repeat(161)), /160/);
  });

  test('refuses brackets, newlines and other fields', () => {
    assert.throws(() => setMeta(MD, 'description', `${'d'.repeat(80)} [confirm]`), /\[/);
    assert.throws(() => setMeta(MD, 'title', 'Care plans from [€95] a month | Studio Zissou'), /\[/);
    assert.throws(() => setMeta(MD, 'description', `${'d'.repeat(40)}\n${'d'.repeat(40)}`), /newline/);
    assert.throws(() => setMeta(MD, 'h1', 'Prices'), /field/);
  });

  test('throws without front matter', () => {
    assert.throws(() => setMeta('## hero\n', 'title', TITLE), /front matter/);
  });
});

describe('setAlt', () => {
  test('adds an absent alt field inside the front matter', () => {
    const r = setAlt(MD, 'heroImageAlt', 'Will at his desk in Haarlem');
    assert.equal(fm(r.text, 'heroImageAlt'), 'Will at his desk in Haarlem');
    assert.equal(r.before, '');
    const front = r.text.split('---')[1];
    assert.match(front, /heroImageAlt: Will at his desk in Haarlem/);
  });

  test('replaces an existing alt field', () => {
    const first = setAlt(MD, 'heroImageAlt', 'Old alt').text;
    const r = setAlt(first, 'heroImageAlt', 'New alt');
    assert.equal(r.before, 'Old alt');
    assert.equal(fm(r.text, 'heroImageAlt'), 'New alt');
    assert.equal((r.text.match(/heroImageAlt:/g) || []).length, 1);
  });

  test('refuses non-alt fields, empty values and brackets', () => {
    assert.throws(() => setAlt(MD, 'title', 'x'), /Alt/);
    assert.throws(() => setAlt(MD, 'heroImageAlt', ' '), /empty/);
    assert.throws(() => setAlt(MD, 'heroImageAlt', 'A [photo]'), /\[/);
  });
});

describe('addFaq', () => {
  test('appends to the faq section', () => {
    const r = addFaq(MD, 'Is there a contract?', 'Care plans are monthly.');
    const faq = r.text.slice(r.text.indexOf('## faq'), r.text.indexOf('## cta-band'));
    assert.match(faq, /### Can I switch plans\?\nAny month, up or down\.\n\n### Is there a contract\?\nCare plans are monthly\.\n\n$/);
    assert.equal(r.before, '');
    assert.equal(r.after, 'Is there a contract?\nCare plans are monthly.');
    assert.deepEqual(headings(r.text), headings(MD));
  });

  test('refuses when the page has no faq section, since one item would break the 3-6 rule', () => {
    const md = MD.slice(0, MD.indexOf('## faq')) + MD.slice(MD.indexOf('## cta-band'));
    assert.throws(() => addFaq(md, 'Is there a contract?', 'No.'), /^Error: refused: no "## faq" section/);
  });

  test('refuses a duplicate question, case-insensitive', () => {
    assert.throws(() => addFaq(MD, 'can i switch plans?', 'Yes.'), /duplicate/);
  });

  test('refuses a seventh item', () => {
    let md = MD;
    for (const q of ['Q3?', 'Q4?', 'Q5?', 'Q6?']) md = addFaq(md, q, 'A.').text;
    assert.throws(() => addFaq(md, 'Q7?', 'A.'), /6/);
  });

  test('refuses empty or bracketed text', () => {
    assert.throws(() => addFaq(MD, '', 'A.'), /empty/);
    assert.throws(() => addFaq(MD, 'Q?', 'From [€95].'), /\[/);
  });
});

describe('addLink', () => {
  const link = { section: 'rich-text', anchor: 'website care plan', href: '/services/website-care' };

  test('links the anchor text in the first paragraph when lint passes', () => {
    let seen;
    const r = addLink(MD, link, { lint: (t) => { seen = t; return 0; } });
    assert.ok(r.text.includes('and a [website care plan](/services/website-care) after.'));
    assert.equal(seen, r.text);
    assert.ok(r.before.startsWith('**Essentials'));
    assert.ok(r.before.endsWith('Second line of the same paragraph.'));
    assert.ok(r.after.includes('[website care plan](/services/website-care)'));
    assert.deepEqual(headings(r.text), headings(MD));
  });

  test('refuses when lint returns non-zero and returns nothing changed', () => {
    assert.throws(() => addLink(MD, link, { lint: bad }), /refused: link-lint exited 1/);
  });

  test('refuses without a lint function', () => {
    assert.throws(() => addLink(MD, link, {}), /lint/);
  });

  test('refuses an unknown section, missing anchor, external or hash href', () => {
    assert.throws(() => addLink(MD, { ...link, section: 'nope' }, { lint: ok }), /section/);
    assert.throws(() => addLink(MD, { ...link, anchor: 'not here' }, { lint: ok }), /anchor/);
    assert.throws(() => addLink(MD, { ...link, href: 'https://x.com' }, { lint: ok }), /href/);
    assert.throws(() => addLink(MD, { ...link, href: '#' }, { lint: ok }), /href/);
  });

  test('skips key: value lines and finds prose in a later section paragraph', () => {
    const md = MD.replace('## hero\neyebrow: Pricing\nheading: Prices. All of them.\n', '## hero\neyebrow: Pricing\n\nPrices for every website care plan.\n');
    const r = addLink(md, { ...link, section: 'hero' }, { lint: ok });
    assert.ok(r.text.includes('Prices for every [website care plan](/services/website-care).'));
    assert.ok(r.text.includes('eyebrow: Pricing'));
  });

  test('does not wrap text already inside a link', () => {
    const md = MD.replace('A proven layout with your brand on it and a website care plan after.', 'See [website care plan](/x).');
    assert.throws(() => addLink(md, link, { lint: ok }), /anchor/);
  });
});

describe('revert', () => {
  test('meta-title and meta-description restore before', () => {
    const value = 'Website care plan prices, from €95 a month | Studio Zissou';
    const edit = setMeta(MD, 'title', value);
    const r = revert(edit.text, { type: 'meta-title', before: edit.before, after: edit.after });
    assert.equal(r.text, MD);
    const d = setMeta(MD, 'description', 'd'.repeat(90));
    assert.equal(revert(d.text, { type: 'meta-description', before: d.before, after: d.after }).text, MD);
  });

  test('restores an out-of-range before value without validating it', () => {
    const md = MD.replace(`description: ${DESC}`, 'description: too short');
    const d = setMeta(md, 'description', 'd'.repeat(90));
    assert.equal(revert(d.text, { type: 'meta-description', ...d }).text, md);
  });

  test('refuses when the live value no longer matches after', () => {
    assert.throws(() => revert(MD, { type: 'meta-title', before: 'x', after: 'something else' }), /no longer/);
  });

  test('alt revert removes an added field and restores a replaced one', () => {
    const added = setAlt(MD, 'heroImageAlt', 'New alt');
    assert.equal(revert(added.text, { type: 'alt', field: 'heroImageAlt', ...added }).text, MD);
    const base = setAlt(MD, 'heroImageAlt', 'Old alt').text;
    const changed = setAlt(base, 'heroImageAlt', 'New alt');
    assert.equal(revert(changed.text, { type: 'alt', before: changed.before, after: changed.after }).text, base);
  });

  test('faq revert removes only the added item', () => {
    const r = addFaq(MD, 'Is there a contract?', 'No.');
    assert.equal(revert(r.text, { type: 'faq', ...r }).text, MD);
  });

  test('faq revert of a middle item keeps its neighbours', () => {
    const one = addFaq(MD, 'Is there a contract?', 'No.');
    const two = addFaq(one.text, 'Do you charge for the call?', 'No.').text;
    const back = revert(two, { type: 'faq', ...one }).text;
    assert.equal(back, addFaq(MD, 'Do you charge for the call?', 'No.').text);
  });

  test('faq revert keeps the section heading when it held only the added item', () => {
    const md = `${MD.slice(0, MD.indexOf('## faq'))}## faq\n\n### Is there a contract?\nNo.\n\n${MD.slice(MD.indexOf('## cta-band'))}`;
    const back = revert(md, { type: 'faq', before: '', after: 'Is there a contract?\nNo.' }).text;
    assert.ok(back.includes('## faq'));
    assert.ok(!back.includes('Is there a contract?'));
  });

  test('internal-link revert restores the paragraph', () => {
    const r = addLink(MD, { section: 'rich-text', anchor: 'website care plan', href: '/services/website-care' }, { lint: ok });
    assert.equal(revert(r.text, { type: 'internal-link', ...r }).text, MD);
  });

  test('unknown type throws', () => {
    assert.throws(() => revert(MD, { type: 'h1', before: 'a', after: 'b' }), /type/);
  });
});
