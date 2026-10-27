// Carsa shared SVG animations moved out of Webflow page bodies: the GSAP draw-line and draw-shape (grow and pop-up) timelines, each limited to the pages that carried it inline.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('animations.js');

  function block(fn) {
    try {
      fn();
    } catch (err) {
      window.setTimeout(function () {
        throw err;
      });
    }
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        block(fn);
      });
    } else {
      block(fn);
    }
  }

  function onLoad(fn) {
    if (document.readyState === 'complete') {
      block(fn);
    } else {
      window.addEventListener('load', function () {
        block(fn);
      });
    }
  }

  function onPage(paths, prefixes) {
    var p = location.pathname;
    if (p.length > 1) p = p.replace(/\/+$/, '');
    if (paths.indexOf(p) !== -1) return true;
    return (prefixes || []).some(function (x) {
      var rest = p.indexOf(x + '/') === 0 ? p.slice(x.length + 1) : '';
      return rest !== '' && rest.indexOf('/') === -1;
    });
  }

  var DRAW_LINE_PATHS = [
    '/',
    '/about/car-preparation',
    '/about/careers',
    '/about/carsa',
    '/about/gender-pay-gap-report-april-25',
    '/about/reviews',
    '/about/tax-strategy',
    '/about/tiktok',
    '/blog',
    '/car-care/car-extras',
    '/car-care/car-paint-interior-protection',
    '/car-care/carsacover',
    '/car-care/cosmetic-maintenance-plan',
    '/car-care/drive-away-car-insurance',
    '/car-care/electric-vehicle-cover',
    '/car-care/electric-vehicle-extended-warranty',
    '/car-care/extended-mechanical-warranty',
    '/car-care/free-warranty',
    '/car-care/mot-service-wolverhampton',
    '/car-care/overview',
    '/car-care/podpoint',
    '/car-care/shine-protect-alloy-wheel-protection',
    '/car-care/williams-ceramic-paint-protection',
    '/car-finance',
    '/carsa-staff-event',
    '/contact',
    '/faq',
    '/reserve',
    '/sell-car/part-exchange',
    '/sell-car/value-car',
    '/used-cars/models',
    '/500-deposit-on-us',
  ];
  var DRAW_LINE_TEMPLATES = [
    '/used-cars/fuel',
    '/used-cars/promotions',
    '/mot-and-car-servicing/servicing-locations',
    '/sell-car/store',
    '/stores',
    '/terms',
  ];
  var DRAW_SHAPE_PATHS = [
    '/',
    '/about/car-preparation',
    '/about/carsa',
    '/about/gender-pay-gap-report-april-25',
    '/about/reviews',
    '/about/tax-strategy',
    '/about/tiktok',
    '/car-finance',
    '/reserve',
    '/sell-car/part-exchange',
    '/sell-car/value-car',
  ];
  var DRAW_SHAPE_TEMPLATES = ['/blog', '/used-cars/fuel', '/used-cars/promotions'];

  block(() => {
    if (!onPage(DRAW_LINE_PATHS, DRAW_LINE_TEMPLATES)) return;
    $(function () {
      if (typeof gsap === "undefined") return;
      if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

      let userHasScrolled = false;
      window.addEventListener('scroll', function onFirstScroll(){
        userHasScrolled = true;
        window.removeEventListener('scroll', onFirstScroll);
      }, { passive: true });

      const wrappers = Array.from(new Set($('[data-svg="draw-line"]').get()));
      wrappers.forEach(function(wrapper){
        const $w = $(wrapper);
        if ($w.data('svgDrawInit')) return;
        $w.data('svgDrawInit', true);

        const startMode = (wrapper.getAttribute('data-svg-start') || 'auto').toLowerCase();
        const totalDur  = Math.max(0.001, parseFloat(wrapper.getAttribute('data-svg-duration')) || 2);

        const svgs = Array.from(wrapper.querySelectorAll('svg'));
        if (!svgs.length) return;

        svgs.forEach(function(svg){
          const els = Array.from(svg.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect')).filter(function(el){
            const cs = getComputedStyle(el);
            return cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0;
          });
          if (!els.length) return;

          let totalLen = 0;
          els.forEach(function(el){
            let len = 0;
            try { len = (typeof el.getTotalLength === 'function') ? el.getTotalLength() : 0; } catch(e){ len = 0; }
            if (!isFinite(len) || len <= 0) {
              const b = el.getBBox?.();
              len = (b && isFinite(b.width) && isFinite(b.height)) ? 2*(b.width + b.height) : 1000;
            }
            el.style.strokeDasharray = `${len} ${len}`;
            el.style.strokeDashoffset = `${len}`;
            el.__svgDrawLen = len;
            totalLen += len;
          });
          if (totalLen <= 0) totalLen = els.length || 1;

          const tl = gsap.timeline({ paused: true });
          els.forEach(function(el){
            const seg = (el.__svgDrawLen / totalLen) * totalDur;
            tl.to(el, { strokeDashoffset: 0, duration: seg, ease: "none" }, ">");
          });

          const driver = gsap.to(tl, { progress: 1, duration: totalDur, ease: "power1.inOut", paused: true });

          const playNow = () => gsap.delayedCall(0.2, () => driver.play());
          const playAfterFirstScroll = () => {
            if (userHasScrolled) playNow();
            else {
              const handler = () => { window.removeEventListener('scroll', handler); userHasScrolled = true; playNow(); };
              window.addEventListener('scroll', handler, { passive: true });
            }
          };

          const vh = window.innerHeight || document.documentElement.clientHeight;
          const r0 = svg.getBoundingClientRect();
          const pastOnLoad = (r0.top <= vh * 0.8 && r0.bottom >= 0);

          if (pastOnLoad) {
            (startMode === 'scroll') ? playAfterFirstScroll() : playNow();
            return;
          }

          if (typeof ScrollTrigger !== "undefined") {
            ScrollTrigger.create({
              trigger: svg,
              start: "top 80%",
              once: true,
              onEnter: () => playNow()
            });
          } else {
            const onScroll = () => {
              const r = svg.getBoundingClientRect();
              const enters = r.top <= vh * 0.8 && r.bottom >= 0;
              if (!enters) return;
              window.removeEventListener('scroll', onScroll);
              window.removeEventListener('resize', onScroll);
              playNow();
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll);
            onScroll();
          }
        });
      });
    });
  });

  block(() => {
    if (!onPage(DRAW_SHAPE_PATHS, DRAW_SHAPE_TEMPLATES) && !document.querySelector('#404-message')) return;
    $(function () {
      if (typeof gsap === "undefined") return;
      if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

      let userHasScrolled = false;
      window.addEventListener('scroll', function onFirstScroll(){
        userHasScrolled = true; window.removeEventListener('scroll', onFirstScroll);
      }, { passive:true });

      const wrappers = Array.from(new Set($('[data-svg="draw-shape"]').get()));
      wrappers.forEach(function(wrapper){
        const $w = $(wrapper);
        if ($w.data('svgPopInit')) return; $w.data('svgPopInit', true);

        const startMode = (wrapper.getAttribute('data-svg-start') || 'auto').toLowerCase();
        const totalDur  = Math.max(0.001, parseFloat(wrapper.getAttribute('data-svg-duration')) || 2);

        const svgs = Array.from(wrapper.querySelectorAll('svg'));
        if (!svgs.length) return;

        svgs.forEach(function(svg){
          const els = Array.from(svg.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect'));
          if (!els.length) return;

          gsap.set(els, { y:24, scale:0, opacity:0, transformOrigin:"50% 50%", transformBox:"fill-box" });

          const tl = gsap.timeline({ paused:true });
          const seg = totalDur / els.length;
          els.forEach(el => tl.to(el, { y:0, scale:1, opacity:1, duration:seg, ease:"none" }, ">"));

          const driver = gsap.to(tl, { progress:1, duration:totalDur, ease:"power1.inOut", paused:true });

          const playNow = () => gsap.delayedCall(0.2, () => driver.play());
          const playAfterFirstScroll = () => {
            if (userHasScrolled) playNow();
            else {
              const h = () => { window.removeEventListener('scroll', h); userHasScrolled = true; playNow(); };
              window.addEventListener('scroll', h, { passive:true });
            }
          };

          const vh = window.innerHeight || document.documentElement.clientHeight;
          const r0 = svg.getBoundingClientRect();
          const pastOnLoad = (r0.top <= vh * 0.8 && r0.bottom >= 0);

          if (pastOnLoad) { (startMode === 'scroll') ? playAfterFirstScroll() : playNow(); return; }

          if (typeof ScrollTrigger !== "undefined") {
            ScrollTrigger.create({
              trigger: svg,
              start: "top 80%",
              once: true,
              onEnter: () => playNow()
            });
          } else {
            const onScroll = () => {
              const r = svg.getBoundingClientRect();
              const enters = r.top <= vh * 0.8 && r.bottom >= 0;
              if (!enters) return;
              window.removeEventListener('scroll', onScroll);
              window.removeEventListener('resize', onScroll);
              playNow();
            };
            window.addEventListener('scroll', onScroll, { passive:true });
            window.addEventListener('resize', onScroll);
            onScroll();
          }
        });
      });
    });
  });
})(window.jQuery);
