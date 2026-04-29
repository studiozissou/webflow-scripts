(() => {
  'use strict';

  const VERSION = '2026.4.29.3';
  let active = false;
  let observers = [];
  let trackedSliders = [];
  let cleanupFns = [];

  function measureContentHeight(slide) {
    let h = 0;
    for (let i = 0; i < slide.children.length; i++) {
      h += slide.children[i].offsetHeight;
    }
    return h;
  }

  function hasUnloadedImages(slide) {
    const imgs = slide.querySelectorAll('img');
    for (let i = 0; i < imgs.length; i++) {
      if (!imgs[i].complete || imgs[i].naturalHeight === 0) return true;
    }
    return false;
  }

  function updateSliderHeight(slider) {
    if (!active) return;
    const slides = slider.querySelectorAll('.w-slide');
    for (let i = 0; i < slides.length; i++) {
      // Webflow removes aria-hidden from active slide or sets it to "false"
      if (slides[i].getAttribute('aria-hidden') !== 'true') {
        // Skip if images haven't loaded — height would be wrong.
        // ResizeObserver will re-trigger when they load.
        if (hasUnloadedImages(slides[i])) return;
        slider.style.height = measureContentHeight(slides[i]) + 'px';
        break;
      }
    }
  }

  function init(container) {
    if (active) return;
    if (!container) return;
    active = true;

    const sliders = container.querySelectorAll('.about-slider');

    sliders.forEach(wrapper => {
      const slider = wrapper.closest('.w-slider') || wrapper.querySelector('.w-slider') || wrapper;
      const slides = slider.querySelectorAll('.w-slide');
      if (!slides.length) return;

      trackedSliders.push(slider);

      // Defer initial measurement: double-rAF ensures Barba-inserted container
      // has been laid out AND Webflow slider JS has re-initialized
      requestAnimationFrame(() => requestAnimationFrame(() => updateSliderHeight(slider)));

      // Observe each slide for aria-hidden attribute changes
      // Deferred via rAF to let Webflow finish slide transition before measuring
      slides.forEach(slide => {
        const observer = new MutationObserver(() => requestAnimationFrame(() => updateSliderHeight(slider)));
        observer.observe(slide, { attributes: true, attributeFilter: ['aria-hidden'] });
        observers.push(observer);
      });

      // ResizeObserver: re-measure when slide content resizes (lazy images, accordion open)
      const ro = new ResizeObserver(() => requestAnimationFrame(() => updateSliderHeight(slider)));
      slides.forEach(slide => ro.observe(slide));
      cleanupFns.push(() => ro.disconnect());
    });

    // Re-measure after fonts load (heights shift with web fonts)
    document.fonts.ready.then(() => {
      trackedSliders.forEach(updateSliderHeight);
    });

    // Re-measure on full page load (images may affect slide content height)
    const onLoad = () => trackedSliders.forEach(updateSliderHeight);
    window.addEventListener('load', onLoad, { once: true });
    cleanupFns.push(() => window.removeEventListener('load', onLoad));
  }

  function destroy() {
    if (!active) return;
    active = false;
    observers.forEach(obs => obs.disconnect());
    observers = [];
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];
    trackedSliders.forEach(slider => { slider.style.height = ''; });
    trackedSliders = [];
  }

  window.RHP = window.RHP || {};
  window.RHP.aboutSliderAutoheight = { init, destroy, version: VERSION };
})();
