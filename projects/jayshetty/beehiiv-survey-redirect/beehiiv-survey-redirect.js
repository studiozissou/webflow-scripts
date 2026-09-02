// Sends subscribers to the beehiiv "One Final Step!" survey after a Webflow subscribe form succeeds, replacing the signup flow that beehiiv only runs for its own hosted forms.

(function () {
  "use strict";

  var DEBUG = false;

  var CONFIG = {
    surveyUrl: "",
    formSelector: "[data-beehiiv-survey]",
    emailParam: "email",
    openInNewTab: false,
    successTimeoutMs: 20000
  };

  var settings = Object.assign({}, CONFIG, window.beehiivSurveyRedirect || {});
  var pending = new WeakMap();

  function log() {
    if (!DEBUG) return;
    console.log.apply(console, ["[beehiiv-survey]"].concat([].slice.call(arguments)));
  }

  function isVisible(el) {
    if (!el) return false;
    if (typeof el.checkVisibility === "function") {
      return el.checkVisibility({ visibilityProperty: true });
    }
    var style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  }

  function findWrapper(form) {
    var node = form.parentElement;
    while (node && node !== document.body) {
      if (node.classList.contains("w-form")) return node;
      node = node.parentElement;
    }
    return form.parentElement;
  }

  function readEmail(form) {
    var field = form.querySelector('input[type="email"]');
    return field && field.value ? field.value.trim() : "";
  }

  function buildUrl(email) {
    if (!settings.surveyUrl) return "";
    if (!settings.emailParam || !email) return settings.surveyUrl;
    var url;
    try {
      url = new URL(settings.surveyUrl, window.location.href);
    } catch (err) {
      log("invalid surveyUrl", err);
      return settings.surveyUrl;
    }
    url.searchParams.set(settings.emailParam, email);
    return url.toString();
  }

  function go(url) {
    if (!url) return;
    log("navigating", url);
    if (settings.openInNewTab) {
      var win = window.open(url, "_blank", "noopener");
      if (win) return;
      log("popup blocked, falling back to same tab");
    }
    window.location.assign(url);
  }

  function watch(form) {
    if (pending.has(form)) return;

    var wrapper = findWrapper(form);
    var done = wrapper && wrapper.querySelector(".w-form-done");
    var fail = wrapper && wrapper.querySelector(".w-form-fail");

    if (!done) {
      log("no .w-form-done for form", form);
      return;
    }

    var email = readEmail(form);
    var settled = false;

    function finish(success) {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      pending.delete(form);
      if (success) go(buildUrl(email));
    }

    var observer = new MutationObserver(function () {
      if (isVisible(done)) return finish(true);
      if (isVisible(fail)) return finish(false);
    });

    observer.observe(wrapper, {
      attributes: true,
      attributeFilter: ["style", "class"],
      subtree: true
    });

    var timer = window.setTimeout(function () {
      log("timed out waiting for success state");
      finish(false);
    }, settings.successTimeoutMs);

    pending.set(form, observer);

    if (isVisible(done)) finish(true);
  }

  function onSubmit(event) {
    var form = event.target;
    if (!form || form.tagName !== "FORM") return;
    if (!form.matches(settings.formSelector)) return;
    if (!settings.surveyUrl) {
      log("no surveyUrl configured, ignoring submit");
      return;
    }
    log("tracking submit", form);
    watch(form);
  }

  document.addEventListener("submit", onSubmit, true);
})();
