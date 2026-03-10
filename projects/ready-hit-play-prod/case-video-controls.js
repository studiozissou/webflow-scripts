/* =========================================
   RHP — Case Video Controls
   Wires play/pause + mute/unmute icon pairs to video.video-cover
   in every .section_case-video block on case study pages.
   + Progress bar (clickable scrub)
   + Viewport auto-pause with volume fade (IntersectionObserver)
   + Auto-hide controls + cursor on mouse inactivity
   ========================================= */
(() => {
  const VERSION = '2026.3.10.1';
  window.RHP = window.RHP || {};

  const cleanups = [];
  const wiredVideos = new Set();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  let observer = null;

  /* ---- helpers ---- */
  /* gsap.context() not used here: tweens target injected DOM, video elements (volume),
     and shared cursor wrapper — all outside a single scoped container. Explicit
     killTweensOf per-target in cleanup handles teardown instead. */
  const gsap = () => window.gsap;

  function syncIcons(video, playPause, muteUnmute) {
    const playIcon   = playPause.querySelector('.is-play');
    const pauseIcon  = playPause.querySelector('.is-pause');
    const muteIcon   = muteUnmute.querySelector('.is-mute');
    const unmuteIcon = muteUnmute.querySelector('.is-unmute');

    if (playIcon)   playIcon.style.display   = video.paused  ? 'flex' : 'none';
    if (pauseIcon)  pauseIcon.style.display  = video.paused  ? 'none' : 'flex';
    if (muteIcon)   muteIcon.style.display   = video.muted   ? 'none' : 'flex';
    if (unmuteIcon) unmuteIcon.style.display = video.muted   ? 'flex' : 'none';
  }

  /* ---- IntersectionObserver callback ---- */
  function handleVisibility(entries) {
    entries.forEach((entry) => {
      const section = entry.target;
      const video = section.querySelector('video.video-cover');
      if (!video) return;

      if (!entry.isIntersecting) {
        /* --- scrolled out --- */
        if (video.paused) return;

        video._rhpSavedVolume = video.volume;
        video._rhpAutoPaused = true;

        if (!video.muted && !reducedMotion && gsap()) {
          gsap().killTweensOf(video, 'volume');
          gsap().to(video, {
            volume: 0,
            duration: 0.5,
            /* onComplete killed by killTweensOf on scroll-back-in — pause only fires if video stays out of view */
            onComplete() { video.pause(); }
          });
        } else {
          video.pause();
        }
      } else {
        /* --- scrolled back in --- */
        if (video._rhpUserPaused) return;
        if (!video._rhpAutoPaused) return;

        video._rhpAutoPaused = false;
        const savedVol = video._rhpSavedVolume ?? video.volume;

        video.play().catch(() => {});

        if (!video.muted && !reducedMotion && gsap()) {
          gsap().killTweensOf(video, 'volume');
          gsap().to(video, { volume: savedVol, duration: 0.5 });
        } else {
          video.volume = savedVol;
        }
      }
    });
  }

  /* ---- per-section wiring ---- */
  function wireSection(section) {
    const controlWrapper = section.querySelector('.case-video_control-wrapper');
    const video      = section.querySelector('video.video-cover');
    const playPause  = section.querySelector('.play-pause');
    const muteUnmute = section.querySelector('.mute-unmute');

    if (!video || !playPause || !muteUnmute || !controlWrapper) return;

    wiredVideos.add(video);
    syncIcons(video, playPause, muteUnmute);

    /* ======== 1. Play/Pause + userPaused flag ======== */
    const onPlayPauseClick = () => {
      if (video.paused) {
        video._rhpUserPaused = false;
        video.play().catch(() => {});
      } else {
        video._rhpUserPaused = true;
        video.pause();
      }
    };

    const onMuteUnmuteClick = () => {
      video.muted = !video.muted;
      syncIcons(video, playPause, muteUnmute);
    };

    const onPlayPause    = () => syncIcons(video, playPause, muteUnmute);
    const onVolumeChange = () => syncIcons(video, playPause, muteUnmute);

    playPause.addEventListener('click', onPlayPauseClick);
    muteUnmute.addEventListener('click', onMuteUnmuteClick);
    video.addEventListener('play',         onPlayPause);
    video.addEventListener('pause',        onPlayPause);
    video.addEventListener('volumechange', onVolumeChange);

    /* ======== 2. Progress bar ======== */
    const track = document.createElement('div');
    track.className = 'case-video_progress-track';
    track.setAttribute('data-cursor', 'dot');
    track.setAttribute('role', 'slider');
    track.setAttribute('aria-label', 'Video progress');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', '0');
    track.setAttribute('tabindex', '0');

    const hoverBar = document.createElement('div');
    hoverBar.className = 'case-video_progress-hover';

    const fill = document.createElement('div');
    fill.className = 'case-video_progress-fill';

    track.appendChild(hoverBar);
    track.appendChild(fill);
    section.appendChild(track);

    /* RAF progress loop */
    let rafId = null;
    function updateProgress() {
      if (isFinite(video.duration) && video.duration > 0) {
        const pct = (video.currentTime / video.duration) * 100;
        fill.style.width = pct + '%';
        track.setAttribute('aria-valuenow', String(Math.round(pct)));
      }
      rafId = requestAnimationFrame(updateProgress);
    }
    rafId = requestAnimationFrame(updateProgress);

    /* Keyboard scrub (arrow keys ±5s) */
    const SEEK_STEP = 5;
    const onTrackKeyDown = (e) => {
      if (!isFinite(video.duration)) return;
      if (e.key === 'ArrowRight') {
        video.currentTime = Math.min(video.duration, video.currentTime + SEEK_STEP);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        video.currentTime = Math.max(0, video.currentTime - SEEK_STEP);
        e.preventDefault();
      }
    };
    track.addEventListener('keydown', onTrackKeyDown);

    /* Hover preview */
    const onTrackMouseMove = (e) => {
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      hoverBar.style.width = pct + '%';
    };
    const onTrackMouseLeave = () => { hoverBar.style.width = '0'; };

    /* Click to seek (stopPropagation prevents mobile tap-to-toggle firing) */
    const onTrackClick = (e) => {
      e.stopPropagation();
      if (!isFinite(video.duration)) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      video.currentTime = pct * video.duration;
    };

    track.addEventListener('mousemove', onTrackMouseMove);
    track.addEventListener('mouseleave', onTrackMouseLeave);
    track.addEventListener('click', onTrackClick);

    /* ======== 3. Viewport auto-pause (observer) ======== */
    if (observer) {
      observer.observe(section);
    }

    /* ======== 4. Auto-hide controls ======== */
    let idleTimer = null;
    let controlsHidden = false;
    const cursorWrapper = document.querySelector('.cursor_dot-wrapper');

    function showControls() {
      if (!controlsHidden) return;
      controlsHidden = false;

      if (gsap()) {
        gsap().killTweensOf(controlWrapper);
        gsap().killTweensOf(track);
        gsap().to(controlWrapper, { opacity: 1, duration: reducedMotion ? 0 : 0.3 });
        gsap().to(track, { opacity: 1, duration: reducedMotion ? 0 : 0.3 });
        if (cursorWrapper) {
          gsap().killTweensOf(cursorWrapper);
          gsap().to(cursorWrapper, { opacity: 1, duration: reducedMotion ? 0 : 0.3 });
        }
      } else {
        controlWrapper.style.opacity = '1';
        track.style.opacity = '1';
      }
    }

    function hideControls() {
      if (controlsHidden) return;
      controlsHidden = true;

      if (gsap()) {
        gsap().killTweensOf(controlWrapper);
        gsap().killTweensOf(track);
        gsap().to(controlWrapper, { opacity: 0, duration: reducedMotion ? 0 : 0.4 });
        gsap().to(track, { opacity: 0, duration: reducedMotion ? 0 : 0.4 });
        if (cursorWrapper) {
          gsap().killTweensOf(cursorWrapper);
          gsap().to(cursorWrapper, { opacity: 0, duration: reducedMotion ? 0 : 0.4 });
        }
      } else {
        controlWrapper.style.opacity = '0';
        track.style.opacity = '0';
      }
    }

    function resetIdleTimer(delay) {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(hideControls, delay);
    }

    if (!isMobile) {
      /* --- Desktop: mousemove / mouseleave --- */
      const IDLE_DELAY = 2000;

      const onSectionMouseMove = () => {
        showControls();
        resetIdleTimer(IDLE_DELAY);
      };

      const onSectionMouseLeave = () => {
        clearTimeout(idleTimer);
        idleTimer = null;
        showControls();
      };

      section.addEventListener('mousemove', onSectionMouseMove);
      section.addEventListener('mouseleave', onSectionMouseLeave);

      /* Start idle timer immediately */
      resetIdleTimer(IDLE_DELAY);

      cleanups.push(() => {
        section.removeEventListener('mousemove', onSectionMouseMove);
        section.removeEventListener('mouseleave', onSectionMouseLeave);
      });
    } else {
      /* --- Mobile: tap to toggle --- */
      const MOBILE_IDLE_DELAY = 3000;

      const onSectionTap = () => {
        if (controlsHidden) {
          showControls();
          resetIdleTimer(MOBILE_IDLE_DELAY);
        } else {
          hideControls();
          clearTimeout(idleTimer);
          idleTimer = null;
        }
      };

      /* Prevent control taps from toggling visibility */
      const stopProp = (e) => { e.stopPropagation(); };
      controlWrapper.addEventListener('click', stopProp);

      section.addEventListener('click', onSectionTap);

      /* Start auto-hide timer */
      resetIdleTimer(MOBILE_IDLE_DELAY);

      cleanups.push(() => {
        section.removeEventListener('click', onSectionTap);
        controlWrapper.removeEventListener('click', stopProp);
      });
    }

    /* ======== Cleanup registration ======== */
    cleanups.push(() => {
      /* RAF */
      cancelAnimationFrame(rafId);
      rafId = null;

      /* Idle timer */
      clearTimeout(idleTimer);
      idleTimer = null;

      /* Event listeners */
      playPause.removeEventListener('click', onPlayPauseClick);
      muteUnmute.removeEventListener('click', onMuteUnmuteClick);
      video.removeEventListener('play',         onPlayPause);
      video.removeEventListener('pause',        onPlayPause);
      video.removeEventListener('volumechange', onVolumeChange);

      track.removeEventListener('mousemove', onTrackMouseMove);
      track.removeEventListener('mouseleave', onTrackMouseLeave);
      track.removeEventListener('click', onTrackClick);
      track.removeEventListener('keydown', onTrackKeyDown);

      /* GSAP tweens on this section's elements */
      if (gsap()) {
        gsap().killTweensOf(video, 'volume');
        gsap().killTweensOf(controlWrapper);
        gsap().killTweensOf(track);
      }

      /* Reset control/track opacity */
      controlWrapper.style.opacity = '';
      track.style.opacity = '';

      /* Reset cursor wrapper opacity (shared element — safe to restore) */
      if (cursorWrapper) {
        if (gsap()) gsap().killTweensOf(cursorWrapper);
        cursorWrapper.style.opacity = '';
      }

      /* Remove injected DOM */
      track.remove();

      /* Clear video flags */
      delete video._rhpUserPaused;
      delete video._rhpAutoPaused;
      delete video._rhpSavedVolume;

      /* Unobserve */
      if (observer) observer.unobserve(section);
    });
  }

  /* ---- module API ---- */
  function init(container) {
    const ctx = container || document;

    /* Create IntersectionObserver once */
    if (!observer) {
      observer = new IntersectionObserver(handleVisibility, { threshold: 0.3 });
    }

    const sections = ctx.querySelectorAll('.section_case-video');
    sections.forEach(wireSection);
  }

  function destroy() {
    cleanups.forEach(fn => fn());
    cleanups.length = 0;

    /* Kill volume tweens for any remaining wired videos */
    if (gsap()) {
      wiredVideos.forEach((video) => {
        gsap().killTweensOf(video, 'volume');
      });
    }
    wiredVideos.clear();

    /* Disconnect observer */
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  window.RHP.caseVideoControls = { init, destroy, version: VERSION };
})();
