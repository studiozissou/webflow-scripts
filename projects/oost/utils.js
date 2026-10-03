// Site-wide helpers moved out of the Webflow footer: rel="noreferrer noopener" on new-tab links, the current year in #year, and hidden Conversion Page and utm_ fields on every form.
(function () {
  'use strict';

  var document = window.document;

  function secureNewTabLinks() {
    var links = document.querySelectorAll('a[target="_blank"]');
    for (var i = 0; i < links.length; i++)
      links[i].setAttribute('rel', 'noreferrer noopener');
  }

  function writeYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function hiddenInput(name, value) {
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    return input;
  }

  function tagForms() {
    var forms = document.querySelectorAll('form');
    if (!forms.length) return;

    var url = new URL(window.location.href);
    var page = new URL(url.origin + url.pathname);
    var utm = [];
    url.searchParams.forEach(function (value, key) {
      if (key.indexOf('utm_') === 0) utm.push([key, value]);
      else page.searchParams.set(key, value);
    });

    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];
      if (form.dataset.trackingInjected) continue;
      form.dataset.trackingInjected = 'true';
      form.append(hiddenInput('Conversion Page', page.toString()));
      for (var j = 0; j < utm.length; j++) form.append(hiddenInput(utm[j][0], utm[j][1]));
    }
  }

  function run() {
    secureNewTabLinks();
    writeYear();
    tagForms();
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', run);
  else run();
})();
