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

  /* ── Articles ── */
  const articlesEl = document.querySelector('.swiper.articles');
  if (!articlesEl) return;

  const section = articlesEl.closest('.section-yellow');
  if (!section) return;

  /* Remove empty CMS slides before Swiper sees them */
  articlesEl
    .querySelectorAll(':scope > .swiper-wrapper > .swiper-slide')
    .forEach((slide) => {
      if (slide.querySelector('.w-dyn-empty')) slide.remove();
    });

  /* Scope navigation + pagination to this section */
  const pagEl = section.querySelector('.articles_pagination-wrap');
  const nextEl = section.querySelector('.articles--next');
  const prevEl = section.querySelector('.articles--prev');

  /* Clear any static placeholder dots */
  if (pagEl) pagEl.innerHTML = '';

  const sw = new Swiper(articlesEl, {
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
  const slides = Array.from(
    articlesEl.querySelectorAll(':scope > .swiper-wrapper > .swiper-slide')
  );
  const maxH = Math.max(...slides.map((s) => s.offsetHeight).filter(Boolean));
  if (maxH) {
    slides.forEach((s) => {
      const card =
        s.querySelector('.article-card_slide') ||
        s.querySelector('.w-dyn-items');
      if (card) card.style.minHeight = maxH + 'px';
    });
  }
})();
