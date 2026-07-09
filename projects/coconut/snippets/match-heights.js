/**
 * match-heights.js — equalise the height of matching sections across sibling cards.
 *
 * Markup:
 *   <div class="card">
 *     <div data-mh="header">…</div>
 *     <div data-mh="key">…</div>
 *     <div>…</div>              <!-- unmarked: flex:1, fills and pins the CTA -->
 *   </div>
 *
 * Every [data-mh="header"] on the page gets the height of the tallest one.
 * Below 992px all heights are released so the cards stack naturally.
 *
 * API: window.matchHeights.refresh() | .destroy()
 */
(function () {
  'use strict';

  var DEBUG = false;

  var BREAKPOINT = '(min-width: 992px)';
  var ATTR = 'data-mh';
  var SELECTOR = '[' + ATTR + ']';

  if (window.matchHeights) return; // script included twice

  var frame = null;
  var observer = null;
  var applied = new Map(); // group name -> last written height, to skip no-op writes
  var mq = window.matchMedia(BREAKPOINT);

  /** Hidden elements (inactive tabs, display:none) measure 0 — never let them win. */
  function isVisible(el) {
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  function sections() {
    return document.querySelectorAll(SELECTOR);
  }

  function clearHeights(els) {
    for (var i = 0; i < els.length; i++) els[i].style.minHeight = '';
  }

  function collectGroups(els) {
    var groups = new Map();

    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!isVisible(el)) continue;

      var name = el.getAttribute(ATTR);
      if (!name) continue;

      var bucket = groups.get(name);
      if (bucket) bucket.push(el);
      else groups.set(name, [el]);
    }

    return groups;
  }

  function sync() {
    frame = null;

    var els = sections();
    if (!els.length) return;

    // The observer must not see our own writes: its callbacks run after rAF in
    // the same frame, so any flag we reset in rAF would already be cleared.
    if (observer) observer.disconnect();

    if (!mq.matches) {
      clearHeights(els);
      applied.clear();
      return; // stay disconnected; the mq listener re-arms us on the way back up
    }

    // Phase 1 (write): release every height so we measure natural content.
    clearHeights(els);

    // Phase 2 (read): measure. Batched after the writes to cost one reflow.
    var groups = collectGroups(els);
    var writes = [];

    groups.forEach(function (group, name) {
      if (group.length < 2) return;

      var tallest = 0;
      for (var i = 0; i < group.length; i++) {
        var h = group[i].getBoundingClientRect().height;
        if (h > tallest) tallest = h;
      }

      // Subpixel heights round down when painted; ceil so text can't clip.
      tallest = Math.ceil(tallest);

      if (applied.get(name) === tallest) return;
      applied.set(name, tallest);
      writes.push([group, tallest]);

      DEBUG && console.log('[match-heights] ' + name + ': ' + group.length + ' els -> ' + tallest);
    });

    // Phase 3 (write): min-height rather than height, so late-loading fonts or
    // longer CMS copy grow the box instead of overflowing it.
    for (var j = 0; j < writes.length; j++) {
      var els_ = writes[j][0];
      var height = writes[j][1];
      for (var k = 0; k < els_.length; k++) els_[k].style.minHeight = height + 'px';
    }

    observe();
  }

  function schedule() {
    if (frame !== null) return;
    frame = requestAnimationFrame(sync);
  }

  function observe() {
    if (typeof ResizeObserver === 'undefined') return;

    if (!observer) observer = new ResizeObserver(schedule);
    else observer.disconnect();

    // Watch the sections' children, not the sections — a section's own box is
    // what we write to, and an accordion opening inside it must still resync.
    var els = sections();
    for (var i = 0; i < els.length; i++) {
      var kids = els[i].children;
      for (var j = 0; j < kids.length; j++) observer.observe(kids[j]);
    }
  }

  function onBreakpointChange() {
    applied.clear();
    schedule();
  }

  function destroy() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;

    if (observer) observer.disconnect();
    observer = null;

    clearHeights(sections());
    applied.clear();

    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    if (mq.removeEventListener) mq.removeEventListener('change', onBreakpointChange);
    else mq.removeListener(onBreakpointChange); // Safari < 14

    delete window.matchHeights;
  }

  function init() {
    schedule();

    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });

    if (mq.addEventListener) mq.addEventListener('change', onBreakpointChange);
    else mq.addListener(onBreakpointChange); // Safari < 14

    // Webfonts land after first paint and rewrap text.
    if (document.fonts) document.fonts.ready.then(schedule);
  }

  // Webflow tab switches and CMS filters swap the DOM — call refresh() after those.
  window.matchHeights = { refresh: schedule, destroy: destroy };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
