// Studio Zissou tracking: once PostHog is loaded, tags every event with the live story and locale and captures cta_click, story_section_reached and lead_submitted.
(function () {
  'use strict';

  var DEBUG = false;
  var POLL_MS = 250;
  var POLL_MAX_MS = 10000;

  if (window.__SZ_TRACKING) return;
  window.__SZ_TRACKING = true;

  function warn(message, detail) {
    DEBUG && console.warn('[sz-tracking] ' + message, detail);
  }

  function isVisible(el) {
    return !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
  }

  function capture(posthog, event, props) {
    try {
      posthog.capture(event, props);
    } catch (error) {
      warn('capture failed', error);
    }
  }

  function register(posthog) {
    try {
      var story = 'none';
      var stories = document.querySelectorAll('[data-sz-story]');
      for (var i = 0; i < stories.length; i++) {
        if (isVisible(stories[i])) {
          story = stories[i].getAttribute('data-sz-story') || 'none';
          break;
        }
      }
      var lang = String(document.documentElement.lang || '')
        .toLowerCase()
        .slice(0, 2);
      posthog.register({ story: story, locale: lang || 'en' });
    } catch (error) {
      warn('register failed', error);
    }
  }

  function trackCtas(posthog) {
    try {
      document.body.addEventListener('click', function (event) {
        try {
          var target = event.target;
          var cta = target && typeof target.closest === 'function' ? target.closest('[data-sz-cta]') : null;
          if (!cta) return;
          capture(posthog, 'cta_click', {
            cta: cta.getAttribute('data-sz-cta'),
            path: window.location.pathname,
          });
        } catch (error) {
          warn('click failed', error);
        }
      });
    } catch (error) {
      warn('cta setup failed', error);
    }
  }

  function trackSection(posthog) {
    try {
      var frame = document.querySelector('[data-sz="frame-start"]');
      if (!frame || typeof window.IntersectionObserver !== 'function') return;
      var sent = false;
      var observer = new window.IntersectionObserver(function (entries) {
        try {
          for (var i = 0; i < entries.length; i++) {
            if (!entries[i].isIntersecting || sent) continue;
            sent = true;
            capture(posthog, 'story_section_reached', { path: window.location.pathname });
            observer.disconnect();
            return;
          }
        } catch (error) {
          warn('section failed', error);
        }
      });
      observer.observe(frame);
    } catch (error) {
      warn('section setup failed', error);
    }
  }

  function trackForm(posthog, form) {
    var sent = false;
    function check() {
      try {
        if (sent) return;
        var parent = form.parentElement;
        var done = parent && parent.querySelector('.w-form-done');
        if (!done || done.style.display === 'none' || !isVisible(done)) return;
        sent = true;
        capture(posthog, 'lead_submitted', {
          form: form.getAttribute('name') || form.id || 'form',
          path: window.location.pathname,
        });
        if (watcher) watcher.disconnect();
      } catch (error) {
        warn('form check failed', error);
      }
    }
    var watcher = null;
    try {
      if (form.parentElement && typeof window.MutationObserver === 'function') {
        watcher = new window.MutationObserver(check);
        watcher.observe(form.parentElement, {
          attributes: true,
          attributeFilter: ['style', 'class'],
          childList: true,
          subtree: true,
        });
      }
    } catch (error) {
      warn('form watch failed', error);
    }
    check();
  }

  function trackForms(posthog) {
    try {
      var forms = document.querySelectorAll('form');
      for (var i = 0; i < forms.length; i++) trackForm(posthog, forms[i]);
    } catch (error) {
      warn('forms setup failed', error);
    }
  }

  function run(posthog) {
    register(posthog);
    trackCtas(posthog);
    trackSection(posthog);
    trackForms(posthog);
  }

  function ready(posthog) {
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          run(posthog);
        });
      } else {
        run(posthog);
      }
    } catch (error) {
      warn('ready failed', error);
    }
  }

  function found() {
    var posthog = window.posthog;
    return posthog && posthog.__loaded === true ? posthog : null;
  }

  try {
    var instance = found();
    if (instance) {
      ready(instance);
    } else {
      var waited = 0;
      var timer = setInterval(function () {
        try {
          waited += POLL_MS;
          var posthog = found();
          if (posthog) {
            clearInterval(timer);
            ready(posthog);
          } else if (waited >= POLL_MAX_MS) {
            clearInterval(timer);
          }
        } catch (error) {
          clearInterval(timer);
          warn('poll failed', error);
        }
      }, POLL_MS);
    }
  } catch (error) {
    warn('start failed', error);
  }
})();
