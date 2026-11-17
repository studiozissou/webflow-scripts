// Tests for loading and validating the private care config and for the hours mapping to and from Google.
import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  configPath,
  fromGoogleRegularHours,
  fromGoogleSpecialPeriods,
  listConfiguredSlugs,
  loadCareConfig,
  toGoogleRegularHours,
  toGoogleSpecialPeriods,
  validateCareConfig,
} from '../../tools/gbp/care/config.js';

const minimal = () => ({
  location: 'locations/222',
  languages: ['nl', 'en'],
  sector: 'restaurant',
});

const full = () => ({
  ...minimal(),
  voice: 'projects/fixture/.claude/reports/voice.md',
  bannedTerms: ['best in town'],
  ctaUrls: ['https://example.com/menu'],
  postThemes: ['bread', 'coffee'],
  hours: {
    regular: [{ day: 'MONDAY', open: '09:00', close: '17:00' }],
    special: [
      { date: '2026-12-31', closed: true, confirm: false },
      { date: '2026-12-24', open: '09:00', close: '15:30' },
    ],
  },
  posting: 'off',
  standing: [{ type: 'reply', stars: 'FIVE' }],
  consent: {
    by: 'Example Owner',
    date: '2026-11-16',
    scope: ['replies', 'posts', 'hours'],
  },
});

describe('validateCareConfig', () => {
  it('fills defaults for a minimal config', () => {
    assert.deepEqual(validateCareConfig(minimal()), {
      location: 'locations/222',
      languages: ['nl', 'en'],
      sector: 'restaurant',
      voice: null,
      bannedTerms: [],
      ctaUrls: [],
      postThemes: [],
      hours: { regular: [], special: [] },
      posting: 'on',
      standing: [],
      consent: null,
    });
  });

  it('keeps a full config and normalises special-hours confirm', () => {
    const config = validateCareConfig(full());
    assert.equal(config.posting, 'off');
    assert.equal(config.voice, 'projects/fixture/.claude/reports/voice.md');
    assert.deepEqual(config.consent, full().consent);
    assert.deepEqual(config.hours.special, [
      { date: '2026-12-31', closed: true, confirm: false },
      { date: '2026-12-24', open: '09:00', close: '15:30', confirm: true },
    ]);
  });

  it('always ignores standing approvals', () => {
    assert.deepEqual(validateCareConfig(full()).standing, []);
  });

  it('treats missing consent as null, not an error', () => {
    assert.equal(validateCareConfig(minimal()).consent, null);
  });

  it('lists every problem in one error', () => {
    const raw = {
      location: '222',
      languages: [],
      sector: '',
      bannedTerms: 'x',
      ctaUrls: ['http://example.com'],
      posting: 'maybe',
    };
    assert.throws(
      () => validateCareConfig(raw),
      (err) => {
        for (const word of [
          'location',
          'languages',
          'sector',
          'bannedTerms',
          'ctaUrls',
          'posting',
        ]) {
          assert.match(err.message, new RegExp(word), word);
        }
        return true;
      },
    );
  });

  it('rejects a config that is not an object', () => {
    assert.throws(() => validateCareConfig(null), /object/);
    assert.throws(() => validateCareConfig([]), /object/);
  });

  it('rejects bad language codes', () => {
    assert.throws(
      () => validateCareConfig({ ...minimal(), languages: ['nld'] }),
      /languages/,
    );
  });

  for (const [label, consent] of [
    ['empty by', { by: '', date: '2026-11-16', scope: ['replies'] }],
    ['bad date', { by: 'X', date: '2026-02-30', scope: ['replies'] }],
    ['unknown scope', { by: 'X', date: '2026-11-16', scope: ['photos'] }],
    ['scope not an array', { by: 'X', date: '2026-11-16', scope: 'replies' }],
  ]) {
    it(`rejects consent with ${label}`, () => {
      assert.throws(() => validateCareConfig({ ...minimal(), consent }), /consent/);
    });
  }

  const withHours = (hours) => ({ ...minimal(), hours });

  for (const [label, entry] of [
    ['an unknown day', { day: 'FUNDAY', open: '09:00', close: '17:00' }],
    ['a bad time', { day: 'MONDAY', open: '9am', close: '17:00' }],
    ['minutes out of range', { day: 'MONDAY', open: '09:60', close: '17:00' }],
    ['a reversed period', { day: 'MONDAY', open: '21:00', close: '17:00' }],
    ['an empty period', { day: 'MONDAY', open: '09:00', close: '09:00' }],
  ]) {
    it(`rejects regular hours with ${label}`, () => {
      assert.throws(() => validateCareConfig(withHours({ regular: [entry] })), /regular/);
    });
  }

  it('accepts a period that closes at midnight', () => {
    const config = validateCareConfig(
      withHours({ regular: [{ day: 'FRIDAY', open: '18:00', close: '24:00' }] }),
    );
    assert.equal(config.hours.regular[0].close, '24:00');
  });

  for (const [label, special] of [
    [
      'closed and times',
      [{ date: '2026-12-31', closed: true, open: '09:00', close: '12:00' }],
    ],
    ['neither closed nor times', [{ date: '2026-12-31' }]],
    ['closed false', [{ date: '2026-12-31', closed: false }]],
    ['a reversed period', [{ date: '2026-12-31', open: '21:00', close: '17:00' }]],
    ['an impossible date', [{ date: '2026-02-30', closed: true }]],
    ['a non-boolean confirm', [{ date: '2026-12-31', closed: true, confirm: 'no' }]],
    [
      'a duplicate date',
      [
        { date: '2026-12-31', closed: true },
        { date: '2026-12-31', open: '09:00', close: '12:00' },
      ],
    ],
  ]) {
    it(`rejects special hours with ${label}`, () => {
      assert.throws(() => validateCareConfig(withHours({ special })), /special/);
    });
  }

  it('rejects hours that are not an object of arrays', () => {
    assert.throws(() => validateCareConfig(withHours({ regular: 'x' })), /hours/);
  });
});

