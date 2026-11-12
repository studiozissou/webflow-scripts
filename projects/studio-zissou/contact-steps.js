// Team Zissou stepped contact form: shows one [data-sz-step] row at a time with progress, Back, per-step validation, focus moves and Webflow sent/fail handling.
(() => {
  'use strict';

  const DEBUG = false;

  const isKey = (e) => e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar';

  const isShown = (el) => {
    if (typeof window.getComputedStyle === 'function') return window.getComputedStyle(el).display !== 'none';
    return el.style.display === 'block';
  };

  const onActivate = (el, fn) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      fn();
    });
    if (el.tagName === 'BUTTON') return;
    el.addEventListener('keydown', (e) => {
      if (!isKey(e)) return;
      e.preventDefault();
      fn();
    });
  };

  const setup = (root) => {
    if (root.hasAttribute('data-sz-steps-ready')) return;
    const form = root.querySelector('form');
    const steps = [...root.querySelectorAll('[data-sz-step]')];
    if (!form || steps.length < 2) return;
    root.setAttribute('data-sz-steps-ready', '');

    const total = steps.length;
    const count = root.querySelector('[data-sz="contact-count"]');
    const segments = [...root.querySelectorAll('[data-sz="contact-segment"]')];
    const back = root.querySelector('[data-sz="contact-back"]');
    const needError = root.querySelector('[data-sz="contact-need-error"]');
    const submit = form.querySelector('input[type="submit"], button[type="submit"]');
    const done = root.querySelector('.w-form-done');
    const fail = root.querySelector('.w-form-fail');
    const doneHeading = root.querySelector('[data-sz="contact-done"]');
    const failHeading = root.querySelector('[data-sz="contact-fail"]');
    let current = 1;

    const controls = (step) =>
      [...step.querySelectorAll('input, select, textarea')].filter((c) => c.type !== 'hidden');
    const boxes = (step) => [...step.querySelectorAll('input[type="checkbox"]')];
    const missingOne = (step) => step.hasAttribute('data-sz-require-one') && !boxes(step).some((b) => b.checked);
    const isValid = (step) => !missingOne(step) && controls(step).every((c) => c.checkValidity());

    const report = (step) => {
      const bad = controls(step).find((c) => !c.checkValidity());
      if (bad) {
        bad.reportValidity();
        return false;
      }
      if (missingOne(step)) {
        if (needError) needError.hidden = false;
        const first = boxes(step)[0];
        if (first) first.focus();
        return false;
      }
      return true;
    };

    const progress = (n) => {
      if (count) count.textContent = n + ' of ' + total;
      segments.forEach((s, i) => s.classList.toggle('is-active', i < n));
    };

    const show = (n, { focus }) => {
      current = n;
      steps.forEach((s, i) => {
        s.hidden = i !== n - 1;
      });
      progress(n);
      if (back) back.hidden = n === 1;
      if (submit) submit.hidden = n !== total;
      if (!focus) return;
      const first = controls(steps[n - 1])[0];
      if (first) first.focus();
    };

    const clearFail = () => {
      if (fail) fail.style.display = 'none';
    };

    const next = () => {
      if (current >= total || !report(steps[current - 1])) return;
      show(current + 1, { focus: true });
    };

    const previous = () => {
      if (current <= 1) return;
      clearFail();
      show(current - 1, { focus: true });
    };

    root.querySelectorAll('[data-sz="contact-next"]').forEach((el) => onActivate(el, next));
    if (back) onActivate(back, previous);

    form.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target || e.target.tagName !== 'INPUT' || current >= total) return;
      e.preventDefault();
      next();
    });

    form.addEventListener('change', (e) => {
      if (needError && e.target && e.target.type === 'checkbox') needError.hidden = true;
    });

    form.addEventListener(
      'submit',
      (e) => {
        const i = steps.findIndex((s) => !isValid(s));
        if (i === -1) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        show(i + 1, { focus: false });
        report(steps[i]);
      },
      true,
    );

    const markAlert = () => {
      if (!fail || !failHeading) return;
      let n = failHeading.parentElement;
      while (n && n !== fail && n.tagName !== 'DIV') n = n.parentElement;
      if (n && n !== fail) n.setAttribute('role', 'alert');
    };

    const watch = (el, onShow) => {
      if (!el || typeof MutationObserver !== 'function') return;
      let shown = false;
      new MutationObserver(() => {
        const now = isShown(el);
        if (now && !shown) onShow();
        shown = now;
      }).observe(el, { attributes: true, attributeFilter: ['style'] });
    };

    watch(done, () => {
      progress(total);
      if (back) back.hidden = true;
      if (doneHeading) doneHeading.focus();
      DEBUG && console.log('[contact-steps] done');
    });

    watch(fail, () => {
      markAlert();
      const target = failHeading || fail;
      target.scrollIntoView({ block: 'center' });
      if (failHeading) failHeading.focus({ preventScroll: true });
      DEBUG && console.log('[contact-steps] fail');
    });

    form.noValidate = true;
    if (needError) needError.hidden = true;
    show(1, { focus: false });
    root.classList.add('is-steps');
    DEBUG && console.log('[contact-steps] ready', total);
  };

  const init = () => document.querySelectorAll('[data-sz="contact-steps"]').forEach(setup);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
