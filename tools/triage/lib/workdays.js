// Working-day maths for triage on Europe/Amsterdam calendar days (YYYY-MM-DD strings pass through, Date objects and ISO instants resolve to their Amsterdam day), Mon-Fri minus the NL public holidays 2026-2027; years outside the table skip weekends only.

export const NL_HOLIDAYS = new Map([
  ['2026-01-01', 'Nieuwjaarsdag'],
  ['2026-04-03', 'Goede Vrijdag'],
  ['2026-04-05', 'Eerste Paasdag'],
  ['2026-04-06', 'Tweede Paasdag'],
  ['2026-04-27', 'Koningsdag'],
  ['2026-05-05', 'Bevrijdingsdag'],
  ['2026-05-14', 'Hemelvaartsdag'],
  ['2026-05-24', 'Eerste Pinksterdag'],
  ['2026-05-25', 'Tweede Pinksterdag'],
  ['2026-12-25', 'Eerste Kerstdag'],
  ['2026-12-26', 'Tweede Kerstdag'],
  ['2027-01-01', 'Nieuwjaarsdag'],
  ['2027-03-26', 'Goede Vrijdag'],
  ['2027-03-28', 'Eerste Paasdag'],
  ['2027-03-29', 'Tweede Paasdag'],
  ['2027-04-27', 'Koningsdag'],
  ['2027-05-05', 'Bevrijdingsdag'],
  ['2027-05-06', 'Hemelvaartsdag'],
  ['2027-05-16', 'Eerste Pinksterdag'],
  ['2027-05-17', 'Tweede Pinksterdag'],
  ['2027-12-25', 'Eerste Kerstdag'],
  ['2027-12-26', 'Tweede Kerstdag'],
]);

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const AMSTERDAM = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Amsterdam',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const DAY_MS = 86_400_000;

export function amsterdamDate(input) {
  if (typeof input === 'string' && DATE_ONLY.test(input)) {
    if (Number.isNaN(Date.parse(`${input}T00:00:00Z`))) throw new Error(`invalid date: ${input}`);
    return input;
  }
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) throw new Error(`invalid date: ${input}`);
  return AMSTERDAM.format(date);
}

function toUtcMs(day) {
  return Date.parse(`${day}T00:00:00Z`);
}

function fromUtcMs(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addCalendarDays(input, n) {
  return fromUtcMs(toUtcMs(amsterdamDate(input)) + n * DAY_MS);
}

export function calendarDaysBetween(a, b) {
  return Math.round((toUtcMs(amsterdamDate(b)) - toUtcMs(amsterdamDate(a))) / DAY_MS);
}

export function isWorkingDay(input) {
  const day = amsterdamDate(input);
  const weekday = new Date(toUtcMs(day)).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !NL_HOLIDAYS.has(day);
}

export function addWorkingDays(input, n) {
  let day = amsterdamDate(input);
  const step = n < 0 ? -1 : 1;
  for (let left = Math.abs(n); left > 0; ) {
    day = addCalendarDays(day, step);
    if (isWorkingDay(day)) left--;
  }
  return day;
}

export function workingDaysBetween(a, b) {
  const from = amsterdamDate(a);
  const to = amsterdamDate(b);
  if (to < from) return -workingDaysBetween(to, from);
  let count = 0;
  for (let day = addCalendarDays(from, 1); day <= to; day = addCalendarDays(day, 1)) {
    if (isWorkingDay(day)) count++;
  }
  return count;
}
