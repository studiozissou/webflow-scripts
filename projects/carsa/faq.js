// Carsa /faq page behaviour moved out of the Webflow page body: opens the question named in ?question_contain after one second.
(function ($) {
  var H = window.__CARSA;
  if (!H) {
    if (window.DD_LOGS) window.DD_LOGS.logger.warn('faq.js: window.__CARSA missing');
    return;
  }
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('faq.js');

  H.block(() => {
    if (!H.onPage(['/faq'])) return;
    $(function(){
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('question_contain');
      if(slug){
        setTimeout(()=>{ document.getElementById(slug)?.click(); },1000);
      }
    });
  });
})(window.jQuery);
