/**
 * NEM Life — Dropdown Animation
 *
 * Replaces Webflow's native .w-dropdown open/close with GSAP fades.
 * Desktop: fade in/out (position absolute, no height change).
 * Mobile: fade + height animation to make vertical space in menu.
 */

(() => {
  const DEBUG = false;
  const MOBILE_BP = 768;
  const DURATION = 0.25;

  const dropdowns = document.querySelectorAll('.navbar-dropdown8_component.w-dropdown');
  if (!dropdowns.length) return;

  dropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector('.w-dropdown-toggle');
    const list = dropdown.querySelector('.w-dropdown-list');
    if (!toggle || !list) return;

    /* Disable Webflow's native dropdown behaviour */
    dropdown.removeAttribute('data-hover');
    dropdown.removeAttribute('data-delay');

    let open = false;
    let tween = null;

    function isMobile() {
      return window.innerWidth < MOBILE_BP;
    }

    function show() {
      if (open) return;
      open = true;
      dropdown.classList.add('w--open');
      toggle.setAttribute('aria-expanded', 'true');

      if (tween) tween.kill();

      if (isMobile()) {
        gsap.set(list, { display: 'block', overflow: 'hidden' });
        tween = gsap.fromTo(list, {
          height: 0,
          opacity: 0,
        }, {
          height: 'auto',
          opacity: 1,
          duration: DURATION,
          ease: 'power1.out',
        });
      } else {
        tween = gsap.fromTo(list, {
          display: 'block',
          opacity: 0,
        }, {
          opacity: 1,
          duration: DURATION,
          ease: 'power1.out',
        });
      }
      DEBUG && console.log('[dropdown-anim] show', toggle.textContent.trim());
    }

    function hide() {
      if (!open) return;
      open = false;
      toggle.setAttribute('aria-expanded', 'false');

      if (tween) tween.kill();

      const props = { opacity: 0, duration: DURATION, ease: 'power1.in' };

      if (isMobile()) {
        props.height = 0;
      }

      tween = gsap.to(list, {
        ...props,
        onComplete() {
          gsap.set(list, { display: 'none', clearProps: 'height,overflow' });
          dropdown.classList.remove('w--open');
        },
      });
      DEBUG && console.log('[dropdown-anim] hide', toggle.textContent.trim());
    }

    /* Toggle on click */
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (open) hide();
      else show();
    });

    /* Desktop: hover open/close */
    dropdown.addEventListener('mouseenter', () => {
      if (!isMobile()) show();
    });
    dropdown.addEventListener('mouseleave', () => {
      if (!isMobile()) hide();
    });

    /* Close when clicking outside */
    document.addEventListener('click', (e) => {
      if (open && !dropdown.contains(e.target)) hide();
    });

    /* Close on Escape */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) hide();
    });

    /* Ensure list starts hidden */
    gsap.set(list, { display: 'none', opacity: 0 });
  });
})();
