// Consumes the five validated JSON sections. Formatting lives here, not in the prompt -
// the model returns content only. Values are escaped: Christel's prose contains & and
// quotes, which would otherwise break the document.
const p = $('Validate Token').first().json;
const r = $json.report;
const SECTIONS = ['opening', 'reaction', 'origin', 'cost', 'closing'];

const heading = p.locale === 'en' ? 'Your NEM Test report' : 'Jouw NEM Test rapport';
const greeting = p.locale === 'en' ? 'Dear' : 'Beste';

// Fixed editorial copy, selected client-side on the conclusion key alone (no gender).
// Empty until Alex's Intro lines tab is exported — an empty line renders nothing, not a gap.
const introLine = String(p.introLine || '').trim();

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const para = (t) => esc(t)
  .split(/\n{2,}/)
  .map(x => '<p>' + x.replace(/\n/g, '<br>') + '</p>')
  .join('');

const body = SECTIONS.map(k => para(r[k])).join('');
const reportText = SECTIONS.map(k => r[k]).join('\n\n');

const html = '<!doctype html><html><head><meta charset="utf-8"><style>'
  + 'body{font-family:Georgia,serif;color:#292828;max-width:640px;margin:0 auto;padding:48px 40px;line-height:1.6;font-size:16px}'
  + 'h1{font-family:Montserrat,Arial,sans-serif;font-size:24px;color:#292828}'
  + '.intro{font-family:Georgia,serif;font-size:18px;font-style:italic;color:#5a5757;margin:0 0 24px}'
  + 'p{margin:0 0 16px}'
  + '</style></head><body><h1>' + heading + '</h1>'
  + (introLine ? '<p class="intro">' + esc(introLine) + '</p>' : '')
  + '<p>' + greeting + ' ' + esc(p.firstName || '') + ',</p>'
  + body
  + '</body></html>';

return [{ json: Object.assign({ html: html, reportText: reportText }, p) }];
