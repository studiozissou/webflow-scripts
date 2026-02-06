/* =========================================
   RHP — Contact pullout (GSAP open/close)
   - .nav_contact-link opens, outside click or .nav_contact-close closes
   - 0.7s exponential easing each way
   ========================================= */
(() => {
  const DURATION = 0.7;
  const EASE = 'expo.out';

  let pullout = null;
  let contactLink = null;
  let closeBtn = null;
  let isOpen = false;
  let offClickBound = false;

  function open() {
    if (!pullout || !window.gsap) return;
    if (isOpen) return;
    isOpen = true;
    window.gsap.to(pullout, {
      xPercent: 0,
      duration: DURATION,
      ease: EASE,
      overwrite: true
    });
    scheduleOffClickListen();
  }

  function close() {
    if (!pullout || !window.gsap) return;
    if (!isOpen) return;
    isOpen = false;
    window.gsap.to(pullout, {
      xPercent: 100,
      duration: DURATION,
      ease: EASE,
      overwrite: true
    });
    removeOffClickListen();
  }

  function shouldCloseOnClick(target) {
    if (!target || !pullout) return true;
    if (pullout.contains(target)) {
      // Inside pullout: close only if click is on the close button
      return closeBtn && closeBtn.contains(target);
    }
    return true; // Outside pullout → close
  }

  function onDocumentClick(e) {
    if (!isOpen) return;
    if (shouldCloseOnClick(e.target)) {
      close();
    }
  }

  function scheduleOffClickListen() {
    if (offClickBound) return;
    offClickBound = true;
    setTimeout(() => {
      document.addEventListener('click', onDocumentClick, true);
    }, 0);
  }

  function removeOffClickListen() {
    if (!offClickBound) return;
    offClickBound = false;
    document.removeEventListener('click', onDocumentClick, true);
  }

  function bind() {
    const scope = document.querySelector('[data-barba="wrapper"]') || document.body;
    pullout = scope.querySelector('.nav_contact-pullout');
    contactLink = scope.querySelector('.nav_contact-link');
    closeBtn = scope.querySelector('.nav_contact-close');

    if (!pullout) return;

    if (contactLink) {
      contactLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        open();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        close();
      });
    }
  }

  function init() {
    bind();
  }

  // Re-bind after Barba in case nav/pullout DOM was replaced
  window.addEventListener('rhp:barba:afterenter', () => {
    removeOffClickListen();
    isOpen = false;
    bind();
  });

  const ready = () => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      init();
    } else {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    }
  };

  ready();
})();
