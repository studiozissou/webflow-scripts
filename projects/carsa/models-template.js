// Carsa models template behaviour moved out of the Webflow template body: the meta description and title fallback built from window.__CARSA_MODELS, and the FAQ JSON-LD scrub that drops empty questions.
(function ($) {
  var H = window.__CARSA;
  if (!H) {
    if (window.DD_LOGS) window.DD_LOGS.logger.warn('models-template.js: window.__CARSA missing');
    return;
  }
  if (!window.__CARSA_PAGE) return;
  (window.__CARSA_RAN = window.__CARSA_RAN || []).push('models-template.js');

  var MODELS = H.cms(window.__CARSA_MODELS, ['make', 'name']);
  if (!MODELS && window.DD_LOGS) window.DD_LOGS.logger.warn('models-template.js: window.__CARSA_MODELS missing, meta description fallback skipped');

  if (MODELS) H.block(() => {
    $(function () {
      var defaultDesc = 'The ' + MODELS.make + ' ' + MODELS.name + ' blends everyday practicality with signature ' + MODELS.make + ' craftsmanship. Expect responsive engines, refined comfort, advanced infotainment and safety tech packaged in a distinctive design that turns routine drives into rewarding journeys.';

      var metaDesc = $('meta[name="description"]');
      if (!metaDesc.length) {
        $('<meta>', { name: 'description', content: defaultDesc }).appendTo($('head'));
      } else if (!metaDesc.attr('content')) {
        metaDesc.first().attr('content', defaultDesc);
      }

      var descText = $('meta[name="description"]').attr('content') || defaultDesc;

      if (!document.title.trim()) {
        document.title = 'Shop used ' + MODELS.make + ' ' + MODELS.name + ' cars combining style, performance and modern tech. Discover our stock online, choose your favourite and book a test drive.';
      }

      $('#description').text(descText);
    });
  });

  H.block(() => {
    (function () {
      var blocks = document.querySelectorAll('script[type="application/ld+json"]');
      var faqAlive = false;
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
              faqAlive = true;
            }
          } else if (data['@type'] === 'FAQPage') {
            faqAlive = true;
          }
        } catch (_) {}
      }
      if (faqAlive) return;
      for (var j = 0; j < blocks.length; j++) {
        if (!blocks[j].parentNode || !blocks[j].textContent) continue;
        try {
          var graphData = JSON.parse(blocks[j].textContent);
          if (!Array.isArray(graphData['@graph'])) continue;
          var changed = false;
          for (var g = 0; g < graphData['@graph'].length; g++) {
            var node = graphData['@graph'][g];
            if (node && node.mainEntity && typeof node.mainEntity['@id'] === 'string' && node.mainEntity['@id'].indexOf('#faq') !== -1) {
              delete node.mainEntity;
              changed = true;
            }
          }
          if (changed) blocks[j].textContent = JSON.stringify(graphData);
        } catch (_) {}
      }
    })();
  });
})(window.jQuery);
