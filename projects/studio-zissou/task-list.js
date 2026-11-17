// Team Zissou task list: shows three [data-sz="task-list"] items at a time and steps the list down one row every 2.5 s, fading the new top item in and the old bottom item out.
(() => {
  'use strict';

  window.SZ = window.SZ || {};
  if (window.SZ.taskListReady) return;
  window.SZ.taskListReady = true;

  const DEBUG = false;
  const VISIBLE = 3;
  const MIDDLE = 1;
  const INTERVAL = 2500;
  const DURATION = 600;
  const TRANSITION = ['transform', 'opacity', 'color'].map((p) => `${p} ${DURATION}ms ease`).join(', ');

  const mod = (a, n) => ((a % n) + n) % n;
  const reduced = () =>
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nextFrame = (fn) => (typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame(fn) : fn());

  const setup = (root) => {
    const items = [...root.children].filter((c) => c.tagName === 'LI');
    const n = items.length;
    if (n <= VISIBLE || root.classList.contains('is-rolling')) return;

    let offset = 0;
    let gap = 0;
    let tallest = 0;
    let heights = [];
    let box = 0;
    let trail = 0;
    let width = 0;
    let hovered = false;
    let inView = true;

    const isVisible = (i) => mod(i + offset, n) < VISIBLE;
    const above = () => -(tallest + gap);
    const move = (item, y) => {
      item.style.transform = `translateY(${y}px)`;
    };

    const render = (leaving = -1) => {
      let y = 0;
      for (let s = 0; s < VISIBLE; s += 1) {
        const i = mod(s - offset, n);
        move(items[i], y);
        items[i].style.opacity = '';
        items[i].classList.toggle('is-muted', s !== MIDDLE);
        y += heights[i] + gap;
      }
      items.forEach((item, i) => {
        if (isVisible(i)) return;
        item.style.opacity = '0';
        item.classList.add('is-muted');
        move(item, i === leaving ? box + gap : above());
      });
    };

    const snap = (fn) => {
      items.forEach((item) => {
        item.style.transition = 'none';
      });
      fn();
      void root.offsetHeight;
      items.forEach((item) => {
        item.style.transition = TRANSITION;
      });
    };

    const measure = () =>
      snap(() => {
        root.classList.remove('is-rolling');
        root.style.height = '';
        items.forEach((item) => {
          item.style.position = '';
          item.style.transform = '';
        });
        const first = items[0].getBoundingClientRect();
        const second = items[1].getBoundingClientRect();
        gap = Math.max(0, second.top - first.bottom);
        trail = Math.max(0, root.getBoundingClientRect().bottom - items[VISIBLE - 1].getBoundingClientRect().bottom);
        root.classList.add('is-rolling');
        root.style.position = 'relative';
        root.style.overflow = 'hidden';
        items.forEach((item) => {
          item.style.position = 'absolute';
          item.style.top = '0';
          item.style.left = '0';
          item.style.width = '100%';
        });
        heights = items.map((item) => item.getBoundingClientRect().height);
        tallest = Math.max(...heights);
        box = Math.max(...heights.map((h, i) => h + heights[mod(i + 1, n)] + heights[mod(i + 2, n)])) + gap * 2 + trail;
        root.style.height = `${box}px`;
        width = root.getBoundingClientRect().width;
        render();
        DEBUG && console.log('[task-list] measure', { gap, tallest, width });
      });

    const step = () => {
      const leaving = mod(VISIBLE - 1 - offset, n);
      offset = mod(offset + 1, n);
      render(leaving);
      window.setTimeout(() => {
        if (isVisible(leaving)) return;
        const item = items[leaving];
        item.style.transition = 'none';
        move(item, above());
        void item.offsetHeight;
        item.style.transition = TRANSITION;
      }, DURATION);
    };

    const tick = () => {
      if (reduced() || document.hidden || hovered || !inView) return;
      step();
      DEBUG && console.log('[task-list] step', offset);
    };

    measure();

    const setHover = (on) => (e) => {
      if (e.pointerType === 'mouse') hovered = on;
    };
    root.addEventListener('pointerenter', setHover(true));
    root.addEventListener('pointerleave', setHover(false));

    if (typeof window.IntersectionObserver === 'function') {
      new window.IntersectionObserver((entries) => {
        entries.forEach((e) => {
          inView = e.isIntersecting;
        });
      }).observe(root);
    }

    if (typeof window.ResizeObserver === 'function') {
      new window.ResizeObserver(() =>
        nextFrame(() => {
          if (root.getBoundingClientRect().width !== width) measure();
        }),
      ).observe(root);
    }

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(() => {});

    window.setInterval(tick, INTERVAL);
    DEBUG && console.log('[task-list] ready', n);
  };

  const init = () => document.querySelectorAll('[data-sz="task-list"]').forEach(setup);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
