/**
 * NEM Life — FAQ Accordion
 * Collapse/expand FAQ cards on click with +/− icon toggle.
 * First item open by default; all others closed.
 *
 * Webflow structure (FAQ Card component):
 *   .faq-card
 *     .faq_heading-side   (clickable header)
 *       .faq_icon-wrap
 *         .faq_horizontal-line  (always visible = minus)
 *         .faq_vertical-line    (rotated away when open = plus)
 *     .faq_answer-side    (collapsible body)
 *
 * Requires: GSAP (CDN-loaded).
 */
(() => {
  const DEBUG = false;
  const ITEMS = document.querySelectorAll('.faq-card');
  if (!ITEMS.length) return;

  DEBUG && console.log('[faq-accordion] found', ITEMS.length, 'items');

  const DURATION = 0.4;
  const EASE = 'power2.inOut';

  function collapse(item) {
    const answer = item.querySelector('.faq_answer-side');
    const vLine = item.querySelector('.faq_vertical-line');
    if (!answer) return;
    gsap.to(answer, {
      height: 0,
      opacity: 0,
      duration: DURATION,
      ease: EASE,
      onComplete: () => { answer.style.overflow = 'hidden'; },
    });
    if (vLine) gsap.to(vLine, { rotation: 0, duration: DURATION, ease: EASE });
    item.classList.remove('is-open');
  }

  function expand(item) {
    const answer = item.querySelector('.faq_answer-side');
    const vLine = item.querySelector('.faq_vertical-line');
    if (!answer) return;
    answer.style.overflow = 'hidden';
    answer.style.height = 'auto';
    const h = answer.offsetHeight;
    answer.style.height = '0px';
    gsap.to(answer, {
      height: h,
      opacity: 1,
      duration: DURATION,
      ease: EASE,
      onComplete: () => {
        answer.style.height = 'auto';
        answer.style.overflow = 'visible';
      },
    });
    if (vLine) gsap.to(vLine, { rotation: 90, duration: DURATION, ease: EASE });
    item.classList.add('is-open');
  }

  /* Initialise: collapse all, then open first */
  ITEMS.forEach((item) => {
    const answer = item.querySelector('.faq_answer-side');
    const vLine = item.querySelector('.faq_vertical-line');
    if (!answer) return;
    gsap.set(answer, { height: 0, opacity: 0, overflow: 'hidden' });
    if (vLine) gsap.set(vLine, { rotation: 0 });
  });
  expand(ITEMS[0]);

  /* Click handler */
  ITEMS.forEach((item) => {
    const header = item.querySelector('.faq_heading-side');
    if (!header) return;
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      /* Close all others */
      ITEMS.forEach((other) => {
        if (other !== item && other.classList.contains('is-open')) {
          collapse(other);
        }
      });
      /* Toggle clicked item */
      if (isOpen) {
        collapse(item);
      } else {
        expand(item);
      }
    });
  });
})();