describe('config files', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'gbp-care-config-'));
    for (const slug of ['fixture', 'example-studio', 'no-config']) {
      mkdirSync(join(root, 'projects', slug, '.claude', 'care'), { recursive: true });
    }
    writeFileSync(
      join(root, 'projects', 'fixture', '.claude/care/gbp.json'),
      JSON.stringify(full()),
    );
    writeFileSync(
      join(root, 'projects', 'example-studio', '.claude/care/gbp.json'),
      JSON.stringify({ ...minimal(), sector: 'health' }),
    );
    mkdirSync(join(root, 'projects', 'Bad Name', '.claude', 'care'), { recursive: true });
    writeFileSync(join(root, 'projects', 'Bad Name', '.claude/care/gbp.json'), '{}');
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  it('builds the config path from the slug', () => {
    assert.equal(
      configPath('fixture', { root: '/repo' }),
      '/repo/projects/fixture/.claude/care/gbp.json',
    );
  });

  for (const slug of ['../x', 'Fixture', 'a/b', '', undefined]) {
    it(`refuses the slug ${JSON.stringify(slug)}`, () => {
      assert.throws(() => configPath(slug, { root: '/repo' }), /slug/i);
    });
  }

  it('lists only slugs that have a config, sorted', () => {
    assert.deepEqual(listConfiguredSlugs({ root }), ['example-studio', 'fixture']);
  });

  it('loads and validates a config by slug', () => {
    const config = loadCareConfig('example-studio', { root });
    assert.equal(config.sector, 'health');
    assert.deepEqual(config.standing, []);
  });

  it('loads from an explicit path', () => {
    const path = join(root, 'projects', 'fixture', '.claude/care/gbp.json');
    assert.equal(loadCareConfig('fixture', { path }).posting, 'off');
  });

  it('throws with the path when the file is missing or not JSON', () => {
    assert.throws(() => loadCareConfig('no-config', { root }), /no-config/);
    const bad = join(root, 'bad.json');
    writeFileSync(bad, '{not json');
    assert.throws(() => loadCareConfig('fixture', { path: bad }), /bad\.json/);
  });

  it('throws when the loaded config is invalid', () => {
    const bad = join(root, 'invalid.json');
    writeFileSync(bad, JSON.stringify({ ...minimal(), posting: 'maybe' }));
    assert.throws(() => loadCareConfig('fixture', { path: bad }), /posting/);
  });
});

