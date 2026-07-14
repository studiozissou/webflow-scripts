/**
 * FAQ Scrub — Carsa /make/ and /models/ pages
 * Removes empty Question nodes from FAQPage JSON-LD.
 * If all questions are empty, removes the entire FAQPage block
 * and cleans the mainEntity #faq ref from CollectionPage.
 */
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
          var answer = (item.acceptedAnswer && item.acceptedAnswer.text || '').trim();
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
                if (check['@type'] === 'FAQPage') { faqAlive = true; break; }
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
