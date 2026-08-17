/* =========================================
   RHP — Transition Dial
   - Static teal dial (96 ticks) for .transition-dial div
   - Used during page transitions (home ↔ about)
   - No mouse interaction; matches homepage dial appearance
   - ALWAYS teal (#05EFBF) — never changes colour (no sector highlight)
   - Barba-safe: init(container) / destroy()
   ========================================= */
(() => {
  const TRANSITION_DIAL_VERSION = '2026.8.12.1';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  const SEL = {
    container: '.home-transition-dial',
    containerFallback: '.transition-dial' // TODO: remove after confirming .transition-dial is gone from Webflow Designer
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
  // Extra padding (barW + lineCap rounding) so outer tick tips aren't clipped
  const TICK_RING_EXPAND = 1 + T.gapRatio + T.baseLenRatio + T.barWRatio;

  RHP.transitionDial = (() => {
    let alive = false;
    let cleanup = [];
    let canvas = null;
    let ctx = null;
    let geom = { cx: 0, cy: 0, videoR: 0, innerR: 0, gap: 0, baseLen: 0, barW: 1, dpr: 1 };

    function on(el, evt, fn, opts) {
      if (!el) return;
      el.addEventListener(evt, fn, opts);
      cleanup.push(() => el.removeEventListener(evt, fn, opts));
    }

    let lastPxSize = 0; // track to skip no-op redraws during scroll

    function resize() {
      if (!canvas || !canvas.parentElement) return;
      const dpr = window.devicePixelRatio || 1;
      geom.dpr = dpr;

      // Size the backing buffer to match the wrapper's visual size. Called on
      // every scroll frame during the home-scroll-morph scrub (which tweens
      // wrapper scale) — skip if backing size hasn't changed.
      const parent = canvas.parentElement;
      const r = parent.getBoundingClientRect();
      const size = Math.round(Math.min(r.width, r.height)) || 96;
      const pxSize = Math.round(size * dpr);
      if (pxSize === lastPxSize && canvas.width === pxSize) return;
      lastPxSize = pxSize;
      canvas.width = pxSize;
      canvas.height = pxSize;

      // Safari rasterises compositing layers at layout size, then scales the
      // bitmap — causing pixelation when the parent has transform: scale().
      // Fix: set canvas CSS to the visual (post-transform) size and counter-
      // scale so it still fits inside the layout-sized parent. This forces
      // Safari to rasterise the canvas layer at the full visual resolution.
      // Parent needs position:relative + overflow:visible (set in CSS).
      const layoutSize = parent.offsetWidth || size;
      const parentScale = layoutSize > 0 ? r.width / layoutSize : 1;
      if (parentScale > 1.05) {
        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        canvas.style.transform = 'translate(-50%,-50%) scale(' + (1 / parentScale) + ')';
      } else {
        canvas.style.position = '';
        canvas.style.left = '';
        canvas.style.top = '';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.transform = '';
      }

      geom.cx = size / 2;
      geom.cy = size / 2;
      geom.videoR = (size / 2) / TICK_RING_EXPAND;
      geom.gap = geom.videoR * T.gapRatio;
      geom.baseLen = geom.videoR * T.baseLenRatio;
      geom.barW = Math.max(1, geom.videoR * T.barWRatio);
      geom.innerR = geom.videoR + geom.gap;

      // canvas.width/height assignment clears the buffer — must redraw
      draw();
    }

    /** Stroke the 96-bar teal ring into any 2D context.
     *  `g` needs { cx, cy, innerR, baseLen, barW } in the context's own units;
     *  `scale` multiplies coordinates (the live instance draws straight into
     *  backing-store pixels, paintInto pre-scales the context and passes 1). */
    function _paintRing(c2, g, scale) {
      // Teal only — no sector highlight or colour change
      c2.strokeStyle = `rgb(${T.teal.r},${T.teal.g},${T.teal.b})`;
      c2.lineWidth = g.barW * scale;
      c2.lineCap = 'round';

      for (let i = 0; i < T.bars; i++) {
        const a = (i / T.bars) * Math.PI * 2;
        const len = g.baseLen;

        const x0 = g.cx + Math.cos(a) * g.innerR;
        const y0 = g.cy + Math.sin(a) * g.innerR;
        const x1 = g.cx + Math.cos(a) * (g.innerR + len);
        const y1 = g.cy + Math.sin(a) * (g.innerR + len);

        c2.beginPath();
        c2.moveTo(x0 * scale, y0 * scale);
        c2.lineTo(x1 * scale, y1 * scale);
        c2.stroke();
      }
    }

    function draw() {
      if (!alive || !ctx) return;

      const scale = canvas.width / (geom.cx * 2);

      ctx.resetTransform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      _paintRing(ctx, geom, scale);
    }

    /** Paint one static teal ring into an arbitrary canvas, then stop.
     *
     *  Follows work-dial's model for the persistent #dial_ticks-canvas rather
     *  than this module's own: that canvas is full-bleed (it fills
     *  .dial_component), so the ring is centred in the canvas and its radius
     *  comes from the foreground circle, not from the canvas box.
     *
     *  Used by the about→work via-home beat, where work-dial is destroyed and
     *  nothing else is painting the ring. Leaves this module's live instance
     *  (canvas/ctx/geom/alive) untouched.
     *
     *  @param {HTMLCanvasElement} cvs — canvas to paint into.
     *  @param {Element} [radiusFrom] — element whose size sets the ring radius;
     *                                  defaults to #fg-video-wrap. */
    function paintInto(cvs, radiusFrom) {
      if (!cvs || cvs.tagName !== 'CANVAS') return;
      const c2 = cvs.getContext('2d');
      if (!c2) return;

      // offsetWidth/Height ignore CSS transforms — matches work-dial's resize()
      const w = cvs.offsetWidth || cvs.getBoundingClientRect().width;
      const h = cvs.offsetHeight || cvs.getBoundingClientRect().height;
      if (!w || !h) return;

      const fg = radiusFrom || document.getElementById('fg-video-wrap');
      const fr = fg && fg.getBoundingClientRect();
      const videoR = fr ? Math.min(fr.width, fr.height) / 2 : 0;
      if (!videoR) return;

      const dpr = window.devicePixelRatio || 1;
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      c2.setTransform(dpr, 0, 0, dpr, 0, 0);
      c2.clearRect(0, 0, w, h);

      _paintRing(c2, {
        cx: w / 2,
        cy: h / 2,
        innerR: videoR + videoR * T.gapRatio,
        baseLen: videoR * T.baseLenRatio,
        barW: Math.max(1, videoR * T.barWRatio)
      }, 1);
    }

    /** Clear a canvas previously painted by paintInto(). */
    function clearCanvas(cvs) {
      if (!cvs || cvs.tagName !== 'CANVAS') return;
      const c2 = cvs.getContext('2d');
      if (!c2) return;
      c2.setTransform(1, 0, 0, 1, 0, 0);
      c2.clearRect(0, 0, cvs.width, cvs.height);
    }

    function onVis() {
      if (!document.hidden && alive && ctx) draw();
    }

    function init(container = document) {
      if (alive) return;

      const wrapper = container.querySelector(SEL.container) || document.querySelector(SEL.container) ||
        container.querySelector(SEL.containerFallback) || document.querySelector(SEL.containerFallback);
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
      resize(); // resize() calls draw() internally
      on(window, 'resize', resize, { passive: true });
      on(document, 'visibilitychange', onVis, { passive: true });
    }

    function destroy() {
      if (!alive) return;
      alive = false;
      cleanup.forEach((fn) => {
        try { fn(); } catch (e) {}
      });
      cleanup = [];
      canvas = null;
      ctx = null;
      lastPxSize = 0;
    }

    return { init, destroy, resize, paintInto, clearCanvas, version: TRANSITION_DIAL_VERSION };
  })();
})();
