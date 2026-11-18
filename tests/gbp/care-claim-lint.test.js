// Tests for the health-claim, banned-term and privacy checks on drafted reply and post text.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  HEALTH_TERMS,
  PRIVACY_TERMS,
  claimLint,
  draftTextProblems,
  privacyLint,
} from '../../tools/gbp/care/claim-lint.js';

const ORDINARY = [
  'Thanks for the kind words, see you soon',
  'Dank je wel, tot snel',
  'Thanks for your visit, we hope to welcome you again.',
  'Fijn dat je langs kwam. Tot de volgende keer!',
  'We are glad you enjoyed the bread and the health of our sourdough starter.',
];

describe('claimLint health terms', () => {
  const blocked = [
    'This will cure your stress',
    'It cures tension',
    'I was cured',
    'Time to heal',
    'Bodywork heals',
    'A healing touch',
    'You healed fast',
    'We treat your back',
    'She treats pain',
    'We love treating people',
    'Pain relief in one hour',
    'It will relieve stress',
    'Voor verlichting van stress',
    'Bodywork helps with stress',
    'It helps against tension',
    'Dit helpt bij spanning',
    'Massage helpt tegen stress',
    'Improve your posture',
    'Verbeter je houding',
    'Snel herstel',
    'A deep tension release',
    'I was treated well',
    'A full treatment',
    'We diagnose posture',
    'No diagnosis needed',
    'Wij genezen spanning',
    'Dit geneest alles',
    'Snelle genezing',
    'Wij behandelen klachten',
    'Zij behandelt je rug',
    'Een fijne behandeling',
    'Een diagnose stellen',
    'Wij diagnosticeren niets',
    'Go home pain-free',
    'Pain free in a week',
    'Eindelijk pijnvrij',
    'This fixes your posture',
    'It repairs your shoulder',
  ];
  for (const text of blocked) {
    it(`blocks "${text}" for health`, () => {
      const result = claimLint(text, { sector: 'health', bannedTerms: [] });
      assert.equal(result.ok, false);
      assert.equal(result.problems.length > 0, true);
    });
  }

  for (const text of ['What a treat to read this', 'A real treat, thank you', 'Treats for everyone']) {
    it(`passes the ordinary "${text}" for health`, () => {
      assert.deepEqual(claimLint(text, { sector: 'health' }), { ok: true, problems: [] });
    });
  }

  it('leaves health terms alone outside the health sector', () => {
    assert.deepEqual(
      claimLint('Treat yourself to a croissant', { sector: 'restaurant' }),
      { ok: true, problems: [] },
    );
  });

  it('exports regexes that are case-insensitive', () => {
    assert.ok(HEALTH_TERMS.length > 0);
    for (const term of HEALTH_TERMS) {
      assert.ok(term instanceof RegExp);
      assert.ok(term.flags.includes('i'));
    }
    assert.equal(claimLint('CURES', { sector: 'health' }).ok, false);
  });

  it('matches whole words only', () => {
    assert.equal(
      claimLint('A treaty and a secure place, healthy food', { sector: 'health' }).ok,
      true,
    );
  });
});

describe('claimLint banned terms', () => {
  it('blocks a banned term in any sector, ignoring case, accents and spacing', () => {
    const result = claimLint('Simply the  BEST in town', {
      sector: 'restaurant',
      bannedTerms: ['best in town'],
    });
    assert.equal(result.ok, false);
    assert.match(result.problems[0], /best in town/);
    assert.equal(
      claimLint('Een café om te zien', { sector: 'restaurant', bannedTerms: ['Cafe om'] })
        .ok,
      false,
    );
  });
  it('passes text with no banned term', () => {
    assert.deepEqual(
      claimLint('Fresh bread', { sector: 'restaurant', bannedTerms: ['best in town'] }),
      { ok: true, problems: [] },
    );
  });
  it('ignores empty banned terms and missing options', () => {
    assert.equal(claimLint('Fresh bread', { bannedTerms: [''] }).ok, true);
    assert.equal(claimLint('Fresh bread').ok, true);
  });
});

