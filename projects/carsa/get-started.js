// Carsa /get-started page behaviour moved out of the Webflow page body: URL prefill, booking link with UTMs, radio squiggles, the radio draw-line animation and the VRM meta title.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('get-started.js');

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

  block(() => {
    $(function () {
      const params = new URLSearchParams(window.location.search);
      const vrm = params.get('vrm') || '';
      const location = params.get('location') || '';
      const isStorage = params.get('storage') === 'true';

      const $form = $('form').first();
      if (vrm) {
        $('<input>', {
          type: 'hidden',
          name: 'vrm',
          value: vrm
        }).appendTo($form);
      }

      if (location) $('[data-text="location"]').text(location);
      if (vrm) $('[data-text="vrm"]').text(vrm);

      if (isStorage) $('#free-test-drive').css('display', 'none');
    });
  });

  block(() => {
    $(function(){
      const params = new URLSearchParams(window.location.search);
      const vrm = params.get('vrm') || '';

      const HOST = location.hostname.replace(/^www\./,'');
      const isInternal = d => !!d && (d===HOST || d.endsWith('.'+HOST));

      let store = {};
      try { store = JSON.parse(localStorage.getItem('attribution') || '{}'); } catch(e){}
      const utms = store.utms || {};

      let refDomain = '';
      if (store.referrerDomain && !isInternal(store.referrerDomain)) refDomain = store.referrerDomain;
      else if (store.referrer) {
        try {
          const d = new URL(store.referrer).hostname.replace(/^www\./,'');
          if (!isInternal(d)) refDomain = d;
        } catch(e){}
      } else if (document.referrer) {
        try {
          const d = new URL(document.referrer).hostname.replace(/^www\./,'');
          if (!isInternal(d)) refDomain = d;
        } catch(e){}
      }

      if (!Object.keys(utms).length) {
        const qs = new URLSearchParams(location.search);
        qs.forEach((v,k)=>{ if(/^utm_/i.test(k) && v) utms[k]=v; });
      }

      const toAdd = {...utms};
      if (refDomain) toAdd.referrer = refDomain;

      function addParams(url, obj){
        try {
          const u = new URL(url, location.origin);
          for (const k in obj) if (!u.searchParams.has(k)) u.searchParams.set(k, obj[k]);
          return u.toString();
        } catch(_) {
          const hasQ = url.includes('?'); const parts=[];
          for (const k in obj)
            if (!new RegExp('([?&])'+k+'=').test(url)) parts.push(k+'='+encodeURIComponent(obj[k]));
          return parts.length ? url + (hasQ?'&':'?') + parts.join('&') : url;
        }
      }

      const OPTIONS = {
        'test-drive-free': {
          url: `https://quote.carsa.co.uk/book/${vrm}`,
          text: 'Book free test drive',
          event: 'test-drive-free-submit',
          showNote: false
        },
        'reserve-test-drive': {
          url: `https://quote.carsa.co.uk/book/${vrm}`,
          text: 'Reserve & book test drive',
          event: 'reserve-test-drive-submit',
          showNote: true
        },
        'reserve-collect': {
          url: `https://quote.carsa.co.uk/build-deal/${vrm}?skip_intro=`,
          text: 'Reserve & collect',
          event: 'reserve-collect-submit',
          showNote: true
        }
      };

      $('input[type="radio"]').on('change', function(){
        const opt = OPTIONS[this.id];
        if (!opt) return;
        const href = addParams(opt.url, toAdd);
        $('#book-button')
          .attr({
            href: href,
            target: '_blank',
            'data-analytics-event': opt.event
          })
          .text(opt.text)
          .removeClass('is-disabled');

        const $note = $('#reservation-note');
        $note.css({
          transition: 'opacity 300ms ease',
          opacity: opt.showNote ? 1 : 0,
          pointerEvents: opt.showNote ? 'auto' : 'none'
        });
      });

      $('input[type="radio"]:checked').trigger('change');

      if (vrm) {
        $('#back-button')
          .attr('href', `https://www.carsa.co.uk/vehicles/used/${vrm}`)
          .attr('target', '_self');
      }
    });
  });

  block(() => {
    $(document).on('change', 'input[type="radio"]', function() {
      const groupName = this.name;

      $('input[name="' + groupName + '"]').each(function() {
        const squiggle = $(this)
          .closest('.radio3_field')
          .find('.booking-options-squiggle');
        squiggle.css({
          opacity: this.checked ? 0.75 : 0,
          transition: 'opacity 200ms ease'
        });
      });
    });
  });

  block(() => {
    $(function () {
      if (typeof gsap === "undefined") return;
      if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

      let userHasScrolled = false;
      window.addEventListener('scroll', function onFirstScroll(){
        userHasScrolled = true;
        window.removeEventListener('scroll', onFirstScroll);
      }, { passive: true });

      $('[data-svg="draw-line"]').each(function () {
        const wrapper = this;
        if ($(wrapper).data('svgDrawInit')) return;
        $(wrapper).data('svgDrawInit', true);

        const startMode = (wrapper.getAttribute('data-svg-start') || 'auto').toLowerCase();
        const totalDur = Math.max(0.001, (parseFloat(wrapper.getAttribute('data-svg-duration')) || 2) / 1.5);
        const svgs = wrapper.querySelectorAll('svg');

        svgs.forEach(svg => {
          const els = Array.from(svg.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect')).filter(el => {
            const cs = getComputedStyle(el);
            return cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0;
          });
          if (!els.length) return;

          let totalLen = 0;
          els.forEach(el => {
            let len = 0;
            try { len = el.getTotalLength(); } catch { len = 0; }
            if (!isFinite(len) || len <= 0) {
              const b = el.getBBox?.();
              len = b ? 2 * (b.width + b.height) : 1000;
            }
            el.style.strokeDasharray = `${len} ${len}`;
            el.style.strokeDashoffset = `${len}`;
            el.__svgDrawLen = len;
            totalLen += len;
          });

          const tl = gsap.timeline({ paused: true });
          els.forEach(el => {
            const seg = (el.__svgDrawLen / totalLen) * totalDur;
            tl.to(el, { strokeDashoffset: 0, duration: seg, ease: "none" }, ">");
          });

          const driver = gsap.to(tl, { progress: 1, duration: totalDur, ease: "power1.inOut", paused: true });
          svg.__svgDrawPlay = () => driver.pause(0).play();
        });
      });

      $(document).on('change', 'input[type="radio"]', function () {
        if (!this.checked) return;

        const field = $(this).closest('.radio3_field');
        const svg = field.find('[data-svg="draw-line"] svg')[0];
        if (svg && svg.__svgDrawPlay) svg.__svgDrawPlay();
      });
    });
  });

  block(() => {
    $(function() {
      const params = new URLSearchParams(window.location.search);
      const vrm = params.get('vrm');
      if (vrm) {
        const upperVRM = vrm.toUpperCase();
        document.title = `Get Started With ${upperVRM} | Carsa`;
        $('meta[name="title"], meta[property="og:title"]').attr('content', document.title);
      }
    });
  });
})(window.jQuery);
