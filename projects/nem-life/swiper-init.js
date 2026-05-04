/**
 * NEM Life — Swiper Instances
 * Hero slider (fade, autoplay) + Articles slider (multi-slide, navigation).
 *
 * Fixes vs previous version:
 * - Pagination + navigation use scoped DOM references (not global CSS selectors)
 *   so they bind to the correct section when duplicates exist.
 * - Empty DynamoWrapper slides (w-dyn-empty) are removed before init.
 * - Cards are equalised to the tallest slide height.
 */
(() => {
  /* ── Hero ── */
  const heroEl = document.querySelector('.swiper.is--hero');
  if (heroEl) {
    new Swiper('.swiper.is--hero', {
      direction: 'horizontal',
      loop: true,
      slidesPerView: 1,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      autoplay: { delay: 6000 },
      pagination: {
        el: '.hero-pagination',
        bulletClass: 'hero_pagination-dot',
        bulletActiveClass: 'is--active',
        clickable: true,
      },
    });
  }

  /* ── Articles (supports multiple instances per page) ── */
  const equaliseFns = [];

  document.querySelectorAll('.swiper.articles').forEach((articlesEl) => {
    const wrap = articlesEl.closest('.content-wrap');
    if (!wrap) return;

    /* Remove empty CMS slides before Swiper sees them */
    articlesEl
      .querySelectorAll(':scope > .swiper-wrapper > .swiper-slide')
      .forEach((slide) => {
        if (slide.querySelector('.w-dyn-empty')) slide.remove();
      });

    /* Scope navigation + pagination to the shared parent */
    const pagEl = wrap.querySelector('.articles_pagination-wrap');
    const nextEl = wrap.querySelector('.articles--next');
    const prevEl = wrap.querySelector('.articles--prev');

    if (pagEl) pagEl.innerHTML = '';

    new Swiper(articlesEl, {
      direction: 'horizontal',
      loop: false,
      slidesPerView: 'auto',
      spaceBetween: 24,
      breakpoints: {
        991: {
          slidesPerView: 3,
          spaceBetween: 44,
        },
      },
      pagination: {
        el: pagEl,
        bulletClass: 'articles_pagination-dot',
        bulletActiveClass: 'is--active',
        clickable: true,
      },
      navigation: {
        nextEl,
        prevEl,
        disabledClass: 'is--disabled',
      },
    });

    /* Equalise card heights to the tallest visible slide */
    function equaliseCards() {
      const slides = Array.from(
        articlesEl.querySelectorAll(':scope > .swiper-wrapper > .swiper-slide')
      );
      slides.forEach((s) => {
        const card =
          s.querySelector('.article-card_slide') ||
          s.querySelector('.w-dyn-items');
        if (card) card.style.height = '';
      });
      const maxH = Math.max(
        ...slides.map((s) => s.offsetHeight).filter(Boolean)
      );
      if (maxH) {
        slides.forEach((s) => {
          const card =
            s.querySelector('.article-card_slide') ||
            s.querySelector('.w-dyn-items');
          if (card) card.style.height = maxH + 'px';
        });
      }
    }

    equaliseCards();
    equaliseFns.push(equaliseCards);
  });

  if (equaliseFns.length) {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => equaliseFns.forEach((fn) => fn()), 150);
    });
  }
})();
