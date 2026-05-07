/**
 * Card Links — NEM Life
 *
 * For every [data-button="card"]:
 * 1. Find the descendant <a> and grab its href + all attributes
 * 2. Wrap the card in an <a> with those attributes
 * 3. Swap the original button <a> to a <div> (avoids nested links)
 * 4. Forward card hover to the button via .is-hovered class
 */
(() => {
  const DEBUG = false;

  function init() {
    const cards = document.querySelectorAll('[data-button="card"]');
    if (!cards.length) return;

    DEBUG && console.log('[card-links] found', cards.length, 'cards');

    cards.forEach((card) => {
      const link = card.querySelector('a');
      if (!link) return;

      /* 1 — Create wrapper <a> with all original link attributes */
      const wrapper = document.createElement('a');
      Array.from(link.attributes).forEach((attr) => {
        wrapper.setAttribute(attr.name, attr.value);
      });
      /* Use card classes for layout, keep link attrs for behaviour */
      wrapper.className = card.className;
      wrapper.style.textDecoration = 'none';
      wrapper.style.color = 'inherit';

      /* 2 — Move card children into the wrapper */
      while (card.firstChild) {
        wrapper.appendChild(card.firstChild);
      }
      card.parentNode.replaceChild(wrapper, card);

      /* 3 — Replace button <a> with a <div> to avoid nested links */
      const btn = wrapper.querySelector('a');
      if (btn) {
        const div = document.createElement('div');
        Array.from(btn.attributes).forEach((attr) => {
          if (attr.name !== 'href' && attr.name !== 'target' && attr.name !== 'rel') {
            div.setAttribute(attr.name, attr.value);
          }
        });
        while (btn.firstChild) {
          div.appendChild(btn.firstChild);
        }
        btn.parentNode.replaceChild(div, btn);

        /* 4 — Forward card hover to button */
        wrapper.addEventListener('mouseenter', () => {
          div.classList.add('is-hovered');
        });
        wrapper.addEventListener('mouseleave', () => {
          div.classList.remove('is-hovered');
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
