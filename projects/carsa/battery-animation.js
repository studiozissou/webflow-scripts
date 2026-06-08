// Module: battery-animation
// Project: Carsa
// Deps: GSAP (loaded globally on page)

(() => {
  if (typeof gsap === 'undefined') return;

  const TRIGGER = '[data-animation="battery"]';
  const BAR_SEL = '.details_battery-health-bar';
  const GRADE_SEL = '.battery-grade';

  document.querySelectorAll(TRIGGER).forEach(trigger => {
    const bar = trigger.querySelector(BAR_SEL);
    const grade = trigger.querySelector(GRADE_SEL);

    if (!bar || !grade) return;

    const targetWidth = (bar.dataset.width || '0') + '%';
    let clickCount = 0;
    let isAnimating = false;

    trigger.addEventListener('click', () => {
      if (isAnimating) return;

      clickCount++;
      isAnimating = true;

      if (clickCount % 2 === 1) {
        // Odd click — open
        const tl = gsap.timeline({ onComplete: () => { isAnimating = false; } });
        tl.fromTo(bar,
          { width: 0 },
          { width: targetWidth, duration: 2, ease: 'expo.out' }
        );
        tl.fromTo(grade,
          { opacity: 0, scale: 1.5 },
          { opacity: 1, scale: 1, duration: 1, ease: 'power4.out' },
          1 // start at 1s (matches original delay)
        );
      } else {
        // Even click — close
        const tl = gsap.timeline({ onComplete: () => { isAnimating = false; } });
        tl.to(grade, { opacity: 0, scale: 1.5, duration: 0.4, ease: 'power2.in' });
        tl.to(bar, { width: 0, duration: 0.8, ease: 'power2.in' }, 0.2);
      }
    });
  });
})();
