// Shared checks that find phone numbers, emails, social handles and links, which Google removes from post and reply text.
const LINK_PATTERN = /\bhttps?:\/\/|\bwww\.[a-z0-9-]+\./i;
const PHONE_CANDIDATE = /\+?\d[\d\s().-]{6,}\d/g;
const PHONE_MIN_DIGITS = 9;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/i;
const HANDLE_PATTERN = /(?<![\w.@])@\w(?:[\w.]*\w)?/g;
const SOCIAL_DOMAIN =
  /\b(?:instagram|facebook|fb|tiktok|twitter|x|linkedin|youtube|threads)\.(?:com|net)\//i;

const asText = (text) => (typeof text === 'string' ? text : '');

export function hasPhoneOrLink(text) {
  if (LINK_PATTERN.test(text)) return true;
  return (text.match(PHONE_CANDIDATE) ?? []).some(
    (candidate) => candidate.replace(/\D/g, '').length >= PHONE_MIN_DIGITS,
  );
}

export function hasEmail(text) {
  return EMAIL_PATTERN.test(asText(text));
}

export function hasHandle(text) {
  const value = asText(text);
  if (SOCIAL_DOMAIN.test(value)) return true;
  return (value.match(HANDLE_PATTERN) ?? []).some((handle) => handle.length >= 3);
}

export function hasContactDetails(text) {
  const value = asText(text);
  return hasPhoneOrLink(value) || hasEmail(value) || hasHandle(value);
}
