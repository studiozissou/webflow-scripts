/**
 * NEM Life — Read More Expand
 * GSAP-powered expand/collapse for content blocks behind a "Lees meer" button.
 * One button toggles ALL sibling [data-block="read-more-expand"] elements.
 * Multiple independent groups per page supported (scoped to parent).
 *
 * Webflow structure (button must contain plain text only — no child elements):
 *   .some-wrapper
 *     [data-block="read-more-expand"]   (collapsible content)
 *     [data-block="read-more-expand"]   (collapsible content)
 *     [data-button="read-more-expand"]  (toggle button — "Lees meer")
 *
 * Requires: GSAP (CDN-loaded).
 */
(() => {
  const DEBUG = false;
  const BUTTONS = document.querySelectorAll('[data-button="read-more-expand"]');
  if (!BUTTONS.length) return;

  DEBUG && console.log('[read-more-expand] found', BUTTONS.length, 'buttons');

  const DURATION = 0.4;
  const EASE = 'power2.inOut';
  const TEXT_MORE = 'Lees meer';
  const TEXT_LESS = 'Lees minder';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function collapseBlock(block) {
    gsap.killTweensOf(block);
    if (REDUCED) {
      gsap.set(block, { height: 0, opacity: 0, overflow: 'hidden' });
    } else {
      gsap.to(block, {
        height: 0,
        opacity: 0,
        duration: DURATION,
        ease: EASE,
        onComplete: () => { block.style.overflow = 'hidden'; },
      });
    }
  }

  function expandBlock(block) {
    gsap.killTweensOf(block);
    block.style.overflow = 'hidden';
    block.style.height = 'auto';
    const h = block.offsetHeight;
    block.style.height = '0px';
    if (REDUCED) {
      gsap.set(block, { height: h, opacity: 1 });
      block.style.height = 'auto';
      block.style.overflow = 'visible';
    } else {
      gsap.to(block, {
        height: h,
        opacity: 1,
        duration: DURATION,
        ease: EASE,
        onComplete: () => {
          block.style.height = 'auto';
          block.style.overflow = 'visible';
        },
      });
    }
  }

  /* Initialise: collapse all blocks and attach click handler */
  BUTTONS.forEach((btn) => {
    const parent = btn.parentElement;
    if (!parent) return;
    const blocks = parent.querySelectorAll('[data-block="read-more-expand"]');
    blocks.forEach((block) => {
      gsap.set(block, { height: 0, opacity: 0, overflow: 'hidden' });
    });

    btn.style.cursor = 'pointer';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = parent.classList.contains('is-open');

      if (isOpen) {
        blocks.forEach(collapseBlock);
        parent.classList.remove('is-open');
        btn.textContent = TEXT_MORE;
      } else {
        blocks.forEach(expandBlock);
        parent.classList.add('is-open');
        btn.textContent = TEXT_LESS;
      }
    });
  });
})();
