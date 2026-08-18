/**
 * dup-meta.mjs — Fetch the pages SEMrush flagged as duplicate-meta and group them
 * by their actual meta description, so the fix can target the real cause
 * (blank source field vs copy-pasted text).
 */
import { extractMetaDescription, extractTitle } from './tools/entity-audit/lib/extract.js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

const urls = [
  // blog cluster
  'https://www.tamsenfadal.com/blog/why-am-i-so-tired',
  'https://www.tamsenfadal.com/blog/we-need-to-stop-using-this-word',
  'https://www.tamsenfadal.com/blog/menopause-sex-life-with-amy-buckalter',
  'https://www.tamsenfadal.com/blog/how-to-start-living-with-integrity-let-go-of-fear-with-martha-beck',
  'https://www.tamsenfadal.com/blog/colette-courtion-on-prioritizing-sexual-health-in-menopause',
  'https://www.tamsenfadal.com/blog/jonathan-fields-shares-his-good-life-project',
  'https://www.tamsenfadal.com/blog/alloy-womens-health-anne-fulenwider-have-the-answers-to-your-menopause-questions',
  // blog pairs
  'https://www.tamsenfadal.com/blog/your-feet-are-trying-to-tell-you-something',
  'https://www.tamsenfadal.com/blog/the-6-shoes-you-need-in-your-closet',
  'https://www.tamsenfadal.com/blog/the-space-between-who-you-were-and-who-youre-becoming',
  'https://www.tamsenfadal.com/blog/the-hair-conversation-women-are-still-too-afraid-to-have',
  'https://www.tamsenfadal.com/blog/it-was-never-your-fault',
  'https://www.tamsenfadal.com/blog/everything-you-need-to-know-about-gsm-and-vaginal-estrogen',
  // podcast pairs
  'https://www.tamsenfadal.com/podcast/why-you-always-feel-behind-and-the-simple-tools-that-will-free-you',
  'https://www.tamsenfadal.com/podcast/the-glp-1-doctor-what-works-what-doesnt-whats-next',
  'https://www.tamsenfadal.com/podcast/what-i-wish-i-knew-at-35-7-hard-truths-that-changed-my-life',
  'https://www.tamsenfadal.com/podcast/the-hidden-reason-you-keep-choosing-emotionally-unavailable-people',
  'https://www.tamsenfadal.com/podcast/therapist-reveals-why-adult-friendships-are-so-hard-and-how-to-fix-them',
  'https://www.tamsenfadal.com/podcast/hair-loss-dry-skin-and-sagging-skin-the-1-dermatologist-explains',
  'https://www.tamsenfadal.com/podcast/the-testosterone-doctor-the-truth-about-womens-libido',
  'https://www.tamsenfadal.com/podcast/perimenopause-explained-dr-mary-claire-haver-on-hormones-sleep-and-mental-health',
  'https://www.tamsenfadal.com/podcast/the-sleep-doctor-the-4-hormones-wrecking-your-sleep-what-to-do-about-it',
  'https://www.tamsenfadal.com/podcast/the-1-pharmacist-creatine-greens-electrolytes-whats-worth-buying-and-what-isnt',
  'https://www.tamsenfadal.com/podcast/the-hair-loss-doctor-what-works-and-whats-a-waste',
  'https://www.tamsenfadal.com/podcast/it-cant-rain-forever-kandi-burruss-on-reinvention-and-what-comes-next',
  'https://www.tamsenfadal.com/podcast/the-fertility-expert-egg-freezing-perimenopause-glp-1s-explained',
  'https://www.tamsenfadal.com/podcast/progesterone-101-the-hormone-behind-your-3am-wake-ups-your-anxiety-your-worst-pms',
  'https://www.tamsenfadal.com/podcast/the-fasting-doctor-5-science-backed-tools-to-support-your-brain-in-menopause',
  'https://www.tamsenfadal.com/podcast/a-divorce-attorneys-guide-to-leaving-a-narcissist',
  'https://www.tamsenfadal.com/podcast/how-to-start-dating-again-in-2026-even-if-youve-lost-hope',
  'https://www.tamsenfadal.com/podcast/she-was-told-no-over-and-over-then-built-a-1-billion-company-at-53',
  'https://www.tamsenfadal.com/podcast/1-dietitian-do-this-and-you-will-never-feel-guilty-about-eating-again',
  'https://www.tamsenfadal.com/podcast/relationship-q-and-a-red-flags-dating-after-divorce-commitment-issues',
  'https://www.tamsenfadal.com/podcast/if-youre-going-through-a-friendship-breakup-you-need-to-hear-this',
  'https://www.tamsenfadal.com/podcast/naomi-watts-what-i-wish-i-knew-in-my-30s',
  'https://www.tamsenfadal.com/podcast/bobbi-brown-how-to-start-over-when-it-feels-impossible',
  'https://www.tamsenfadal.com/podcast/from-sports-illustrated-to-sephora-how-molly-sims-reinvented-herself-in-midlife',
  'https://www.tamsenfadal.com/podcast/choosing-a-child-free-life-5-things-i-wish-i-knew-earlier',
];

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

const results = await pool(urls, 6, async (u) => {
  try {
    const res = await fetch(u, { headers: { 'user-agent': UA } });
    const html = await res.text();
    return { url: u, status: res.status, desc: extractMetaDescription(html), title: extractTitle(html) };
  } catch (e) {
    return { url: u, status: null, desc: null, error: e.message };
  }
});

const groups = new Map();
for (const r of results) {
  const key = (r.desc || '(NO DESCRIPTION)').trim();
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r.url);
}

const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [desc, list] of sorted) {
  console.log(`\n### ${list.length} page(s) share this description`);
  console.log(`DESC: ${desc}`);
  for (const u of list) console.log(`   - ${u.replace('https://www.tamsenfadal.com', '')}`);
}
console.log(`\n--- ${results.length} fetched, ${groups.size} distinct descriptions ---`);
