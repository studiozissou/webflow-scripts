/**
 * config.js — Site pair + page map for the entity audit
 *
 * The page map is the one genuinely manual part of this tool: only a human
 * knows that the old /the-tamsen-show-podcast became the new /podcast. Slug
 * pairs are listed most-important-first so the report reads in priority order.
 *
 * Old-site backup/, dev/ and one-off roundtable landing pages are deliberately
 * excluded — they were never part of the ranking surface.
 */

const tamsenFadal = {
  key: 'tamsen-fadal',
  entity: 'Tamsen Fadal',
  old: {
    label: 'Old site (archived)',
    origin: 'https://tamsen.webflow.io',
  },
  current: {
    label: 'Current site',
    origin: 'https://www.tamsenfadal.com',
  },
  /**
   * old → current path pairs.
   * `old: null` means the page is new; `current: null` means it was dropped.
   */
  pages: [
    { name: 'Home', old: '/', current: '/' },
    { name: 'About', old: '/about', current: '/about-tamsen' },
    { name: 'Book — How to Menopause', old: '/how-to-menopause/how-to-menopause', current: '/book-how-to-menopause' },
    { name: 'Podcast', old: '/the-tamsen-show-podcast', current: '/podcast' },
    { name: 'Speaking', old: '/speaking', current: '/speaking' },
    { name: 'Press', old: '/press-and-media', current: '/press' },
    { name: 'Blog', old: '/blog', current: '/blog' },
    { name: 'The M Factor', old: '/the-m-factor', current: '/themfactor' },
    { name: 'Provider directory', old: '/providers-directory', current: '/menopause-support-provider-directory' },
    { name: 'Shop', old: '/store', current: '/shop' },
    { name: 'Free resources', old: '/free-resources', current: '/book-how-to-menopause/free-resources' },
    { name: 'Newsletter / subscribe', old: '/subscribe', current: '/newsletter' },
    { name: 'Contact', old: '/contact', current: '/contact' },
    { name: 'Perimenopause quiz', old: '/perimenopause-quiz', current: '/free-menopause-guide' },
    { name: 'Privacy policy', old: '/privacy-policy', current: '/privacy-policy' },
    { name: 'Terms & conditions', old: '/terms-conditions', current: '/terms-conditions' },

    // Pages that exist only on one side — tracked so nothing silently vanishes.
    { name: 'Education hub', old: null, current: '/menopause-education-hub' },
    { name: 'Events', old: null, current: '/events' },
    { name: 'Advocacy / MAP', old: '/map-menopause-action-plan', current: '/advocacy' },
    { name: 'The New Single', old: '/the-new-single', current: null },
  ],
};

const SITES = { 'tamsen-fadal': tamsenFadal };

/**
 * @param {string} key
 * @returns {object} site config
 */
function getSite(key) {
  const site = SITES[key];
  if (!site) {
    throw new Error(`Unknown site "${key}". Known: ${Object.keys(SITES).join(', ')}`);
  }
  return site;
}

export { SITES, getSite, tamsenFadal };
