// Carsa models template behaviour moved out of the Webflow template body: the meta description and title fallback built from window.__CARSA_MODELS, and the FAQ JSON-LD scrub that drops empty questions.
(function ($) {
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('models-template.js');

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

  function cms(config, keys) {
    if (!config || typeof config !== 'object') return null;
    var out = {};
    keys.forEach(function (k) {
      var v = config[k];
      out[k] = String(v == null ? '' : v).trim();
    });
    return out;
  }

  var MODELS = cms(window.__CARSA_MODELS, ['make', 'name']);
  if (!MODELS && window.DD_LOGS) window.DD_LOGS.logger.warn('models-template.js: window.__CARSA_MODELS missing, meta description fallback skipped');

  if (MODELS) block(() => {
    $(function () {
      var defaultDesc = 'The ' + MODELS.make + ' ' + MODELS.name + ' blends everyday practicality with signature ' + MODELS.make + ' craftsmanship. Expect responsive engines, refined comfort, advanced infotainment and safety tech packaged in a distinctive design that turns routine drives into rewarding journeys.';

      var metaDesc = $('meta[name="description"]');
      if (!metaDesc.length || !metaDesc.attr('content')) {
        $('head').append('<meta name="description" content="' + defaultDesc + '">');
      }

      var descText = $('meta[name="description"]').attr('content') || defaultDesc;

      if (!document.title.trim()) {
        document.title = 'Shop used ' + MODELS.make + ' ' + MODELS.name + ' cars combining style, performance and modern tech. Discover our stock online, choose your favourite and book a test drive.';
      }

      $('#description').text(descText);
    });
  });

  block(() => {
    (function () {
      var blocks = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < blocks.length; i++) {
        var txt = blocks[i].textContent;
        if (!txt) continue;
        try {
          var data = JSON.parse(txt);
          if (data['@type'] === 'FAQPage' && Array.isArray(data.mainEntity)) {
            var kept = [];
            for (var q = 0; q < data.mainEntity.length; q++) {
              var item = data.mainEntity[q];
              var name = (item.name || '').trim();
              var answer = ((item.acceptedAnswer && item.acceptedAnswer.text) || '').trim();
              if (name && answer) kept.push(item);
            }
            if (kept.length === 0) {
              blocks[i].parentNode.removeChild(blocks[i]);
            } else {
              data.mainEntity = kept;
              blocks[i].textContent = JSON.stringify(data);
            }
          }
          if (data['@graph']) {
            for (var g = 0; g < data['@graph'].length; g++) {
              var node = data['@graph'][g];
              if (node.mainEntity && typeof node.mainEntity['@id'] === 'string' && node.mainEntity['@id'].indexOf('#faq') !== -1) {
                var faqAlive = false;
                for (var f = 0; f < blocks.length; f++) {
                  if (!blocks[f].parentNode) continue;
                  try {
                    var check = JSON.parse(blocks[f].textContent);
                    if (check['@type'] === 'FAQPage') {
                      faqAlive = true;
                      break;
                    }
                  } catch (_) {}
                }
                if (!faqAlive) {
                  delete node.mainEntity;
                  blocks[i].textContent = JSON.stringify(data);
                }
              }
            }
          }
        } catch (_) {}
      }
    })();
  });
})(window.jQuery);
