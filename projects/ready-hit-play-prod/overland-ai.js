/* =========================================
   RHP — Overland AI case study (page-specific)
   - Grid hover: dim other items, show cover video (desktop ≥992px) — GSAP
   - Benefit video autoplay: play when mobile dropdown opens, pause when closes
   - Loaded only on /work/overland-ai
   v2026.3.18.1
   ========================================= */
(() => {
  window.RHP = window.RHP || {};
  const DEBUG = /localhost|127\.0\.0\.1/.test(window.location.hostname);

  function isOverlandPage() {
    return /\/work\/overland-ai(\/|$)/.test(window.location.pathname);
  }

  /* ── Desktop grid hover (GSAP) ── */

  let _gsapCtx = null;
  const DESKTOP_BP = 992;

  function initGridHover(container) {
    const gsap = window.gsap;
    if (!gsap) return;

    // Clean up previous context
    if (_gsapCtx) { _gsapCtx.revert(); _gsapCtx = null; }

    if (window.innerWidth < DESKTOP_BP) return;

    const ctx = container || document;
    const wrappers = ctx.querySelectorAll('.grid_grid-item-wrapper');
    if (!wrappers.length) return;

    const HOVER_EASE = 'none'; // linear
    const HOVER_DUR = 0.3;
    const ORANGE = '#E45D24';

    _gsapCtx = gsap.context(() => {
      wrappers.forEach((wrapper) => {
        const desktopItem = wrapper.querySelector('.grid_grid-item.is-desktop');
        const gridContent = desktopItem?.querySelector('.grid_grid-content');
        const coverImage = wrapper.querySelector('.grid_cover-image');
        if (!gridContent || !desktopItem) return;

        // Hover targets within this card
        const corners = desktopItem.querySelectorAll('.grid-corner');
        const svgPaths = desktopItem.querySelectorAll('.key-benefits_logo svg path');
        const textSmall = desktopItem.querySelector('.text-size-small');

        // Separate paths by fill vs stroke so we animate the right property
        const fillPaths = [];
        const strokePaths = [];
        const fillOriginals = [];
        const strokeOriginals = [];
        svgPaths.forEach((p) => {
          const cs = getComputedStyle(p);
          const hasStroke = cs.stroke && cs.stroke !== 'none' && cs.stroke !== 'rgba(0, 0, 0, 0)';
          const hasFill = cs.fill && cs.fill !== 'none' && cs.fill !== 'rgba(0, 0, 0, 0)';
          if (hasStroke) { strokePaths.push(p); strokeOriginals.push(cs.stroke); }
          if (hasFill) { fillPaths.push(p); fillOriginals.push(cs.fill); }
        });

        gridContent.addEventListener('mouseenter', () => {
          // Dim all other desktop grid content items
          wrappers.forEach((other) => {
            if (other === wrapper) return;
            const otherContent = other.querySelector('.grid_grid-item.is-desktop .grid_grid-content');
            if (otherContent) gsap.to(otherContent, { opacity: 0, duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true });
          });
          // Show cover image/video behind hovered item
          if (coverImage) {
            gsap.set(coverImage, { display: 'block' });
            gsap.to(coverImage, { opacity: 1, duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true });
            const video = coverImage.querySelector('video');
            if (video) video.play().catch(() => {});
          }
          // Corner borders → orange
          if (corners.length) gsap.to(corners, { borderColor: ORANGE, duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true });
          // SVG paths → orange (fill or stroke depending on path)
          if (fillPaths.length) gsap.to(fillPaths, { fill: ORANGE, duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true });
          if (strokePaths.length) gsap.to(strokePaths, { stroke: ORANGE, duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true });
          // Text → white
          if (textSmall) gsap.to(textSmall, { color: '#fff', duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true });
        });

        gridContent.addEventListener('mouseleave', () => {
          // Restore all desktop grid content items
          wrappers.forEach((other) => {
            const otherContent = other.querySelector('.grid_grid-item.is-desktop .grid_grid-content');
            if (otherContent) gsap.to(otherContent, { opacity: 1, duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true });
          });
          // Hide cover image/video
          if (coverImage) {
            gsap.to(coverImage, {
              opacity: 0, duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true,
              onComplete: () => {
                gsap.set(coverImage, { display: 'none' });
                const video = coverImage.querySelector('video');
                if (video) video.pause();
              }
            });
          }
          // Reverse: corners, SVG, text back to original CSS values
          if (corners.length) gsap.to(corners, { borderColor: 'rgb(217, 229, 231)', duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true });
          fillPaths.forEach((p, idx) => gsap.to(p, { fill: fillOriginals[idx], duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true }));
          strokePaths.forEach((p, idx) => gsap.to(p, { stroke: strokeOriginals[idx], duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true }));
          if (textSmall) gsap.to(textSmall, { color: 'rgb(98, 116, 111)', duration: HOVER_DUR, ease: HOVER_EASE, overwrite: true });
        });
      });
    });

    DEBUG && console.log('[overland-ai] grid hover init:', wrappers.length, 'items');
  }

  /* ── Mobile benefit video autoplay ── */

  const benefitObservers = [];

  function initBenefitVideoAutoplay(container) {
    const ctx = container || document;
    benefitObservers.forEach((o) => o.disconnect());
    benefitObservers.length = 0;

    const dropdowns = ctx.querySelectorAll('.benefits_dropdown-list-mobile');
    if (!dropdowns.length) return;

    function handleClassChange(mutationsList) {
      for (let i = 0; i < mutationsList.length; i++) {
        const mutation = mutationsList[i];
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const targetElement = mutation.target;
          const video = targetElement.querySelector('.grid_cover-image-mobile > video');
          const button = targetElement.querySelector('.grid_cover-image-mobile > div > button');

          if (video && button) {
            if (targetElement.classList.contains('w--open') && video.paused) {
              button.click();
            } else if (!targetElement.classList.contains('w--open') && !video.paused) {
              button.click();
            }
          }
        }
      }
    }

    dropdowns.forEach((dropdown) => {
      const observer = new MutationObserver(handleClassChange);
      observer.observe(dropdown, {
        attributes: true,
        attributeFilter: ['class']
      });
      benefitObservers.push(observer);
    });
  }

  /* ── Lifecycle ── */

  function init(container) {
    if (!isOverlandPage()) return;
    initGridHover(container);
    initBenefitVideoAutoplay(container);
  }

  function destroy() {
    if (_gsapCtx) { _gsapCtx.revert(); _gsapCtx = null; }
    benefitObservers.forEach((o) => o.disconnect());
    benefitObservers.length = 0;
  }

  RHP.overlandAI = { init, destroy, isOverlandPage, version: '2026.3.18.1' };

  function onReady() {
    init(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  window.addEventListener('rhp:barba:afterenter', (e) => {
    const container = e.detail && e.detail.container;
    init(container || document);
  });
})();
