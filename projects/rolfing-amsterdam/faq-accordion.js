// FAQ accordion: keeps only the first native <details> open in each .faq_list and tweens open and close with GSAP (height, answer fade, icon turn), leaving reduced-motion visitors, pages without GSAP and browser-driven toggles such as find-in-page to the native behaviour.
(function () {
  'use strict';

  if (window.ROLFING && window.ROLFING.faq) return;

  var document = window.document;
  var OPEN = { duration: 0.45, ease: 'power3.out' };
  var CLOSE = { duration: 0.35, ease: 'power2.inOut' };
  var TURNED = 45;
  var BOUND = 'data-faq-bound';
  var CLOSING = 'is-closing';

  var items = [];

  function gsap() {
    var g = window.gsap;
    return g && typeof g.fromTo === 'function' ? g : null;
  }

  function prefersReducedMotion() {
    return !!(
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function px(value) {
    return parseFloat(value) || 0;
  }

  function closedHeight(item) {
    var style = window.getComputedStyle(item.details);
    return (
      item.summary.offsetHeight +
      px(style.paddingTop) +
      px(style.paddingBottom) +
      px(style.borderTopWidth) +
      px(style.borderBottomWidth)
    );
  }

  function stop(item) {
    var g = gsap();
    for (var i = 0; i < item.tweens.length; i++) item.tweens[i].kill();
    item.tweens = [];
    item.details.classList.remove(CLOSING);
    item.details.style.overflow = '';
    item.details.style.boxSizing = '';
    if (!g) return;
    g.set(item.details, { clearProps: 'height' });
    if (item.wrap) g.set(item.wrap, { clearProps: 'opacity' });
    if (item.icon) g.set(item.icon, { clearProps: 'transform' });
  }

  function tween(item, target, prop, from, to, timing, onComplete) {
    var fromVars = {};
    var toVars = { duration: timing.duration, ease: timing.ease };
    fromVars[prop] = from;
    toVars[prop] = to;
    if (onComplete) toVars.onComplete = onComplete;
    item.tweens.push(gsap().fromTo(target, fromVars, toVars));
  }

  function animate(item, opening) {
    var g = gsap();
    var details = item.details;
    var busy = item.tweens.length > 0;
    var fromHeight = details.offsetHeight;
    var fromOpacity = opening ? 0 : 1;
    var fromRotation = opening ? 0 : TURNED;
    if (busy && item.wrap) fromOpacity = px(g.getProperty(item.wrap, 'opacity'));
    if (busy && item.icon) fromRotation = px(g.getProperty(item.icon, 'rotation'));

    stop(item);
    if (opening) details.setAttribute('open', '');
    else details.classList.add(CLOSING);
    var toHeight = opening ? details.offsetHeight : closedHeight(item);
    var timing = opening ? OPEN : CLOSE;

    details.style.overflow = 'hidden';
    details.style.boxSizing = 'border-box';
    tween(item, details, 'height', fromHeight, toHeight, timing, function () {
      if (!opening) details.removeAttribute('open');
      stop(item);
    });
    if (item.wrap)
      tween(item, item.wrap, 'opacity', fromOpacity, opening ? 1 : 0, timing);
    if (item.icon)
      tween(item, item.icon, 'rotation', fromRotation, opening ? TURNED : 0, timing);
    item.opening = opening;
  }

  function bind(details) {
    var summary = details.querySelector('summary');
    if (!summary) return;

    var item = {
      details: details,
      summary: summary,
      wrap: details.querySelector('.faq_answer-wrap'),
      icon: details.querySelector('.faq-icon'),
      tweens: [],
      opening: false,
    };

    item.onClick = function (event) {
      if (prefersReducedMotion() || !gsap()) return;
      event.preventDefault();
      var opening = item.tweens.length ? !item.opening : !details.hasAttribute('open');
      animate(item, opening);
    };

    item.onToggle = function () {
      if (item.tweens.length && !details.hasAttribute('open')) stop(item);
    };

    summary.addEventListener('click', item.onClick);
    details.addEventListener('toggle', item.onToggle);
    details.setAttribute(BOUND, '');
    items.push(item);
  }

  function setUpList(list) {
    var all = list.querySelectorAll('details.faq_item');
    var fresh = [];
    for (var i = 0; i < all.length; i++)
      if (!all[i].hasAttribute(BOUND)) fresh.push(all[i]);

    if (fresh.length === all.length)
      for (var j = 1; j < all.length; j++) all[j].removeAttribute('open');

    for (var k = 0; k < fresh.length; k++) bind(fresh[k]);
  }

  function init(root) {
    var lists = (root || document).querySelectorAll('.faq_list');
    if (!lists.length) return;
    for (var i = 0; i < lists.length; i++) setUpList(lists[i]);
    document.documentElement.classList.add('faq-ready');
  }

  function destroy() {
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      stop(item);
      item.summary.removeEventListener('click', item.onClick);
      item.details.removeEventListener('toggle', item.onToggle);
      item.details.removeAttribute(BOUND);
    }
    items = [];
  }

  window.ROLFING = window.ROLFING || {};
  window.ROLFING.faq = { init: init, destroy: destroy };

  function run() {
    init(document);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', run);
  else run();
})();
