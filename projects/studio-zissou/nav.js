// Team Zissou sticky nav: gives [data-sz="nav"] the u-scheme-* class of the section under it, publishes its height as --sz-nav-h, and hands anchor scroll from Webflow to the browser.
(() => {
  'use strict';

  window.SZ = window.SZ || {};
  if (window.SZ.navReady) return;
  window.SZ.navReady = true;

  const DEBUG = false;
  const PREFIX = 'u-scheme-';
  const PROBE_OFFSET = 4;

  const schemeOf = (el) => [...el.classList].find((c) => c.startsWith(PREFIX)) || null;

  const collectSections = (nav) => {
    const candidates = [...document.querySelectorAll(`[class*="${PREFIX}"]`)].filter(
      (el) => schemeOf(el) && !nav.contains(el) && !el.contains(nav),
    );
    return candidates.filter((el) => !candidates.some((other) => other !== el && other.contains(el)));
  };

  const dropWebflowScroll = () => {
    try {
      if (typeof window.jQuery === 'function') window.jQuery(document).off('click.wf-scroll');
    } catch (err) {
      DEBUG && console.log('[nav] off failed', err);
    }
  };

  const queueWebflow = () => {
    try {
      window.Webflow = window.Webflow || [];
      window.Webflow.push(dropWebflowScroll);
    } catch (err) {
      DEBUG && console.log('[nav] Webflow.push failed', err);
    }
  };

  const hashTarget = () => {
    const hash = (window.location && window.location.hash) || '';
    if (hash.length < 2) return null;
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch (err) {
      return null;
    }
  };

  const setup = (nav) => {
    const fallback = schemeOf(nav);
    const sections = collectSections(nav);
    const rootStyle = document.documentElement.style;
    let height = '';
    let landed = false;
    let queued = false;

    const applyScheme = (token) => {
      [...nav.classList].filter((c) => c.startsWith(PREFIX) && c !== token).forEach((c) => nav.classList.remove(c));
      if (token && !nav.classList.contains(token)) nav.classList.add(token);
    };

    const update = () => {
      const probe = nav.getBoundingClientRect().bottom + PROBE_OFFSET;
      const hit = sections.find((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= probe && probe < r.bottom;
      });
      applyScheme((hit && schemeOf(hit)) || fallback);

      const next = nav.offsetHeight + 'px';
      if (next === height) return;
      height = next;
      rootStyle.setProperty('--sz-nav-h', next);
      if (landed) return;
      landed = true;
      const target = hashTarget();
      if (target) target.scrollIntoView();
    };

    const schedule = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        update();
      });
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', () => {
      dropWebflowScroll();
      schedule();
    });

    queueWebflow();
    if (document.readyState === 'complete') dropWebflowScroll();
    update();
    DEBUG && console.log('[nav] ready', sections.length, fallback);
  };

  const init = () => {
    const nav = document.querySelector('[data-sz="nav"]');
    if (nav) setup(nav);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
