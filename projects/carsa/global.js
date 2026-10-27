// Carsa site-wide behaviour moved out of the Webflow site footer: menu scroll lock, promo links, store list order, attribution storage, eligibility link UTMs, external link rel, copyright year, the n8n chat widget and, on marked pages, the missing-VDP 404 redirect.
(function ($) {
  var H = window.__CARSA;
  if (!H) {
    if (window.DD_LOGS) window.DD_LOGS.logger.warn('global.js: window.__CARSA missing');
    return;
  }

  H.block(() => {
    const nav = document.querySelector('.navbar7_component');
    if (!nav) return;

    const btn = nav.querySelector('.w-nav-button');
    const menu = nav.querySelector('.navbar8_menu');
    if (!btn || !menu) return;

    let locked = false;
    let scrollY = 0;

    function lock() {
      if (locked) return;
      locked = true;
      scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      menu.style.overflowY = 'auto';
      menu.style.webkitOverflowScrolling = 'touch';
    }

    function unlock() {
      if (!locked) return;
      locked = false;
      document.body.style.overflow = '';
      menu.style.overflowY = '';
      menu.style.webkitOverflowScrolling = '';
      window.scrollTo(0, scrollY);
    }

    const observer = new MutationObserver(() => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      if (isOpen) lock();
      else unlock();
    });

    observer.observe(btn, { attributes: true, attributeFilter: ['aria-expanded'] });
  });

  H.onReady(() => {
    const promoBase = '/used-cars/deals?cars_sort_reduced-amount-true=desc&cars_promotion_equal=';
    document.querySelectorAll('a[data-link="promo"]').forEach((link) => {
      const txt = link.textContent.trim();
      if (txt) link.href = promoBase + txt.replace(/\s+/g, '+');
    });
  });

  H.onReady(() => {
    $('#store-list').prepend($('#find-store-link'));
  });

  H.onReady(() => {
    const LS_KEY = 'attribution',
      SS_KEY = 'attribution_session',
      TTL_DAYS = 30;
    const HOST = location.hostname.replace(/^www\./, '');

    const now = () => Date.now(),
      ms = (d) => d * 24 * 60 * 60 * 1000;

    function getURLUtms() {
      const o = {},
        qs = new URLSearchParams(location.search);
      qs.forEach((v, k) => {
        if (/^utm_/i.test(k) && v) o[k] = v;
      });
      return o;
    }
    function isExternalRef(ref) {
      try {
        if (!ref) return false;
        const h = new URL(ref).hostname.replace(/^www\./, '');
        return !(h === HOST || h.endsWith('.' + HOST));
      } catch (_) {
        return false;
      }
    }
    function refPieces(ref) {
      if (!isExternalRef(ref)) return { referrer: '', referrerDomain: '' };
      try {
        const u = new URL(ref);
        return { referrer: ref, referrerDomain: u.hostname.replace(/^www\./, '') };
      } catch (_) {
        return { referrer: '', referrerDomain: '' };
      }
    }
    const utmsNow = getURLUtms();
    const { referrer, referrerDomain } = refPieces(document.referrer);

    try {
      sessionStorage.setItem(
        SS_KEY,
        JSON.stringify({
          utms: utmsNow,
          referrer,
          referrerDomain,
          updatedAt: now(),
        }),
      );
    } catch (_) {}

    let localObj;
    try {
      localObj = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    } catch (_) {
      localObj = null;
    }

    const hasExp = !!(localObj && typeof localObj.expiresAt === 'number');
    const expired = hasExp && now() > localObj.expiresAt;
    const exists = !!localObj && !expired;
    const hasLocalUTMs = !!(localObj && localObj.utms && Object.keys(localObj.utms).length);
    const hasLocalRef = !!(localObj && localObj.referrerDomain);
    const hasCurrentUTMs = Object.keys(utmsNow).length > 0;
    const hasCurrentRef = !!referrerDomain;

    let shouldWrite = false;

    if (!exists || !hasExp || expired) {
      shouldWrite = true;
    } else if (!hasLocalUTMs && !hasLocalRef && (hasCurrentUTMs || hasCurrentRef)) {
      shouldWrite = true;
    } else if (!hasLocalUTMs && hasCurrentUTMs) {
      shouldWrite = true;
    }

    if (shouldWrite) {
      const firstTouch = {
        utms: utmsNow,
        referrer,
        referrerDomain,
        updatedAt: now(),
        expiresAt: now() + ms(TTL_DAYS),
      };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(firstTouch));
      } catch (_) {}
    }
  });

  H.onLoad(() => {
    $('a[href*="quote.carsa.co.uk/eligibility/questions"]').each(function () {
      this.href = H.addParams(this.href, H.getAttributionParams());
    });
  });

  H.onReady(() => {
    document.querySelectorAll('a[target="_blank"]').forEach((e) => {
      if (!e.href.includes('carsa.co.uk')) e.setAttribute('rel', 'noreferrer noopener');
    });
  });

  H.block(() => {
    const year = document.getElementById('year');
    if (year) year.innerText = new Date().getFullYear();
  });

  H.onReady(() => {
    import('https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js')
      .then(({ createChat }) => {
        function updateViewportHeight() {
          document.documentElement.style.setProperty('--real-vh', `${window.innerHeight * 0.01}px`);
        }
        updateViewportHeight();
        window.addEventListener('resize', updateViewportHeight);

        function addCloseButton() {
          if (window.innerWidth > 991) return;
          const header = document.querySelector('.chat-window-wrapper .chat-header');
          if (!header || header.querySelector('.chat-close-btn')) return;

          const closeBtn = document.createElement('button');
          closeBtn.className = 'chat-close-btn';
          closeBtn.setAttribute('aria-label', 'Close chat');
          closeBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    `;
          closeBtn.style.cssText = `
      position: absolute;
      top: 50%;
      right: 12px;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
          closeBtn.addEventListener('click', () => {
            document.querySelector('.chat-window-wrapper .chat-window-toggle')?.click();
          });
          header.appendChild(closeBtn);
        }

        new MutationObserver(() => {
          addCloseButton();
        }).observe(document.body, { childList: true, subtree: true });

        document.addEventListener('click', (e) => {
          if (e.target.closest('.chat-nav-trigger')) {
            document.querySelector('.chat-window-wrapper .chat-window-toggle')?.click();
          }
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && e.target.closest('.chat-nav-trigger')) {
            document.querySelector('.chat-window-wrapper .chat-window-toggle')?.click();
          }
        });

        const isReturningUser = !!localStorage.getItem('n8n-chat/sessionId');

        createChat({
          webhookUrl: 'https://carsa.app.n8n.cloud/webhook/88d110ef-b4ab-4c22-9306-1e492c9f7687/chat',
          mode: 'window',
          showWelcomeScreen: false,
          loadPreviousSession: false,
          initialMessages: isReturningUser ? ['Welcome back! 👋'] : ['Hello! 👋', 'How can I help you today?'],
          metadata: {
            currentPageUrl: window.location.href,
            source: 'Website',
          },
          i18n: {
            en: {
              title: 'Chat with Caroline AI',
              subtitle: 'Get instant help with your car search',
              inputPlaceholder: 'Type your message...',
            },
          },
        });
      })
      .catch((err) => {
        window.setTimeout(() => {
          throw err;
        });
      });
  });

  H.block(() => {
    if (!window.__CARSA_PAGE) return;
    $(function () {
      if ($('#404-message').length && window.location.pathname.includes('/vehicles/used/')) {
        window.location.href = '/used-cars';
      }
    });
  });
})(window.jQuery);
