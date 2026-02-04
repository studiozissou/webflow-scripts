/* =========================================
   RHP — Utility Scripts
   ========================================= */

// Make all links opening in a new tab 'noreferrer noopener'
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a[target="_blank"]');
  links.forEach(link => {
    link.setAttribute('rel', 'noreferrer noopener');
  });
});

// Update the copyright year in the footer to the current year
(function() {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.innerText = new Date().getFullYear();
  }
})();

// Add hidden fields to each form to track conversion pages and UTMs
(function() {
  if (typeof jQuery === 'undefined') return;
  
  jQuery(document).ready(function() {
    const currentUrl = window.location.href;
    
    function getUrlParams(url) {
      const params = {};
      const parser = document.createElement('a');
      parser.href = url;
      const query = parser.search.substring(1);
      const vars = query.split('&');
      
      for (let i = 0; i < vars.length; i++) {
        const pair = vars[i].split('=');
        if (pair.length === 2) {
          params[pair[0]] = decodeURIComponent(pair[1]);
        }
      }
      return params;
    }
    
    const urlParams = getUrlParams(currentUrl);
    let urlWithoutUTMs = currentUrl.split('?')[0];
    const cleanQueryParams = [];
    
    for (const key in urlParams) {
      if (!key.startsWith('utm_')) {
        cleanQueryParams.push(key + '=' + encodeURIComponent(urlParams[key]));
      }
    }
    
    if (cleanQueryParams.length > 0) {
      urlWithoutUTMs += '?' + cleanQueryParams.join('&');
    }
    
    jQuery('form').each(function() {
      const hiddenInput = jQuery('<input>')
        .attr('type', 'hidden')
        .attr('name', 'Conversion Page')
        .attr('value', urlWithoutUTMs);
      jQuery(this).append(hiddenInput);
      
      for (const key in urlParams) {
        if (key.startsWith('utm_')) {
          const utmInput = jQuery('<input>')
            .attr('type', 'hidden')
            .attr('name', key)
            .attr('value', urlParams[key]);
          jQuery(this).append(utmInput);
        }
      }
    });
  });
})();
