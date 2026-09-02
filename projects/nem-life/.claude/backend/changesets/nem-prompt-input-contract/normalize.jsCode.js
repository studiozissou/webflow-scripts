// Flatten the webhook payload + derive server-side fields.
const b = $json.body ?? $json;
const headers = $json.headers ?? {};
const xff = (headers['x-forwarded-for'] || headers['x-real-ip'] || '').toString();
const ip = xff.split(',')[0].trim() || 'unknown';
const now = new Date();
const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
// Base URL of the /verify webhook. Set NEM_VERIFY_WEBHOOK_URL as an n8n env var,
// or replace the fallback string below once the /verify workflow is deployed.
const base = 'https://reus.app.n8n.cloud/webhook/nem-verify';
const token = (b.token || '').toString();
return [{
  json: {
    token,
    email: (b.email || '').toString().trim().toLowerCase(),
    firstName: (b.firstName || '').toString().trim(),
    gender: b.gender || '',
    ageCategory: b.ageCategory || '',
    relationshipStatus: b.relationshipStatus || '',
    locale: b.locale || 'nl',
    scoresJson: JSON.stringify(b.scores || {}),
    primaryMechanism: b.primaryMechanism || '',
    secondaryMechanism: b.secondaryMechanism || '',
    // v2 conclusion engine fields. The component has sent these since 2026-08-17;
    // they were silently dropped here until 2026-08-18.
    outcome: b.outcome || '',
    conclusionKey: b.conclusionKey || '',
    conclusionId: b.conclusionId || '',
    // Selected client-side from the conclusion key alone — no gender. Empty until Alex's
    // Intro lines tab is exported; Build HTML renders nothing rather than a gap.
    introLine: (b.introLine || '').toString(),
    // The conclusion text the user read on screen. Alex's prompt reads it from the user
    // message and n8n holds no copy of the texts, so it rides the payload like introLine.
    conclusionText: (b.conclusionText || '').toString(),
    // 'submission' is an identified opt-in. The anonymous completion beacon will send
    // 'completion' instead, so default rather than hard-code.
    event: b.event || 'submission',
    totalScore: b.totalScore ?? '',
    nemMattersConsent: b.nemMattersConsent === true,
    honeypot: (b.honeypot || '').toString(),
    ip,
    receivedAt: now.toISOString(),
    expiresAt,
    consumed: false,
    verifyUrl: base + '?token=' + encodeURIComponent(token)
  }
}];

