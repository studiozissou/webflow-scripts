/**
 * NEM Life — Radio Filter Uncheck
 * Allows Finsweet CMS filter radio buttons to be unchecked
 * by clicking them again, clearing the active filter.
 */

(() => {
  const radios = document.querySelectorAll(
    '[fs-list-element="filters"] input[type="radio"]'
  );

  radios.forEach((radio) => {
    const label = radio.closest('label');
    if (!label) return;

    let wasChecked = false;

    label.addEventListener('mousedown', () => {
      wasChecked = radio.checked;
    });

    label.addEventListener('click', (e) => {
      if (wasChecked) {
        e.preventDefault();
        radio.checked = false;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
})();
