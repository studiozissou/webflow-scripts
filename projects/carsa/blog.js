// Carsa /blog page behaviour moved out of the Webflow page body: moves the View-all link into the category list.
(function ($) {
  var H = window.__CARSA;
  if (!H) {
    if (window.DD_LOGS) window.DD_LOGS.logger.warn('blog.js: window.__CARSA missing');
    return;
  }
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('blog.js');

  H.block(() => {
    $(document).ready(function(){
      $('#category-list').prepend($('#view-all'));
    });
  });
})(window.jQuery);
