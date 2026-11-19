// Loads and validates each client's private care config and maps its hours to and from Google's shapes.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const DAYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];
const CONSENT_SCOPES = ['replies', 'posts', 'hours'];
const POSTING = ['on', 'off'];
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LANGUAGE_PATTERN = /^[a-z]{2}$/;
const LOCATION_PATTERN = /^locations\/\d+$/;

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';
const pad = (value) => String(value).padStart(2, '0');

export function configPath(slug, { root = DEFAULT_ROOT } = {}) {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    throw new Error(
      `Invalid client slug: ${JSON.stringify(slug)}; use a-z, 0-9 and hyphens`,
    );
  }
  return join(root, 'projects', slug, '.claude', 'care', 'gbp.json');
}

export function listConfiguredSlugs({ root = DEFAULT_ROOT } = {}) {
  const projects = join(root, 'projects');
  if (!existsSync(projects)) return [];
  return readdirSync(projects)
    .filter((slug) => SLUG_PATTERN.test(slug) && existsSync(configPath(slug, { root })))
    .sort();
}

export function loadCareConfig(slug, { root = DEFAULT_ROOT, path } = {}) {
  const file = path ?? configPath(slug, { root });
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read care config ${file}: ${err.code ?? err.message}`, {
      cause: err,
    });
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error(`Care config ${file} is not valid JSON: ${err.message}`, {
      cause: err,
    });
  }
  return validateCareConfig(raw);
}

function timeMinutes(value, { allowMidnightEnd = false } = {}) {
  const match = typeof value === 'string' && value.match(TIME_PATTERN);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59) return null;
  if (hours === 24 && minutes === 0 && allowMidnightEnd) return 24 * 60;
  if (hours > 23) return null;
  return hours * 60 + minutes;
}

function parseDate(value) {
  const match = typeof value === 'string' && value.match(DATE_PATTERN);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function nextDay(day) {
  return DAYS[(DAYS.indexOf(day) + 1) % DAYS.length];
}

function checkPeriod(label, entry, problems, { overnight = false } = {}) {
  const open = timeMinutes(entry.open);
  const close = timeMinutes(entry.close, { allowMidnightEnd: true });
  if (open === null) problems.push(`${label}.open must be HH:MM`);
  if (close === null) problems.push(`${label}.close must be HH:MM`);
  if (open !== null && close !== null && !overnight && open >= close) {
    problems.push(
      `${label} must open before it closes (${entry.open} to ${entry.close})`,
    );
  }
}

function validateRegular(regular, problems) {
  if (!Array.isArray(regular)) {
    problems.push('hours.regular must be an array');
    return [];
  }
  return regular.map((entry, index) => {
    const label = `hours.regular[${index}]`;
    if (!isObject(entry)) {
      problems.push(`${label} must be an object`);
      return null;
    }
    if (!DAYS.includes(entry.day))
      problems.push(`${label}.day must be one of ${DAYS.join(', ')}`);
    const hasCloseDay = entry.closeDay !== undefined && entry.closeDay !== entry.day;
    if (hasCloseDay && entry.closeDay !== nextDay(entry.day)) {
      problems.push(`${label}.closeDay must be the same day or the next day`);
    }
    checkPeriod(label, entry, problems, { overnight: hasCloseDay });
    return {
      day: entry.day,
      open: entry.open,
      close: entry.close,
      ...(hasCloseDay ? { closeDay: entry.closeDay } : {}),
    };
  });
}

function validateSpecial(special, problems) {
  if (!Array.isArray(special)) {
    problems.push('hours.special must be an array');
    return [];
  }
  const seen = new Set();
  return special.map((entry, index) => {
    const label = `hours.special[${index}]`;
    if (!isObject(entry)) {
      problems.push(`${label} must be an object`);
      return null;
    }
    if (!parseDate(entry.date))
      problems.push(`${label}.date must be a real YYYY-MM-DD date`);
    if (seen.has(entry.date))
      problems.push(`${label}.date ${entry.date} is listed twice in hours.special`);
    seen.add(entry.date);
    if (entry.confirm !== undefined && typeof entry.confirm !== 'boolean') {
      problems.push(`${label}.confirm must be true or false`);
    }
    const hasTimes = entry.open !== undefined || entry.close !== undefined;
    const confirm = entry.confirm ?? true;
    if (entry.closed !== undefined && entry.closed !== true) {
      problems.push(`${label}.closed must be true or left out`);
    }
    if (entry.closed === true && hasTimes) {
      problems.push(`${label} has closed and open/close in hours.special; use one`);
    } else if (entry.closed === undefined && !hasTimes) {
      problems.push(`${label} in hours.special needs closed: true or open and close`);
    } else if (hasTimes) {
      checkPeriod(label, entry, problems);
    }
    return entry.closed === true
      ? { date: entry.date, closed: true, confirm }
      : { date: entry.date, open: entry.open, close: entry.close, confirm };
  });
}

function validateStringList(raw, key, problems, check = isNonEmptyString) {
  const value = raw[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(check)) {
    problems.push(
      `${key} must be an array of ${check === isNonEmptyString ? 'non-empty strings' : 'https addresses'}`,
    );
    return [];
  }
  return [...value];
}

function isHttps(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function validateConsent(consent, problems) {
  if (consent === undefined || consent === null) return null;
  if (!isObject(consent)) {
    problems.push('consent must be an object with by, date and scope');
    return null;
  }
  if (!isNonEmptyString(consent.by))
    problems.push('consent.by must be a non-empty string');
  if (!parseDate(consent.date))
    problems.push('consent.date must be a real YYYY-MM-DD date');
  if (
    !Array.isArray(consent.scope) ||
    !consent.scope.every((item) => CONSENT_SCOPES.includes(item))
  ) {
    problems.push(`consent.scope must be an array of ${CONSENT_SCOPES.join(', ')}`);
  }
  return {
    by: consent.by,
    date: consent.date,
    scope: Array.isArray(consent.scope) ? [...consent.scope] : [],
  };
}

export function validateCareConfig(raw) {
  if (!isObject(raw)) throw new Error('Invalid care config: it must be a JSON object');
  const problems = [];

  if (typeof raw.location !== 'string' || !LOCATION_PATTERN.test(raw.location)) {
    problems.push('location must be locations/<numeric id>');
  }
  if (
    !Array.isArray(raw.languages) ||
    raw.languages.length === 0 ||
    !raw.languages.every(
      (code) => typeof code === 'string' && LANGUAGE_PATTERN.test(code),
    )
  ) {
    problems.push('languages must be a non-empty array of 2-letter codes, primary first');
  }
  if (!isNonEmptyString(raw.sector)) problems.push('sector must be a non-empty string');
  if (raw.voice !== undefined && raw.voice !== null && !isNonEmptyString(raw.voice)) {
    problems.push('voice must be a path string');
  }
  const bannedTerms = validateStringList(raw, 'bannedTerms', problems);
  const ctaUrls = validateStringList(raw, 'ctaUrls', problems, isHttps);
  const postThemes = validateStringList(raw, 'postThemes', problems);
  if (raw.posting !== undefined && !POSTING.includes(raw.posting)) {
    problems.push('posting must be "on" or "off"');
  }
  if (raw.standing !== undefined && !Array.isArray(raw.standing)) {
    problems.push('standing must be an array');
  }

  let hours = { regular: [], special: [] };
  if (raw.hours !== undefined) {
    if (!isObject(raw.hours)) {
      problems.push('hours must be an object with regular and special arrays');
    } else {
      hours = {
        regular: validateRegular(raw.hours.regular ?? [], problems),
        special: validateSpecial(raw.hours.special ?? [], problems),
      };
    }
  }
  const consent = validateConsent(raw.consent, problems);

  if (problems.length > 0) {
    throw new Error(`Invalid care config:\n- ${problems.join('\n- ')}`);
  }
  return {
    location: raw.location,
    languages: [...raw.languages],
    sector: raw.sector,
    voice: raw.voice ?? null,
    bannedTerms,
    ctaUrls,
    postThemes,
    hours,
    posting: raw.posting ?? 'on',
    standing: [],
    consent,
  };
}

function toGoogleTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return { ...(hours ? { hours } : {}), ...(minutes ? { minutes } : {}) };
}

function fromGoogleTime(time) {
  return `${pad(time?.hours ?? 0)}:${pad(time?.minutes ?? 0)}`;
}

const periodOrder = (a, b) =>
  DAYS.indexOf(a.openDay) - DAYS.indexOf(b.openDay) ||
  fromGoogleTime(a.openTime).localeCompare(fromGoogleTime(b.openTime)) ||
  fromGoogleTime(a.closeTime).localeCompare(fromGoogleTime(b.closeTime));

export function toGoogleRegularHours(regular = []) {
  const periods = regular.map((entry) => ({
    openDay: entry.day,
    openTime: toGoogleTime(entry.open),
    closeDay: entry.closeDay ?? entry.day,
    closeTime: toGoogleTime(entry.close),
  }));
  return { periods: periods.sort(periodOrder) };
}

export function fromGoogleRegularHours(googleRegular) {
  const periods = [...(googleRegular?.periods ?? [])].sort(periodOrder);
  return periods.map((period) => ({
    day: period.openDay,
    open: fromGoogleTime(period.openTime),
    close: fromGoogleTime(period.closeTime),
    ...(period.closeDay && period.closeDay !== period.openDay
      ? { closeDay: period.closeDay }
      : {}),
  }));
}

function toGoogleDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

export function toGoogleSpecialPeriods(special = []) {
  return special.map((entry) =>
    entry.closed === true
      ? { startDate: toGoogleDate(entry.date), closed: true }
      : {
          startDate: toGoogleDate(entry.date),
          openTime: toGoogleTime(entry.open),
          closeTime: toGoogleTime(entry.close),
        },
  );
}

function datesBetween(startDate, endDate) {
  const start = Date.UTC(startDate.year, startDate.month - 1, startDate.day);
  const end = endDate ? Date.UTC(endDate.year, endDate.month - 1, endDate.day) : start;
  const dates = [];
  for (let time = start; time <= Math.max(start, end); time += 86_400_000) {
    dates.push(new Date(time).toISOString().slice(0, 10));
  }
  return dates;
}

export function fromGoogleSpecialPeriods(periods) {
  const entries = (periods ?? []).flatMap((period) =>
    datesBetween(period.startDate, period.endDate).map((date) =>
      period.closed === true
        ? { date, closed: true }
        : {
            date,
            open: fromGoogleTime(period.openTime),
            close: fromGoogleTime(period.closeTime),
          },
    ),
  );
  return entries.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.open ?? '').localeCompare(b.open ?? ''),
  );
}
