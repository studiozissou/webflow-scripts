(() => {
  'use strict';

  const VERSION = '2026.4.20.1';
  let active = false;
  let observers = [];
  let trackedSliders = [];

  function measureContentHeight(slide) {
    let h = 0;
    for (let i = 0; i < slide.children.length; i++) {
      h += slide.children[i].offsetHeight;
    }
    return h;
  }

  function updateSliderHeight(slider) {
    const slides = slider.querySelectorAll('.w-slide');
    for (let i = 0; i < slides.length; i++) {
      // Webflow removes aria-hidden from active slide or sets it to "false"
      if (slides[i].getAttribute('aria-hidden') !== 'true') {
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

      // Set initial height
      updateSliderHeight(slider);

      // Observe each slide for aria-hidden attribute changes
      // Deferred via rAF to let Webflow finish slide transition before measuring
      slides.forEach(slide => {
        const observer = new MutationObserver(() => requestAnimationFrame(() => updateSliderHeight(slider)));
        observer.observe(slide, { attributes: true, attributeFilter: ['aria-hidden'] });
        observers.push(observer);
      });
    });
  }

  function destroy() {
    if (!active) return;
    active = false;
    observers.forEach(obs => obs.disconnect());
    observers = [];
    trackedSliders.forEach(slider => { slider.style.height = ''; });
    trackedSliders = [];
  }

  window.RHP = window.RHP || {};
  window.RHP.aboutSliderAutoheight = { init, destroy, version: VERSION };
})();
