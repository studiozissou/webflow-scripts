/* =========================================
   RHP — Homepage Intro Animation
   Only runs on fresh load of homepage (not when transitioning from case studies or about)
   Sequence: step text → dial ticks → nav + dial_layer-ui → bg video fade in
   ========================================= */
(() => {
  const HOME_INTRO_VERSION = '2026.2.11.1';
  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  const T = {
    bars: 96,
    tickDuration: 0.7,
    dialTotalDuration: 8, // 4x slower than original 2s
    tickStagger: 0 // computed
  };
  T.tickStagger = (T.dialTotalDuration - T.tickDuration) / Math.max(1, T.bars - 1);

  // 12 o'clock = first tick in clockwise order (canvas: i=0 is 3 o'clock; 12 o'clock = 3/4 around)
  const TWELVE_OCLOCK_INDEX = Math.floor((3 / 4) * T.bars); // 72 for 96 bars

  const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.matchMedia('(hover: none), (pointer: coarse)').matches;

  RHP.homeIntro = (() => {
    let splitInstance = null;
    let hasRun = false;

    function getStepEl(container) {
      return container?.querySelector('[data-text="step"]') ||
        container?.querySelector('.heading-style-h7.is-step') ||
        document.querySelector('[data-text="step"]') ||
        document.querySelector('.heading-style-h7.is-step');
    }

    function setInitialState(container) {
      const scope = document.querySelector('[data-barba="wrapper"]') || document.body;
      const comp = container?.querySelector('.dial_component') || document.querySelector('.dial_component');
      const dialUi = comp?.querySelector('.dial_layer-ui');
      const nav = scope?.querySelector('.nav');
      const dialTicks = comp?.querySelector('.dial_layer-ticks');
      const dialFg = comp?.querySelector('.dial_layer-fg');
      const bgVideo = comp?.querySelector('.dial_bg-video');
      const stepEl = getStepEl(container);

      // Dial and nav hidden
      if (nav) {
        nav.style.opacity = '0';
        nav.style.visibility = 'hidden';
        nav.style.pointerEvents = 'none';
      }
      if (dialTicks) dialTicks.style.opacity = '0';
      if (dialFg) dialFg.style.opacity = '0';
      if (bgVideo && window.gsap) {
        window.gsap.set(bgVideo, { opacity: 0, filter: 'blur(0px)' });
      }

      // .dial_layer-ui opacity 0
      if (dialUi) window.gsap?.set(dialUi, { opacity: 0 });

      // Background black - overlay or set dial_layer-bg
      const bgLayer = comp?.querySelector('.dial_layer-bg');
      if (bgLayer) window.gsap?.set(bgLayer, { backgroundColor: '#000' });

      // Step text hidden initially (will be revealed via SplitText)
      if (stepEl) window.gsap?.set(stepEl, { opacity: 0 });
    }

    function revealStepText(container, gsap, SplitText) {
      const stepEl = getStepEl(container);
      if (!stepEl || !SplitText) return Promise.resolve();

      return new Promise((resolve) => {
        try {
          const split = new SplitText(stepEl, { type: 'words,lines', linesClass: 'home-intro-line', wordsClass: 'home-intro-word' });
          splitInstance = split;

          if (split.lines) {
            split.lines.forEach((line) => { line.style.overflow = 'hidden'; });
          }
          if (split.words && split.words.length) {
            gsap.set(split.words, { yPercent: 100, opacity: 0 });
          }

          gsap.to(stepEl, { opacity: 1, duration: 0.4, ease: 'power4.out' });
          gsap.to(split.words, {
            yPercent: 0,
            opacity: 1,
            duration: 0.4,
            ease: 'power4.out',
            stagger: 0.15,
            onComplete: resolve
          });
        } catch (e) {
          stepEl.style.opacity = '1';
          resolve();
        }
      });
    }

    function fadeInBgVideo(container) {
      const comp = container?.querySelector('.dial_component') || document.querySelector('.dial_component');
      const bgVideo = comp?.querySelector('.dial_bg-video');
      if (!bgVideo || !window.gsap) return Promise.resolve();

      return new Promise((resolve) => {
        const onReady = () => {
          bgVideo.removeEventListener('canplay', onReady);
          bgVideo.removeEventListener('loadeddata', onReady);
          const gsap = window.gsap;
          gsap.to(bgVideo, { opacity: 1, duration: 0.2, ease: 'linear', onComplete: resolve });
          try { bgVideo.play(); } catch (e) {}
        };
        if (bgVideo.readyState >= 2) {
          onReady();
        } else {
          bgVideo.addEventListener('canplay', onReady, { once: true });
          bgVideo.addEventListener('loadeddata', onReady, { once: true });
        }
      });
    }

    function runDialTickAnimation(container) {
      const comp = container?.querySelector('.dial_component') || document.querySelector('.dial_component');
      const dialTicks = comp?.querySelector('.dial_layer-ticks');
      const dialFg = comp?.querySelector('.dial_layer-fg');
      if (!dialTicks || !window.gsap || !RHP.workDial) return Promise.resolve();

      // Make dial visible so tick scale animation can be seen
      dialTicks.style.opacity = '1';
      if (dialFg && !isMobile()) dialFg.style.opacity = '0'; // keep fg at 0 until hover enabled

      // Ensure work-dial has intro progress object
      RHP._dialIntroProgress = RHP._dialIntroProgress || { time: 0 };

      const gsap = window.gsap;
      const reduced = prefersReduced();
      const dur = reduced ? 0 : T.dialTotalDuration;
      const ease = reduced ? 'linear' : 'expo.out';

      return new Promise((resolve) => {
        gsap.to(RHP._dialIntroProgress, {
          time: T.dialTotalDuration,
          duration: dur,
          ease,
          overwrite: true,
          onComplete: () => {
            RHP.workDial.setIntroComplete?.();
            resolve();
          }
        });
      });
    }

    function runNavAnimation(scope) {
      const gsap = window.gsap;
      if (!gsap) return Promise.resolve();

      const logoLink = scope?.querySelector('.nav_logo-link');
      const aboutLink = scope?.querySelector('.nav_about-link');
      const contactLink = scope?.querySelector('.nav_contact-link');
      const dialUi = document.querySelector('.dial_layer-ui');

      const nav = scope?.querySelector('.nav');
      if (nav) {
        nav.style.visibility = '';
        nav.style.opacity = '1';
        nav.style.pointerEvents = '';
      }

      const DUR = 0.7;
      const EASE_TRANSLATE = 'power3.out';
      const EASE_OPACITY = 'linear';

      // Logo: from above (y -100% -> 0)
      if (logoLink) {
        gsap.set(logoLink, { yPercent: -100, opacity: 0 });
      }
      // About: from left (x -100% -> 0)
      if (aboutLink) {
        gsap.set(aboutLink, { xPercent: -100, opacity: 0 });
      }
      // Contact: from right (x 100% -> 0)
      if (contactLink) {
        gsap.set(contactLink, { xPercent: 100, opacity: 0 });
      }

      // Stagger: each begins when previous has finished (sequential)
      const tl = gsap.timeline();
      tl.to(logoLink, { yPercent: 0, duration: DUR, ease: EASE_TRANSLATE })
        .to(logoLink, { opacity: 1, duration: DUR, ease: EASE_OPACITY }, '<')
        .to(aboutLink, { xPercent: 0, duration: DUR, ease: EASE_TRANSLATE })
        .to(aboutLink, { opacity: 1, duration: DUR, ease: EASE_OPACITY }, '<')
        .to(contactLink, { xPercent: 0, duration: DUR, ease: EASE_TRANSLATE })
        .to(contactLink, { opacity: 1, duration: DUR, ease: EASE_OPACITY }, '<');

      if (dialUi) {
        tl.to(dialUi, { opacity: 1, duration: 0.3, ease: 'linear' }, 0);
      }

      return tl.then ? tl.then() : new Promise((r) => tl.eventCallback('onComplete', r));
    }

    function resetToVisible(container) {
      const scope = document.querySelector('[data-barba="wrapper"]') || document.body;
      const comp = container?.querySelector('.dial_component') || document.querySelector('.dial_component');
      const nav = scope?.querySelector('.nav');
      const dialUi = comp?.querySelector('.dial_layer-ui');
      const dialTicks = comp?.querySelector('.dial_layer-ticks');
      const bgVideo = comp?.querySelector('.dial_bg-video');
      const dialFg = comp?.querySelector('.dial_layer-fg');
      const stepEl = getStepEl(container);

      if (nav) {
        nav.style.visibility = '';
        nav.style.opacity = '';
        nav.style.pointerEvents = '';
      }
      if (dialUi) window.gsap?.set(dialUi, { opacity: 1 });
      if (dialTicks) dialTicks.style.opacity = '1';
      if (bgVideo) window.gsap?.set(bgVideo, { opacity: 1 });
      if (dialFg && isMobile()) window.gsap?.set(dialFg, { opacity: 1 });
      if (stepEl) window.gsap?.set(stepEl, { opacity: 1 });

      const logoLink = scope?.querySelector('.nav_logo-link');
      const aboutLink = scope?.querySelector('.nav_about-link');
      const contactLink = scope?.querySelector('.nav_contact-link');
      if (logoLink) window.gsap?.set(logoLink, { yPercent: 0, opacity: 1 });
      if (aboutLink) window.gsap?.set(aboutLink, { xPercent: 0, opacity: 1 });
      if (contactLink) window.gsap?.set(contactLink, { xPercent: 0, opacity: 1 });
    }

    return {
      version: HOME_INTRO_VERSION,

      run(container) {
        if (hasRun) return;
        const gsap = window.gsap;
        const SplitText = window.SplitText;
        if (!gsap) {
          if (RHP.views?.home?.init) RHP.views.home.init(container);
          return;
        }

        hasRun = true;
        const scope = document.querySelector('[data-barba="wrapper"]') || document.body;

        // Ensure work-dial has intro progress for tick scale animation (starts at 0)
        RHP._dialIntroProgress = { time: 0 };

        setInitialState(container);

        // Wait for scripts to be ready (init has already run by the time orchestrator calls us)
        const scriptsReady = () => RHP.scriptsOk === true;

        const run = async () => {
          await revealStepText(container, gsap, SplitText);

          // When scripts ready, animate dial ticks
          if (!scriptsReady()) {
            await new Promise((r) => {
              const check = () => {
                if (scriptsReady()) return r();
                requestAnimationFrame(check);
              };
              check();
            });
          }

          await runDialTickAnimation(container);
          await runNavAnimation(scope);

          // Video plays once all other animations are done
          await fadeInBgVideo(container);
        };

        run().catch(console.error);
      },

      skip(container) {
        hasRun = true;
        resetToVisible(container);
        RHP.workDial?.setIntroComplete?.();
      },

      destroy() {
        if (splitInstance) {
          try {
            if (splitInstance.revert) splitInstance.revert();
          } catch (e) {}
          splitInstance = null;
        }
      }
    };
  })();
})();
