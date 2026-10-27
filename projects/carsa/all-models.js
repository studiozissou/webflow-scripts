// Carsa /used-cars/models page behaviour moved out of the Webflow page body: updates the make dropdown label on press and closes the dropdown after a choice.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('all-models.js');

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
    (function ($) {
      var $label = $('#select-text');

      $(document).on('pointerdown', "[data-element='select']", function () {
        var val = $(this).data('text') || $.trim($(this).text());
        $label.text(val);
      });
      $(document).on('pointerdown', "[fs-list-element='clear']", function () {
        $label.text('Any make');
      });

      $(document).on('click', "[data-element='select'], [fs-list-element='clear']", function () {
        var el = this;
        setTimeout(function () {
          ['mousedown','mouseup','click'].forEach(function(t){
            document.body.dispatchEvent(new MouseEvent(t, { bubbles: true }));
          });

          var $list = $(el).closest('.w-dropdown-list');
          var id = $list.attr('aria-labelledby');
          var toggle = id && document.getElementById(id);
          if (toggle && (
              $list.hasClass('w--open') ||
              toggle.classList.contains('w--open') ||
              toggle.getAttribute('aria-expanded') === 'true'
            )) {
            toggle.click();
          }
        }, 0);
      });
    })(jQuery);
  });
})(window.jQuery);
