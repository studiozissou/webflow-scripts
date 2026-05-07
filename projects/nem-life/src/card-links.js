/**
 * Card Links — NEM Life
 *
 * For every [data-button="card"]:
 * 1. Find the descendant <a> and grab its href / target
 * 2. Wrap the whole card in a link (or make the card itself clickable)
 * 3. Swap the button element from <a> to <div> (removes nested link)
 * 4. Forward card :hover to the button via a CSS class
 */
(() => {
  const DEBUG = false;

  function init() {
    const buttons = document.querySelectorAll('[data-button="card"]');
    if (!buttons.length) return;

    DEBUG && console.log('[card-links] found', buttons.length, 'card buttons');

    buttons.forEach((btn) => {
      const card = btn.closest('[data-card]') || btn.parentElement;
      const link = btn.tagName === 'A' ? btn : btn.querySelector('a');
      if (!link) return;

      const href = link.href;
      const target = link.target || '_self';

      /* 1 — Make the card a clickable link */
      const cardLink = document.createElement('a');
      /* Copy ALL attributes from the original link (href, target, rel, aria-*, etc.) */
      Array.from(link.attributes).forEach((attr) => {
        cardLink.setAttribute(attr.name, attr.value);
      });
      cardLink.style.textDecoration = 'none';
      cardLink.style.color = 'inherit';
      cardLink.style.display = card.style.display || '';
      /* Copy all classes from the card (overrides any class from the link) */
      cardLink.className = card.className;

      /* Move card children into the link wrapper */
      while (card.firstChild) {
        cardLink.appendChild(card.firstChild);
      }
      card.parentNode.replaceChild(cardLink, card);

      /* 2 — Replace button <a> with a <div> to avoid nested links */
      const div = document.createElement('div');
      Array.from(link.attributes).forEach((attr) => {
        if (attr.name !== 'href' && attr.name !== 'target') {
          div.setAttribute(attr.name, attr.value);
        }
      });
      while (link.firstChild) {
        div.appendChild(link.firstChild);
      }
      link.parentNode.replaceChild(div, link);

      /* 3 — Forward card hover to button */
      const newBtn = cardLink.querySelector('[data-button="card"]') || div;
      cardLink.addEventListener('mouseenter', () => {
        newBtn.classList.add('is-hovered');
      });
      cardLink.addEventListener('mouseleave', () => {
        newBtn.classList.remove('is-hovered');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
