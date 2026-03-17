/* =========================================
   RHP — Video Loader Module
   Lottie loading spinner on all visible videos.
   - Home FG: .dial_fg-video inside #fg-video-wrap
   - Work/case: [data-barba="container"] video (skip pool/hidden)
   - MutationObserver on #fg-video-wrap for pool swaps
   - prefers-reduced-motion: CSS-only fallback spinner
   ========================================= */
(() => {
  const VIDEO_LOADER_VERSION = '2026.3.17.1';
  const DEBUG = false;

  const LOTTIE_URL = 'https://cdn.prod.website-files.com/641ab9fdf6e779f347e7e659/642558fa09463525f4cc1053_spinner1-white.json';

  window.RHP = window.RHP || {};
  const RHP = window.RHP;

  const _spinnerMap = new Map(); // videoEl -> { wrapper, lottie, listeners }
  let _observer = null;
  let _reducedMotion = false;

  function _isPoolOrHidden(videoEl) {
    if (!videoEl) return true;
    const style = videoEl.style;
    // Pool elements: opacity 0, dimensions <= 1px, off-screen
    if (style.opacity === '0') return true;
    if (style.left === '-9999px') return true;
    const rect = videoEl.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return true;
    // Skip generic video and bg video
    if (videoEl.classList.contains('dial_generic-video')) return true;
    if (videoEl.classList.contains('dial_bg-video')) return true;
    return false;
  }

  function _findPositionedParent(el) {
    let parent = el.parentElement;
    while (parent) {
      const pos = getComputedStyle(parent).position;
      if (pos === 'relative' || pos === 'absolute' || pos === 'fixed' || pos === 'sticky') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return el.parentElement;
  }

  function _showSpinner(wrapper) {
    if (wrapper) wrapper.classList.add('is-active');
  }

  function _hideSpinner(wrapper) {
    if (wrapper) wrapper.classList.remove('is-active');
  }

  function _activateSpinner(wrapper, anim) {
    _showSpinner(wrapper);
    if (anim) try { anim.play(); } catch (_) { /* lottie resilience */ }
  }

  function _deactivateSpinner(wrapper, anim) {
    _hideSpinner(wrapper);
    if (anim) try { anim.pause(); } catch (_) { /* lottie resilience */ }
  }

  function attachSpinner(videoEl) {
    if (!videoEl || _spinnerMap.has(videoEl)) return;

    const parent = _findPositionedParent(videoEl);
    if (!parent) return;

    const wrapper = document.createElement('div');
    wrapper.setAttribute('aria-hidden', 'true');
    let lottieAnim = null;

    if (_reducedMotion) {
      wrapper.className = 'rhp-video-spinner-fallback';
    } else {
      wrapper.className = 'rhp-video-spinner';

      // Load Lottie animation if lottie-web is available
      if (typeof lottie !== 'undefined') {
        try {
          lottieAnim = lottie.loadAnimation({
            container: wrapper,
            renderer: 'svg',
            loop: true,
            autoplay: false,
            path: LOTTIE_URL
          });
        } catch (e) {
          DEBUG && console.log('[video-loader] Lottie load error:', e);
        }
      }
    }

    parent.appendChild(wrapper);

    // Event listeners
    const onWaiting = () => _activateSpinner(wrapper, lottieAnim);
    const onPlaying = () => _deactivateSpinner(wrapper, lottieAnim);
    const onCanPlay = () => _deactivateSpinner(wrapper, lottieAnim);
    const onError = () => _deactivateSpinner(wrapper, lottieAnim);

    videoEl.addEventListener('waiting', onWaiting);
    videoEl.addEventListener('playing', onPlaying);
    videoEl.addEventListener('canplay', onCanPlay);
    videoEl.addEventListener('error', onError);

    _spinnerMap.set(videoEl, {
      wrapper,
      lottie: lottieAnim,
      listeners: { onWaiting, onPlaying, onCanPlay, onError }
    });

    // If video is currently buffering, show spinner immediately
    if (videoEl.readyState < 2 && !videoEl.paused) {
      _activateSpinner(wrapper, lottieAnim);
    }

    DEBUG && console.log('[video-loader] Attached spinner to', videoEl.className || videoEl.tagName);
  }

  function detachSpinner(videoEl) {
    if (!videoEl || !_spinnerMap.has(videoEl)) return;
    const entry = _spinnerMap.get(videoEl);

    // Remove event listeners
    videoEl.removeEventListener('waiting', entry.listeners.onWaiting);
    videoEl.removeEventListener('playing', entry.listeners.onPlaying);
    videoEl.removeEventListener('canplay', entry.listeners.onCanPlay);
    videoEl.removeEventListener('error', entry.listeners.onError);

    // Destroy Lottie
    if (entry.lottie) {
      try { entry.lottie.destroy(); } catch (e) {}
    }

    // Remove DOM
    if (entry.wrapper && entry.wrapper.parentNode) {
      entry.wrapper.parentNode.removeChild(entry.wrapper);
    }

    _spinnerMap.delete(videoEl);
    DEBUG && console.log('[video-loader] Detached spinner from', videoEl.className || videoEl.tagName);
  }

  function _onFgWrapMutation(mutations) {
    for (const mutation of mutations) {
      // Detach spinners from removed video nodes
      for (const node of mutation.removedNodes) {
        if (node.nodeType === 1 && node.tagName === 'VIDEO') {
          detachSpinner(node);
        }
      }
      // Attach spinners to added video nodes (pool swaps)
      // Don't use _isPoolOrHidden here — pool swap sets opacity:0 via seekMaskReveal
      // before MutationObserver fires. Anything added to #fg-video-wrap is a real FG video.
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1 && node.tagName === 'VIDEO'
            && !node.classList.contains('dial_generic-video')
            && !node.classList.contains('dial_bg-video')) {
          attachSpinner(node);
        }
      }
    }
  }

  function init(container) {
    // No _initialized guard — destroy() is always called before init() on Barba transitions,
    // and attachSpinner already deduplicates per-element via _spinnerMap.has()
    destroy(); // defensive: clean up any stale state from a previous cycle
    _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const root = container || document;

    // Pass 1: Home FG video in #fg-video-wrap
    const fgWrap = document.getElementById('fg-video-wrap');
    if (fgWrap) {
      const fgVideos = fgWrap.querySelectorAll('.dial_fg-video');
      fgVideos.forEach(v => {
        if (!_isPoolOrHidden(v)) attachSpinner(v);
      });

      // MutationObserver for pool swaps
      _observer = new MutationObserver(_onFgWrapMutation);
      _observer.observe(fgWrap, { childList: true });
    }

    // Pass 2: Container videos (case/work pages)
    const barbaContainer = root.querySelector ? root.querySelector('[data-barba="container"]') : null;
    if (barbaContainer) {
      const videos = barbaContainer.querySelectorAll('video');
      videos.forEach(v => {
        // Skip pool elements (hidden, off-screen, tiny)
        if (_isPoolOrHidden(v)) return;
        // Skip if already tracked (home FG pass)
        if (_spinnerMap.has(v)) return;
        attachSpinner(v);
      });
    }

    DEBUG && console.log('[video-loader] init complete, tracking', _spinnerMap.size, 'videos');
  }

  function destroy() {

    // Disconnect observer
    if (_observer) {
      _observer.disconnect();
      _observer = null;
    }

    // Detach all spinners (collect keys first to avoid mutation during iteration)
    const videos = Array.from(_spinnerMap.keys());
    for (const videoEl of videos) {
      detachSpinner(videoEl);
    }
    _spinnerMap.clear(); // safety net: ensure empty even if detachSpinner missed an entry

    DEBUG && console.log('[video-loader] destroyed');
  }

  RHP.videoLoader = { init, destroy, version: VIDEO_LOADER_VERSION };
})();
