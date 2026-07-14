/**
 * Unit tests for Carsa FAQ scrub script.
 * Simulates the DOM environment the script runs in on /make/ and /models/ pages.
 */

/* global describe, it, expect, beforeEach */

function createDOM(blocks) {
  // minimal DOM stub
  const scripts = blocks.map(function (json) {
    return {
      textContent: JSON.stringify(json),
      parentNode: {
        removeChild: function (node) { node._removed = true; }
      },
      _removed: false
    };
  });
  return {
    querySelectorAll: function () { return scripts; },
    _scripts: scripts
  };
}

/**
 * Extracted scrub logic — mirrors the inline script exactly.
 * Takes a document-like object so we can test without jsdom.
 */
function scrubFAQ(doc) {
  var blocks = doc.querySelectorAll('script[type="application/ld+json"]');
  for (var i = 0; i < blocks.length; i++) {
    var txt = blocks[i].textContent;
    if (!txt) continue;

    try {
      var data = JSON.parse(txt);

      // --- FAQPage block ---
      if (data['@type'] === 'FAQPage' && Array.isArray(data.mainEntity)) {
        var kept = [];
        for (var q = 0; q < data.mainEntity.length; q++) {
          var item = data.mainEntity[q];
          var name = (item.name || '').trim();
          var answer = (item.acceptedAnswer && item.acceptedAnswer.text || '').trim();
          if (name && answer) {
            kept.push(item);
          }
        }

        if (kept.length === 0) {
          // Remove entire FAQPage block
          blocks[i].parentNode.removeChild(blocks[i]);
        } else {
          data.mainEntity = kept;
          blocks[i].textContent = JSON.stringify(data);
        }
        continue;
      }

      // --- CollectionPage @graph — remove mainEntity #faq ref if FAQPage was removed ---
      if (data['@graph']) {
        for (var g = 0; g < data['@graph'].length; g++) {
          var node = data['@graph'][g];
          if (
            node.mainEntity &&
            typeof node.mainEntity['@id'] === 'string' &&
            node.mainEntity['@id'].indexOf('#faq') !== -1
          ) {
            // Check if the FAQPage block still exists
            var faqAlive = false;
            for (var f = 0; f < blocks.length; f++) {
              if (blocks[f]._removed) continue;
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
}


describe('FAQ scrub', function () {
  it('keeps all questions when all have name + answer', function () {
    var faqBlock = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': 'https://www.carsa.co.uk/used-cars/make/bmw#faq',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } },
        { '@type': 'Question', name: 'Q2?', acceptedAnswer: { '@type': 'Answer', text: 'A2' } }
      ]
    };
    var doc = createDOM([faqBlock]);
    scrubFAQ(doc);

    var result = JSON.parse(doc._scripts[0].textContent);
    expect(result.mainEntity.length).toBe(2);
    expect(doc._scripts[0]._removed).toBe(false);
  });

  it('removes questions with empty name', function () {
    var faqBlock = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } },
        { '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: 'A2' } },
        { '@type': 'Question', name: '  ', acceptedAnswer: { '@type': 'Answer', text: 'A3' } }
      ]
    };
    var doc = createDOM([faqBlock]);
    scrubFAQ(doc);

    var result = JSON.parse(doc._scripts[0].textContent);
    expect(result.mainEntity.length).toBe(1);
    expect(result.mainEntity[0].name).toBe('Q1?');
  });

  it('removes questions with empty answer', function () {
    var faqBlock = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: '' } },
        { '@type': 'Question', name: 'Q2?', acceptedAnswer: { '@type': 'Answer', text: 'A2' } }
      ]
    };
    var doc = createDOM([faqBlock]);
    scrubFAQ(doc);

    var result = JSON.parse(doc._scripts[0].textContent);
    expect(result.mainEntity.length).toBe(1);
    expect(result.mainEntity[0].name).toBe('Q2?');
  });

  it('removes questions with missing acceptedAnswer', function () {
    var faqBlock = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } },
        { '@type': 'Question', name: 'Q2?' }
      ]
    };
    var doc = createDOM([faqBlock]);
    scrubFAQ(doc);

    var result = JSON.parse(doc._scripts[0].textContent);
    expect(result.mainEntity.length).toBe(1);
  });

  it('removes entire FAQPage block when all questions empty', function () {
    var faqBlock = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': 'https://www.carsa.co.uk/used-cars/make/test#faq',
      mainEntity: [
        { '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } },
        { '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } }
      ]
    };
    var doc = createDOM([faqBlock]);
    scrubFAQ(doc);

    expect(doc._scripts[0]._removed).toBe(true);
  });

  it('removes mainEntity #faq ref from CollectionPage when FAQPage removed', function () {
    var graphBlock = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': 'https://www.carsa.co.uk/used-cars/make/test#webpage',
          mainEntity: { '@id': 'https://www.carsa.co.uk/used-cars/make/test#faq' }
        },
        {
          '@type': 'BreadcrumbList'
        }
      ]
    };
    var faqBlock = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': 'https://www.carsa.co.uk/used-cars/make/test#faq',
      mainEntity: [
        { '@type': 'Question', name: '', acceptedAnswer: { '@type': 'Answer', text: '' } }
      ]
    };
    // FAQPage block processed first, then graph block
    var doc = createDOM([faqBlock, graphBlock]);
    scrubFAQ(doc);

    expect(doc._scripts[0]._removed).toBe(true);
    var graph = JSON.parse(doc._scripts[1].textContent);
    expect(graph['@graph'][0].mainEntity).toBeUndefined();
  });

  it('preserves mainEntity ref when FAQPage has valid questions', function () {
    var graphBlock = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          mainEntity: { '@id': 'https://www.carsa.co.uk/used-cars/make/bmw#faq' }
        }
      ]
    };
    var faqBlock = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q1?', acceptedAnswer: { '@type': 'Answer', text: 'A1' } }
      ]
    };
    var doc = createDOM([faqBlock, graphBlock]);
    scrubFAQ(doc);

    var graph = JSON.parse(doc._scripts[1].textContent);
    expect(graph['@graph'][0].mainEntity).toBeDefined();
    expect(graph['@graph'][0].mainEntity['@id']).toContain('#faq');
  });
});
