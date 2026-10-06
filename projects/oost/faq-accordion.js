// Oost FAQ accordion: keeps only the first native <details> open in each .faq_list and animates open and close with the Web Animations API, leaving reduced-motion visitors and browser-driven toggles such as find-in-page to the native behaviour.
(function () {
  'use strict';

  if (window.OOST && window.OOST.faq) return;

  var document = window.document;
  var EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
  var OPEN_MS = 400;
  var CLOSE_MS = 300;
  var BOUND = 'data-faq-bound';
  var CLOSING = 'is-closing';

  var items = [];

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
    for (var i = 0; i < item.animations.length; i++) {
      item.animations[i].onfinish = null;
      item.animations[i].cancel();
    }
    item.animations = [];
    item.details.classList.remove(CLOSING);
    item.details.style.overflow = '';
    item.details.style.boxSizing = '';
  }

  function animate(item, opening) {
    var details = item.details;
    var wrap = item.wrap;
    var fromHeight = details.offsetHeight;
    var fromOpacity = opening ? 0 : 1;
    if (wrap && item.animations.length)
      fromOpacity = px(window.getComputedStyle(wrap).opacity);

    stop(item);
    if (opening) details.setAttribute('open', '');
    else details.classList.add(CLOSING);
    var toHeight = opening ? details.offsetHeight : closedHeight(item);
    var timing = { duration: opening ? OPEN_MS : CLOSE_MS, easing: EASING };

    details.style.overflow = 'hidden';
    details.style.boxSizing = 'border-box';
    var height = details.animate(
      [{ height: fromHeight + 'px' }, { height: toHeight + 'px' }],
      timing,
    );
    item.animations = [height];
    if (wrap)
      item.animations.push(
        wrap.animate([{ opacity: fromOpacity }, { opacity: opening ? 1 : 0 }], timing),
      );
    item.opening = opening;

    height.onfinish = function () {
      if (!opening) details.removeAttribute('open');
      stop(item);
    };
  }

  function bind(details) {
    var summary = details.querySelector('summary');
    if (!summary) return;

    var item = {
      details: details,
      summary: summary,
      wrap: details.querySelector('.faq_answer-wrap'),
      animations: [],
      opening: false,
    };

    item.onClick = function (event) {
      if (prefersReducedMotion() || typeof details.animate !== 'function') return;
      event.preventDefault();
      var opening = item.animations.length
        ? !item.opening
        : !details.hasAttribute('open');
      animate(item, opening);
    };

    item.onToggle = function () {
      if (item.animations.length && !details.hasAttribute('open')) stop(item);
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

  window.OOST = window.OOST || {};
  window.OOST.faq = { init: init, destroy: destroy };

  function run() {
    init(document);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', run);
  else run();
})();
