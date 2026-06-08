// Module: battery-animation
// Project: Carsa
// Deps: GSAP (loaded globally on page)

(() => {
  if (typeof gsap === 'undefined') return;

  const TRIGGER = '[data-animation="battery"]';
  const BAR_SEL = '.details_battery-health-bar';
  const GRADE_SEL = '.battery-grade';
  const PANEL_SEL = '.details_accordion-details-wrapper';

  document.querySelectorAll(TRIGGER).forEach(trigger => {
    const scope = trigger.parentElement;
    const bar = scope.querySelector(BAR_SEL);
    const grade = scope.querySelector(GRADE_SEL);
    const panel = scope.querySelector(PANEL_SEL);

    if (!bar || !grade || !panel) return;

    const targetWidth = (bar.dataset.width || '0') + '%';

    function reset() {
      gsap.killTweensOf(bar);
      gsap.killTweensOf(grade);
      gsap.set(bar, { width: 0 });
      gsap.set(grade, { opacity: 0, scale: 1.5 });
    }

    trigger.addEventListener('click', () => {
      const isOpen = parseFloat(getComputedStyle(panel).height) > 10;

      if (!isOpen) {
        // Accordion is closed → opening → reset then animate
        reset();
        gsap.to(bar, { width: targetWidth, duration: 2, ease: 'expo.out' });
        gsap.to(grade, { opacity: 1, scale: 1, duration: 1, delay: 1, ease: 'power4.out' });
      } else {
        // Accordion is open → closing → snap to zero
        reset();
      }
    });
  });
})();
