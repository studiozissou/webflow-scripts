/* =========================================
   RHP — Intro text formatter (case study pages)
   Decodes HTML entities and sanitizes [data-text="intro"] to allowed tags only (BR, STRONG, B, EM, I, U). No links.
   ========================================= */
(function() {
  'use strict';

  const ALLOWED_TAGS = new Set(['BR', 'STRONG', 'B', 'EM', 'I', 'U']);

  function decodeHTMLEntities(str) {
    const t = document.createElement('textarea');
    t.innerHTML = str;
    return t.value;
  }

  function sanitizeHTML(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;

    const walk = function(node) {
      const children = Array.from(node.childNodes);

      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const tag = child.tagName;

          if (!ALLOWED_TAGS.has(tag)) {
            const frag = document.createDocumentFragment();
            while (child.firstChild) frag.appendChild(child.firstChild);
            child.replaceWith(frag);
            continue;
          }

          Array.from(child.attributes).forEach(function(attr) {
            child.removeAttribute(attr.name);
          });

          walk(child);
        } else if (child.nodeType === Node.COMMENT_NODE) {
          child.remove();
        }
      }
    };

    walk(tpl.content);
    return tpl.innerHTML;
  }

  function fixIntroNodes(container) {
    const root = container && container.nodeType === 1 ? container : document;
    const nodes = root.querySelectorAll('[data-text="intro"]');
    if (!nodes.length) return;

    nodes.forEach(function(el) {
      const rawText = (el.textContent || '').trim();
      if (!rawText) return;

      const decoded = decodeHTMLEntities(rawText);

      if (!/[<][a-z][\s\S]*[>]/i.test(decoded) &&
          !/[&][a-z]+;|&#\d+;/.test(rawText)) return;

      el.innerHTML = sanitizeHTML(decoded);
    });
  }

  window.RHP = window.RHP || {};
  window.RHP.formatIntroText = fixIntroNodes;
})();
