/* =========================================
   RHP — Overland AI case study (page-specific)
   - Grid hover: dim other items, show cover image (desktop ≥992px)
   - Benefit video autoplay: play when mobile dropdown opens, pause when closes
   - Loaded only on /case-studies/overland-ai
   ========================================= */
(() => {
  window.RHP = window.RHP || {};

  function isOverlandPage() {
    return /\/case-studies\/overland-ai(\/|$)/.test(window.location.pathname);
  }

  function initGridHover(container) {
    const ctx = container || document;
    const $ = window.jQuery || window.$;
    if (!$) return;

    const gridItems = ctx.querySelectorAll('.grid_grid-content');
    if (!gridItems.length) return;

    $(gridItems).off('mouseenter mouseleave');

    if ($(window).width() >= 992) {
      $(gridItems).on('mouseenter', function() {
        $('.grid_grid-content', ctx).not(this).css('opacity', 0);
        $(this).closest('.grid_grid-item-wrapper').find('.grid_cover-image').css('opacity', 1);
      }).on('mouseleave', function() {
        $('.grid_grid-content', ctx).css('opacity', 1);
        $(this).closest('.grid_grid-item-wrapper').find('.grid_cover-image').css('opacity', 0);
      });
    }
  }

  const benefitObservers = [];

  function initBenefitVideoAutoplay(container) {
    const ctx = container || document;
    benefitObservers.forEach((o) => o.disconnect());
    benefitObservers.length = 0;

    const dropdowns = ctx.querySelectorAll('.benefits_dropdown-list-mobile');
    if (!dropdowns.length) return;

    function handleClassChange(mutationsList) {
      for (let i = 0; i < mutationsList.length; i++) {
        const mutation = mutationsList[i];
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const targetElement = mutation.target;
          const video = targetElement.querySelector('.grid_cover-image-mobile > video');
          const button = targetElement.querySelector('.grid_cover-image-mobile > div > button');

          if (video && button) {
            if (targetElement.classList.contains('w--open') && video.paused) {
              button.click();
            } else if (!targetElement.classList.contains('w--open') && !video.paused) {
              button.click();
            }
          }
        }
      }
    }

    dropdowns.forEach((dropdown) => {
      const observer = new MutationObserver(handleClassChange);
      observer.observe(dropdown, {
        attributes: true,
        attributeFilter: ['class']
      });
      benefitObservers.push(observer);
    });
  }

  function init(container) {
    if (!isOverlandPage()) return;
    initGridHover(container);
    initBenefitVideoAutoplay(container);
  }

  RHP.overlandAI = { init, isOverlandPage };

  function onReady() {
    init(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  window.addEventListener('rhp:barba:afterenter', (e) => {
    const container = e.detail && e.detail.container;
    init(container || document);
  });
})();