describe('regular hours mapping', () => {
  const config = [
    { day: 'MONDAY', open: '17:00', close: '22:00' },
    { day: 'SUNDAY', open: '10:00', close: '15:30' },
    { day: 'MONDAY', open: '09:00', close: '12:00' },
    { day: 'SATURDAY', open: '00:00', close: '24:00' },
  ];
  const google = {
    periods: [
      {
        openDay: 'SUNDAY',
        openTime: { hours: 10 },
        closeDay: 'SUNDAY',
        closeTime: { hours: 15, minutes: 30 },
      },
      {
        openDay: 'MONDAY',
        openTime: { hours: 9 },
        closeDay: 'MONDAY',
        closeTime: { hours: 12 },
      },
      {
        openDay: 'MONDAY',
        openTime: { hours: 17 },
        closeDay: 'MONDAY',
        closeTime: { hours: 22 },
      },
      {
        openDay: 'SATURDAY',
        openTime: {},
        closeDay: 'SATURDAY',
        closeTime: { hours: 24 },
      },
    ],
  };

  it('maps config to Google order and omits zero fields', () => {
    assert.deepEqual(toGoogleRegularHours(config), google);
  });

  it('maps Google back to config entries', () => {
    assert.deepEqual(fromGoogleRegularHours(google), [
      { day: 'SUNDAY', open: '10:00', close: '15:30' },
      { day: 'MONDAY', open: '09:00', close: '12:00' },
      { day: 'MONDAY', open: '17:00', close: '22:00' },
      { day: 'SATURDAY', open: '00:00', close: '24:00' },
    ]);
  });

  it('round-trips both ways', () => {
    assert.deepEqual(toGoogleRegularHours(fromGoogleRegularHours(google)), google);
    const back = fromGoogleRegularHours(toGoogleRegularHours(config));
    assert.deepEqual(toGoogleRegularHours(back), toGoogleRegularHours(config));
  });

  it('reads explicit zero minutes as Google may send them', () => {
    assert.deepEqual(
      fromGoogleRegularHours({
        periods: [
          {
            openDay: 'TUESDAY',
            openTime: { hours: 9, minutes: 0 },
            closeDay: 'TUESDAY',
            closeTime: { hours: 17 },
          },
        ],
      }),
      [{ day: 'TUESDAY', open: '09:00', close: '17:00' }],
    );
  });

  it('keeps a period that closes the next day', () => {
    const overnight = {
      periods: [
        {
          openDay: 'FRIDAY',
          openTime: { hours: 18 },
          closeDay: 'SATURDAY',
          closeTime: { hours: 2 },
        },
      ],
    };
    const entries = fromGoogleRegularHours(overnight);
    assert.deepEqual(entries, [
      { day: 'FRIDAY', open: '18:00', close: '02:00', closeDay: 'SATURDAY' },
    ]);
    assert.deepEqual(toGoogleRegularHours(entries), overnight);
  });

  it('treats missing regular hours as no periods', () => {
    assert.deepEqual(fromGoogleRegularHours(null), []);
    assert.deepEqual(toGoogleRegularHours([]), { periods: [] });
  });
});

describe('special hours mapping', () => {
  const config = [
    { date: '2026-12-31', closed: true },
    { date: '2026-12-24', open: '09:00', close: '15:30' },
  ];
  const google = [
    { startDate: { year: 2026, month: 12, day: 31 }, closed: true },
    {
      startDate: { year: 2026, month: 12, day: 24 },
      openTime: { hours: 9 },
      closeTime: { hours: 15, minutes: 30 },
    },
  ];

  it('maps config to Google with a start date only', () => {
    assert.deepEqual(toGoogleSpecialPeriods(config), google);
  });

  it('ignores confirm when mapping to Google', () => {
    assert.deepEqual(toGoogleSpecialPeriods([{ ...config[0], confirm: false }]), [
      google[0],
    ]);
  });

  it('maps Google back to config entries sorted by date', () => {
    assert.deepEqual(fromGoogleSpecialPeriods(google), [config[1], config[0]]);
  });

  it('round-trips both ways', () => {
    assert.deepEqual(fromGoogleSpecialPeriods(toGoogleSpecialPeriods(config)), [
      config[1],
      config[0],
    ]);
    assert.deepEqual(toGoogleSpecialPeriods(fromGoogleSpecialPeriods(google)), [
      google[1],
      google[0],
    ]);
  });

  it('ignores an end date that equals the start date', () => {
    assert.deepEqual(
      fromGoogleSpecialPeriods([
        { ...google[0], endDate: { year: 2026, month: 12, day: 31 } },
      ]),
      [config[0]],
    );
  });

  it('expands a multi-day period to one entry per day', () => {
    assert.deepEqual(
      fromGoogleSpecialPeriods([
        {
          startDate: { year: 2026, month: 12, day: 30 },
          endDate: { year: 2027, month: 1, day: 1 },
          closed: true,
        },
      ]),
      [
        { date: '2026-12-30', closed: true },
        { date: '2026-12-31', closed: true },
        { date: '2027-01-01', closed: true },
      ],
    );
  });

  it('treats missing periods as none', () => {
    assert.deepEqual(fromGoogleSpecialPeriods(undefined), []);
  });
});
