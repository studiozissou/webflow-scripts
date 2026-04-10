/* =========================================
   RHP — Homepage Intro (dial stays LOCKED through intro)
   The visual intro is owned by home-scroll-morph.js. On fresh load the dial
   is locked idle in .home_dial-start (dial-small, no fg video, no project
   switching). run() only marks the scope classes + fires the event so the
   scroll morph can init — it does NOT unlock the dial. The dial is unlocked
   by home-scroll-morph on morph-complete (after the user has scrolled the
   100vh intro section and the scroll has locked).
   skip() is the Barba re-entry fast-path: jumps straight to the unlocked
   state without the scroll morph.
   ========================================= */
(() => {
  const HOME_INTRO_VERSION = '2026.4.10.1';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  RHP.homeIntro = (() => {
    let hasRun = false;

    function _markIntroComplete() {
      if (RHP.homeIntro) RHP.homeIntro.done = true;
      try {
        window.dispatchEvent(new CustomEvent('rhp:home-intro:complete'));
      } catch (e) {}
      // Only start Lenis if we're still on the home namespace — guards against
      // the intro throwing and completing after the user has navigated away.
      const onHome = !!document.querySelector('[data-barba-namespace="home"]');
      if (onHome && RHP.lenis?.start) RHP.lenis.start();
    }

    return {
      version: HOME_INTRO_VERSION,
      done: false,

      run(container) {
        if (hasRun) return;
        hasRun = true;

        const scope = document.querySelector('[data-barba="wrapper"]') || document.body;
        // rhp-cursor-ready: custom cursor can render. rhp-intro-started:
        // intro logo / dial-start CSS can fade in via :has() transitions.
        // NOTE: .rhp-home-ready is NOT added here — the dial, step text,
        // and nav items all stay hidden/locked until the scroll morph fires
        // onMorphComplete after the 100vh scrub completes.
        scope.classList.add('rhp-intro-started', 'rhp-cursor-ready');

        // Dial stays LOCKED: do NOT call setIntroComplete / setAttractionEnabled
        // / setInteractionUnlocked here. home-scroll-morph unlocks the dial on
        // morph complete.

        // Notify listeners — home-scroll-morph will init its ScrollTrigger here.
        _markIntroComplete();
      },

      skip(container) {
        // Barba re-entry fast-path: user has already seen the intro, jump to
        // the unlocked state. home-scroll-morph.skipToEnd() does the actual
        // dial-large + nav-visible state; we just flag the scope classes here.
        hasRun = true;
        const scope = document.querySelector('[data-barba="wrapper"]') || document.body;
        scope.classList.add('rhp-intro-started', 'rhp-cursor-ready', 'rhp-home-ready');
        RHP.workDial?.setIntroComplete?.();
        RHP.workDial?.setAttractionEnabled?.(true);
        RHP.workDial?.setInteractionUnlocked?.(true);
        _markIntroComplete();
      },

      destroy() {
        // Nothing to tear down — no listeners or timelines owned by this module.
      }
    };
  })();
})();
