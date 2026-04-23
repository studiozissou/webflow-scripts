/**
 * NEM Life — Blog email share
 * Click [data-link="email"] → open mailto with article subject + URL.
 * Dutch by default; English when ?reflang=en (or reflang contains "en").
 */
(() => {
  const DEBUG = false;

  const isEnglish = () => {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('reflang') || '';
    return lang.toLowerCase().includes('en');
  };

  const handleClick = (e) => {
    e.preventDefault();
    const url = window.location.href;
    const en = isEnglish();

    const subject = en
      ? 'NEM Life Article'
      : 'NEM Life Artikel';
    const body = en
      ? `Hey! Check out this interesting article on NEM Life: ${url}`
      : `Hey! Bekijk dit interessante artikel op NEM Life: ${url}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  document.querySelectorAll('[data-link="email"]').forEach((el) => {
    el.addEventListener('click', handleClick);
    DEBUG && console.log('[blog-share] bound', el);
  });
})();
