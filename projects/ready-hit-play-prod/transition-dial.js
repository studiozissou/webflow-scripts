/* =========================================
   RHP — Transition Dial
   - Static teal dial (96 ticks) for .transition-dial div
   - Used during page transitions (home ↔ about)
   - No mouse interaction; matches homepage dial appearance
   - ALWAYS teal (#05EFBF) — never changes colour (no sector highlight)
   - Barba-safe: init(container) / destroy()
   ========================================= */
(() => {
  const TRANSITION_DIAL_VERSION = '2026.2.18.1';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  const SEL = {
    container: '.transition-dial'
  };

  // Tick config — matches work-dial.js (96 bars, teal #05EFBF)
  const REF_R = 253;
  const T = {
    bars: 96,
    barWRatio: 1.686 / REF_R,
    baseLenRatio: 22.51 / REF_R,
    gapRatio: 24 / REF_R,
    teal: { r: 5, g: 239, b: 191 }
  };
  const TICK_RING_EXPAND = 1 + T.gapRatio + T.baseLenRatio;

  RHP.transitionDial = (() => {
    let alive = false;
    let cleanup = [];
    let rafId = 0;
    let canvas = null;
    let ctx = null;
    let geom = { cx: 0, cy: 0, videoR: 0, innerR: 0, gap: 0, baseLen: 0, barW: 1, dpr: 1 };

    function on(el, evt, fn, opts) {
      if (!el) return;
      el.addEventListener(evt, fn, opts);
      cleanup.push(() => el.removeEventListener(evt, fn, opts));
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function resize() {
      if (!canvas || !canvas.parentElement) return;
      const r = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      geom.dpr = dpr;

      const size = Math.min(r.width, r.height) || 96;
      const pxSize = Math.round(size * dpr);
      canvas.width = pxSize;
      canvas.height = pxSize;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';

      geom.cx = size / 2;
      geom.cy = size / 2;
      geom.videoR = (size / 2) / TICK_RING_EXPAND;
      geom.gap = geom.videoR * T.gapRatio;
      geom.baseLen = geom.videoR * T.baseLenRatio;
      geom.barW = Math.max(1, geom.videoR * T.barWRatio);
      geom.innerR = geom.videoR + geom.gap;
    }

    function draw() {
      if (!alive || !ctx) return;

      const scale = canvas.width / (geom.cx * 2);

      ctx.resetTransform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Teal only — no sector highlight or colour change
      const strokeStyle = `rgb(${T.teal.r},${T.teal.g},${T.teal.b})`;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = geom.barW * scale;
      ctx.lineCap = 'round';

      for (let i = 0; i < T.bars; i++) {
        const a = (i / T.bars) * Math.PI * 2;
        const len = geom.baseLen;

        const x0 = geom.cx + Math.cos(a) * geom.innerR;
        const y0 = geom.cy + Math.sin(a) * geom.innerR;
        const x1 = geom.cx + Math.cos(a) * (geom.innerR + len);
        const y1 = geom.cy + Math.sin(a) * (geom.innerR + len);

        ctx.beginPath();
        ctx.moveTo(x0 * scale, y0 * scale);
        ctx.lineTo(x1 * scale, y1 * scale);
        ctx.stroke();
      }

      rafId = requestAnimationFrame(draw);
    }

    function onVis() {
      if (document.hidden) stop();
      else if (alive) {
        stop();
        rafId = requestAnimationFrame(draw);
      }
    }

    function init(container = document) {
      if (alive) return;

      const wrapper = container.querySelector(SEL.container) || document.querySelector(SEL.container);
      if (!wrapper) return;

      // Create canvas if not present
      canvas = wrapper.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'transition-dial_canvas';
        canvas.setAttribute('aria-hidden', 'true');
        wrapper.appendChild(canvas);
      }

      ctx = canvas.getContext('2d');
      if (!ctx) return;

      alive = true;
      resize();
      on(window, 'resize', resize, { passive: true });
      on(document, 'visibilitychange', onVis, { passive: true });
      rafId = requestAnimationFrame(draw);
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      stop();
      cleanup.forEach((fn) => {
        try { fn(); } catch (e) {}
      });
      cleanup = [];
      canvas = null;
      ctx = null;
    }

    return { init, destroy, version: TRANSITION_DIAL_VERSION };
  })();
})();