describe('privacyLint', () => {
  const blocked = [
    'Thanks for your session',
    'Glad your first session went well',
    'Fijn dat je sessie goed was',
    'Bedankt voor jouw sessie',
    'Hope your treatment helped',
    'Succes met je behandeling',
    'Enjoy your therapy',
    'Veel succes met je therapie',
    'Thanks for being a client',
    'Als cliënt ben je welkom',
    'Onze client was blij',
    'A lovely patient',
    'Elke patiënt telt',
    'Thanks, as my client you know',
    'Hope your back feels better',
    'Good luck with your shoulder',
    'Less of your pain',
    'Minder last van je rugpijn',
    'Hoe gaat het met je rug',
    'Your neck looks relaxed',
    'See you at your next appointment',
    'Tot je volgende afspraak',
  ];
  for (const text of blocked) {
    it(`blocks "${text}"`, () => {
      const result = privacyLint(text);
      assert.equal(result.ok, false);
      assert.ok(result.problems.length > 0);
    });
  }

  it('exports case-insensitive regexes', () => {
    assert.ok(PRIVACY_TERMS.length > 0);
    for (const term of PRIVACY_TERMS) assert.ok(term.flags.includes('i'));
  });

  for (const text of [
    'Thanks for your visit',
    'Fijn, je bezoek was kort',
    'Dank voor jouw bezoek',
    'Thanks for coming in',
    'Bedankt voor je komst',
    'Goed dat je klacht minder is',
    'Over jouw klacht',
    'A calm session',
    'Een rustige sessie',
  ]) {
    it(`blocks visit wording "${text}" for health`, () => {
      assert.equal(privacyLint(text, { sector: 'health' }).ok, false);
    });
  }

  for (const text of [
    'Thanks for your visit, see you soon!',
    'Bedankt voor je bezoek en tot snel',
    'So glad you loved the sourdough and the apple pie',
    'Fijn dat de appeltaart je smaakte',
  ]) {
    it(`passes "${text}" for a restaurant`, () => {
      assert.deepEqual(privacyLint(text, { sector: 'restaurant' }), { ok: true, problems: [] });
    });
  }

  it('treats missing text as clean', () => {
    assert.deepEqual(privacyLint(undefined), { ok: true, problems: [] });
  });
});

describe('ordinary hospitality text', () => {
  for (const text of ORDINARY) {
    it(`passes "${text}"`, () => {
      assert.deepEqual(
        claimLint(text, { sector: 'health', bannedTerms: ['best in town'] }),
        { ok: true, problems: [] },
      );
      assert.deepEqual(privacyLint(text), { ok: true, problems: [] });
    });
  }
});

describe('draftTextProblems', () => {
  const health = { sector: 'health', bannedTerms: ['goedkoop'] };
  const bakery = { sector: 'bakery', bannedTerms: ['goedkoop'] };

  it('flags contact details in replies and posts', () => {
    for (const type of ['reply', 'post']) {
      assert.match(draftTextProblems(type, 'Call 020 123 4567', bakery).join(' '), /phone number/);
    }
  });

  it('runs the privacy check on replies only, with the sector', () => {
    assert.match(draftTextProblems('reply', 'Thanks for your visit', health).join(' '), /privacy/);
    assert.deepEqual(draftTextProblems('reply', 'Thanks for your visit', bakery), []);
    assert.deepEqual(draftTextProblems('post', 'Our clients love the new room', bakery), []);
    assert.match(draftTextProblems('reply', 'Our clients love it', bakery).join(' '), /privacy/);
  });

  it('runs the claim check with the sector and banned terms', () => {
    assert.match(draftTextProblems('post', 'Pain relief for all', health).join(' '), /health claim/);
    assert.deepEqual(draftTextProblems('post', 'Pain relief for all', bakery), []);
    assert.match(draftTextProblems('post', 'Niet goedkoop', bakery).join(' '), /banned term/);
  });

  it('flags empty text', () => {
    assert.deepEqual(draftTextProblems('reply', '  ', bakery), ['draft text is empty']);
    assert.deepEqual(draftTextProblems('post', undefined, bakery), ['draft text is empty']);
  });

  it('passes clean text', () => {
    assert.deepEqual(draftTextProblems('reply', 'Dank je wel, tot snel!', health), []);
  });
});
