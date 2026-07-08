/**
 * The Signalling Company — Script Loader
 *
 * Single entry point loaded via jsDelivr:
 * <script src="https://cdn.jsdelivr.net/gh/{owner}/{repo}@{hash}/projects/the-signalling-company/init.js"></script>
 *
 * Includes site-wide utilities (rel noreferrer, footer year, UTM tracking)
 * and loads project modules once vendor deps are ready.
 */
(() => {
  const src = (document.currentScript && document.currentScript.src) || '';
  const BASE = src.substring(0, src.lastIndexOf('/') + 1);

  /* ── Vendor deps (loaded first) ────────────────────────── */
  const deps = [
    // 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js',
    // 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js',
  ];

  /* ── Project modules (loaded after deps) ───────────────── */
  const modules = [
    // 'hero-anim.js',
  ];

  /* ── Site-wide utilities ───────────────────────────────── */

  function setExternalLinkRels() {
    document.querySelectorAll('a[target="_blank"]').forEach((a) => {
      a.setAttribute('rel', 'noreferrer noopener');
    });
  }

  function setFooterYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  function injectUTMTracking() {
    const forms = document.querySelectorAll('form');
    if (!forms.length) return;

    const url = new URL(window.location.href);
    const params = url.searchParams;

    /* Build clean page URL without UTM params */
    const cleanURL = new URL(url.origin + url.pathname);
    for (const [key, val] of params) {
      if (!key.startsWith('utm_')) cleanURL.searchParams.set(key, val);
    }
    const conversionPage = cleanURL.toString();

    forms.forEach((form) => {
      if (form.dataset.trackingInjected) return;
      form.dataset.trackingInjected = 'true';

      form.append(
        Object.assign(document.createElement('input'), {
          type: 'hidden',
          name: 'Conversion Page',
          value: conversionPage,
        })
      );

      for (const [key, val] of params) {
        if (key.startsWith('utm_')) {
          form.append(
            Object.assign(document.createElement('input'), {
              type: 'hidden',
              name: key,
              value: val,
            })
          );
        }
      }
    });
  }

  function moveNavSeeAll() {
    document.querySelectorAll('.w-dropdown-list').forEach((dropdown) => {
      const list = dropdown.querySelector('[data-nav="list"]');
      const seeAll = dropdown.querySelector(':scope [data-nav="see-all"]');
      if (list && seeAll && !list.contains(seeAll)) list.appendChild(seeAll);
    });
  }

  /* ── Project video embeds ──────────────────────────────── */
  /* Editors paste a plain YouTube URL into a CMS field bound to
     an element with class .yt-embed. We swap it for a privacy-mode
     (youtube-nocookie.com) iframe with autoplay + mute + controls. */

  function getYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function mountYouTubeEmbed(el) {
    if (el.dataset.ytMounted) return;

    /* URL comes from a data attribute or the bound field's text. */
    const url = el.dataset.ytUrl || el.textContent.trim();
    const id = getYouTubeId(url);
    if (!id) return;

    el.dataset.ytMounted = 'true';

    const params = new URLSearchParams({
      autoplay: el.dataset.autoplay === 'false' ? '0' : '1',
      mute: el.dataset.mute === 'false' ? '0' : '1',
      controls: el.dataset.controls === 'false' ? '0' : '1',
      rel: '0', // limit related videos to same channel
      playsinline: '1',
    });

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?${params}`;
    iframe.title = 'YouTube video player';
    iframe.loading = 'lazy';
    iframe.allow =
      'accelerated-autoplay; autoplay; encrypted-media; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;border:0;';

    /* Responsive 16:9 wrapper on the host element. */
    el.style.cssText += ';position:relative;padding-bottom:56.25%;height:0;overflow:hidden;';
    el.textContent = '';
    el.appendChild(iframe);
  }

  function setupProjectVideos() {
    document.querySelectorAll('.yt-embed, [data-yt-url]').forEach(mountYouTubeEmbed);
  }

  /* ── Loader helpers ────────────────────────────────────── */

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadModules() {
    modules.forEach((file) => {
      const s = document.createElement('script');
      s.src = `${BASE}${file}`;
      s.async = false;
      document.head.appendChild(s);
    });
  }

  /* ── Boot ──────────────────────────────────────────────── */

  async function boot() {
    /* Utilities — run immediately */
    setExternalLinkRels();
    setFooterYear();
    injectUTMTracking();
    moveNavSeeAll();
    setupProjectVideos();

    /* Vendor deps (sequential where order matters) */
    for (const url of deps) {
      await loadScript(url);
    }

    /* Project modules */
    if (modules.length) loadModules();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot().catch(() => {}));
  } else {
    boot().catch(() => {});
  }
})();
