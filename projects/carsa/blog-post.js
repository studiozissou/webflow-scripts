// Carsa blog post behaviour moved out of the Webflow post template: the Relume responsive tooltip powerup (github.com/relumetech/powerups, tooltips), which keeps each tooltip inside the viewport on hover.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('blog-post.js');

  function block(fn) {
    try {
      fn();
    } catch (err) {
      window.setTimeout(function () {
        throw err;
      });
    }
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        block(fn);
      });
    } else {
      block(fn);
    }
  }

  const iconWrapperClass = 'tooltip1_element-wrapper';
  const tooltipWrapperClass = 'tooltip1_tooltip-wrapper';
  const pointerClass = 'tooltip1_pointer';
  const GUARD = 'relumeTooltipSetup';

  const capitalise = (t) => t[0].toUpperCase() + t.slice(1);
  const paddingOf = (side) => 'padding' + capitalise(side);
  const OPPOSITE = { bottom: 'top', left: 'right', right: 'left', top: 'bottom' };
  const POINTER = {
    bottom: { margin: [1, 'auto', 0, 'auto'], inset: [0, 0, 'auto', 0] },
    left: { margin: [0, 1, 0, 0], inset: ['auto', 0, 'auto', 'auto'] },
    right: { margin: [0, 0, 0, 1], inset: ['auto', 'auto', 'auto', 0] },
    top: { margin: [0, 'auto', 1, 'auto'], inset: ['auto', 0, 0, 0] }
  };
  const X_AXIS = { start: 'left', end: 'right', len: 'width', translate: 'translateX' };
  const Y_AXIS = { start: 'top', end: 'bottom', len: 'height', translate: 'translateY' };
  const AXIS = { top: X_AXIS, bottom: X_AXIS, left: Y_AXIS, right: Y_AXIS };

  function setup(icon) {
    if (icon.dataset[GUARD]) return;
    icon.dataset[GUARD] = 1;
    const tooltip = icon.parentElement.querySelector('.' + tooltipWrapperClass);
    const pointer = icon.parentElement.querySelector('.' + pointerClass);
    const side = pointer.className.includes('is-left') ? 'left'
      : pointer.className.includes('is-right') ? 'right'
        : pointer.className.includes('is-bottom') ? 'bottom'
          : 'top';
    const flipSide = OPPOSITE[side];
    const tooltipStyle = window.getComputedStyle(tooltip);
    const padding = parseInt(tooltipStyle.paddingTop, 10) || parseInt(tooltipStyle.paddingBottom, 10) || parseInt(tooltipStyle.paddingLeft, 10) || parseInt(tooltipStyle.paddingRight, 10) || 0;
    const pointerStyle = window.getComputedStyle(pointer);
    const gap = [pointerStyle.marginTop, pointerStyle.marginRight, pointerStyle.marginBottom, pointerStyle.marginLeft][POINTER[side].margin.indexOf(1)];
    let active = false;

    function position() {
      if (!active) return;
      window.requestAnimationFrame(position);
      const iconRect = icon.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      const root = document.documentElement;
      const axis = AXIS[side];
      const startEdge = (iconRect[axis.start] + iconRect[axis.end] - tipRect[axis.len]) / 2;
      const endEdge = (iconRect[axis.start] + iconRect[axis.end] + tipRect[axis.len]) / 2;
      const viewport = root['client' + capitalise(axis.len)];
      let shift = 0;
      if (startEdge < 0) shift = -startEdge;
      else if (viewport < endEdge) shift = viewport - endEdge;
      const fits = {
        bottom: iconRect.bottom + tipRect.height < root.clientHeight,
        left: 0 < iconRect.left - tipRect.width,
        right: iconRect.right + tipRect.width < root.clientWidth,
        top: 0 < iconRect.top - tipRect.height
      };
      const placed = fits[side] || !fits[flipSide] ? side : flipSide;
      const anchor = OPPOSITE[placed];
      tooltip.style[anchor] = '100%';
      tooltip.style[placed] = 'auto';
      tooltip.style[paddingOf(anchor)] = padding + 'px';
      tooltip.style[paddingOf(placed)] = '0';
      tooltip.style.transform = axis.translate + '(' + shift + 'px)';
      pointer.style.transform = axis.translate + '(' + -shift + 'px) rotate(45deg)';
      pointer.style.margin = POINTER[placed].margin.map((v) => (v === 1 ? gap : v)).join(' ');
      pointer.style.inset = POINTER[placed].inset.join(' ');
    }

    icon.parentElement.addEventListener('mouseenter', () => {
      active = true;
      position();
    });
    icon.parentElement.addEventListener('mouseleave', () => {
      active = false;
    });
  }

  onReady(function () {
    document.querySelectorAll('.' + iconWrapperClass).forEach(setup);
  });
})(window.jQuery);
