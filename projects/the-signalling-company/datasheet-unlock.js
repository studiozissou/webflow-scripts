// InnoTrans page module: places the brochure card in the datasheet grid, and keeps datasheet links on their email popup until one form succeeds, then lets every link open its PDF directly.
(() => {
  const KEY = 'tsc-datasheets-unlocked';
  const TRIGGER = '[data-link="datasheet-modal"]';
  const SUCCESS = '[data-modal="datasheet-wrapper"] .w-form-done';

  let unlocked = false;

  function readFlag() {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function writeFlag() {
    try {
      localStorage.setItem(KEY, '1');
    } catch (e) {}
  }

  function lock(links) {
    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      link.setAttribute('data-pdf', href);
      link.setAttribute('href', '#');
    });
  }

  function unlock(links) {
    if (unlocked) return;
    unlocked = true;
    links.forEach((link) => {
      const pdf = link.getAttribute('data-pdf');
      if (!pdf) return;
      link.setAttribute('href', pdf);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
      link.setAttribute('data-unlocked', '');
    });
  }

  function onClick(event) {
    const link = event.target && event.target.closest && event.target.closest(TRIGGER);
    if (!link) return;
    if (link.hasAttribute('data-unlocked')) event.stopPropagation();
    else event.preventDefault();
  }

  function watchSuccess(links) {
    document.querySelectorAll(SUCCESS).forEach((block) => {
      new MutationObserver(() => {
        if (block.style.display === 'none' || !block.style.display) return;
        writeFlag();
        unlock(links);
      }).observe(block, { attributes: true, attributeFilter: ['style'] });
    });
  }

  function placeBrochure() {
    const brochure = document.getElementById('brochure');
    const grid = document.getElementById('data-grid');
    if (!brochure || !grid) return;
    brochure.setAttribute('role', 'listitem');
    grid.appendChild(brochure);
  }

  function init() {
    placeBrochure();
    const links = Array.from(document.querySelectorAll(TRIGGER));
    if (!links.length) return;
    lock(links);
    window.addEventListener('click', onClick, true);
    watchSuccess(links);
    if (readFlag()) unlock(links);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
