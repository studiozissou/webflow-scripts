<!-- Make/Model selection -->
<script>
  window.FinsweetAttributes = window.FinsweetAttributes || [];
  window.FinsweetAttributes.push([
    'list',
    (listInstances) => {
      const [listInstance] = listInstances;

      // Your code that queries items and sets up dropdowns
      initMakeModelFilters();

      // Optional: re-run if more items load (pagination/infinite)
      listInstance.addHook('render', () => {
        initMakeModelFilters();
      });
    }
  ]);

  function initMakeModelFilters() {
    const items = $('.model-data').map(function () {
      return {
        model: $(this).attr('model-title'),
        make: $(this).attr('make-title')
      };
    }).get();

    const $makeDropdown = $('[name="cars_make_equal"]');
    const $modelDropdown = $('[name="cars_model_equal"]');
    if (!$makeDropdown.length || !$modelDropdown.length) return;

    $makeDropdown.off('change').html('<option value="" selected>Any make</option>');
    $modelDropdown.off('change').html('<option value="">Any model</option>').prop('disabled', true).addClass('is-disabled');

    const uniqueMakes = [...new Set(items.map(i => i.make))].sort();
		uniqueMakes.forEach(make => {
 			$makeDropdown.append(`<option value="${make}">${make}</option>`);
		});

    $makeDropdown.on('change', function () {
      const selectedMake = this.value;
      const filtered = items.filter(i => i.make === selectedMake);
      if (!filtered.length) {
        $modelDropdown.html('<option value="">Any model</option>').prop('disabled', true).addClass('is-disabled');
        return;
      }
      $modelDropdown.html('<option value="">Any model</option>')
        .prop('disabled', false)
        .removeClass('is-disabled');
      filtered.forEach(i =>
        $modelDropdown.append(`<option value="${i.model}">${i.model}</option>`)
      );
    });

    $modelDropdown.on('change', function () {
      const selected = this.value;
      // Your optional model-selection logic
    });
  }
</script>

<!-- Show search button while form is loading -->
<script>
$(document).ready(function(){
  function checkBtnState(){
    if($('#search-submit').prop('disabled')){
      // show instant button
      $('#search-instant').css('display','flex');
      $('#search-submit').css('display','none');
    } else {
      // show submit button
      $('#search-instant').css('display','none');
      $('#search-submit').css('display','flex');
    }
  }

  // run on load
  checkBtnState();

  // observe changes to disabled attribute
  const observer = new MutationObserver(checkBtnState);
  observer.observe(document.getElementById('search-submit'), {
    attributes: true,
    attributeFilter: ['disabled']
  });
});
</script>

<!-- Clear non-relevant field on price tab change -->
<script>
// When monthly tab clicked, clear full input
$('#price-monthly-tab').on('click', function(){
  $('#input-price-full').val('');
});

// When full tab clicked, clear monthly input
$('#price-full-tab').on('click', function(){
  $('#input-price-monthly').val('');
});
</script>

<!-- Update and open the link for PX form -->
<script>
/* Build PX links using stored UTMs + external referrer domain (fallbacks included) */
$(function () {
  const HOST = location.hostname.replace(/^www\./,''); // normalize your domain

  // Get attribution (prefer session last-touch, then local first-touch, then URL/referrer)
  function getAttributionParams(){
    const pick = (k)=>{ try{ return JSON.parse(k.getItem('attribution_session')||'null') || JSON.parse(k.getItem('attribution')||'null'); }catch(_){ return null; } };
    const ss = pick(sessionStorage) || {};
    const ls = pick(localStorage)  || {};
    const utms = (ss.utms && Object.keys(ss.utms).length ? ss.utms : (ls.utms||{}));
    let refDomain = ss.referrerDomain || ls.referrerDomain || '';
    if(!refDomain && document.referrer){
      try{
        const d = new URL(document.referrer).hostname.replace(/^www\./,'');
        if(!(d===HOST || d.endsWith('.'+HOST))) refDomain = d; // exclude self-referral
      }catch(_){}
    }
    const params = {...utms};
    if(refDomain) params.referrer = refDomain; // domain only
    return params;
  }

  // Append params to a URL without duplicating keys
  function addParams(url, obj){
    try{
      const u = new URL(url, location.origin);
      for(const k in obj){ if(!u.searchParams.has(k)) u.searchParams.set(k, obj[k]); }
      return u.toString();
    }catch(_){
      const hasQ = url.indexOf('?')>-1, parts=[];
      for(const k in obj){ if(!new RegExp('([?&])'+k+'=').test(url)) parts.push(k+'='+encodeURIComponent(obj[k])); }
      return parts.length ? url + (hasQ?'&':'?') + parts.join('&') : url;
    }
  }

  // Generate the full valuation URL with params
  function generatePxURL(pxVrm){
    const base = 'https://quote.carsa.co.uk/value-my-car/enter-vrm?px_vrm=' + encodeURIComponent(pxVrm);
    return addParams(base, getAttributionParams());
  }

  // Update button href from form value
  function updateButtonHref($form, $btn){
    const vrm = $form.find('[name="px-vrm"]').val();
    if(!vrm) return;
    $btn.attr('href', generatePxURL(vrm)).attr('target','_blank'); // open in new tab
  }

  // Enter key -> build + click
  $('#px-form-large input, #px-form-small input').on('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); const $f=$(this).closest('form'); const $b=$f.find('a'); updateButtonHref($f,$b); $b[0].click(); }
  });

  // Form submit -> build + click
  $('#px-form-large, #px-form-small').on('submit', function(e){
    e.preventDefault(); const $b=$(this).find('a'); updateButtonHref($(this), $b); $b[0].click();
  });

  // Button clicks -> ensure latest href
  $('#px-button-large').on('click', function(){ updateButtonHref($('#px-form-large'), $(this)); });
  $('#px-button-small').on('click', function(){ updateButtonHref($('#px-form-small'), $(this)); });

  // Live update on input
  $('#px-form-large [name="px-vrm"]').on('input', function(){ updateButtonHref($('#px-form-large'), $('#px-button-large')); });
  $('#px-form-small [name="px-vrm"]').on('input', function(){ updateButtonHref($('#px-form-small'), $('#px-button-small')); });
});
</script>

<!-- Set all Car Cards to the height of tallest -->
<script>
  function setEqualHeight() {
    let $cards = $('[data-card-height="equal"]'); // select only cards with attribute
    let maxH = 0;
    $cards.css('height', 'auto'); // reset height
    $cards.each(function () {
      maxH = Math.max(maxH, $(this).outerHeight()); // find tallest
    });
    $cards.height(maxH); // set all to tallest
  }

  $(window).on('load resize', setEqualHeight); // run on load and resize
</script>

<!-- SVG Animations -->
<!-- Draw lines -->
<script>
// Unified GSAP "draw-line" (single or multiple paths)
// Applies ONLY to wrappers: [data-svg="draw-line"]
// Options: data-svg-start="auto|scroll" (default: auto), data-svg-duration="2" (seconds)

$(function () {
  if (typeof gsap === "undefined") return;
  if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  // Track the first user scroll (used when start=scroll AND element is already past on load)
  let userHasScrolled = false;
  window.addEventListener('scroll', function onFirstScroll(){
    userHasScrolled = true;
    window.removeEventListener('scroll', onFirstScroll);
  }, { passive: true });

  // Target ONLY draw-line wrappers
  const wrappers = Array.from(new Set($('[data-svg="draw-line"]').get()));
  wrappers.forEach(function(wrapper){
    const $w = $(wrapper);
    if ($w.data('svgDrawInit')) return; // prevent double init per wrapper
    $w.data('svgDrawInit', true);

    // Per-wrapper config
    const startMode = (wrapper.getAttribute('data-svg-start') || 'auto').toLowerCase(); // 'auto' | 'scroll'
    const totalDur  = Math.max(0.001, parseFloat(wrapper.getAttribute('data-svg-duration')) || 2); // default 2s

    // All descendant SVGs
    const svgs = Array.from(wrapper.querySelectorAll('svg'));
    if (!svgs.length) return;

    svgs.forEach(function(svg){
      // Collect stroked shapes (works for 1 or many)
      const els = Array.from(svg.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect')).filter(function(el){
        const cs = getComputedStyle(el);
        return cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0;
      });
      if (!els.length) return;

      // Prime dashes + measure lengths (for proportional timing)
      let totalLen = 0;
      els.forEach(function(el){
        let len = 0;
        try { len = (typeof el.getTotalLength === 'function') ? el.getTotalLength() : 0; } catch(e){ len = 0; }
        if (!isFinite(len) || len <= 0) {
          const b = el.getBBox?.();
          len = (b && isFinite(b.width) && isFinite(b.height)) ? 2*(b.width + b.height) : 1000;
        }
        el.style.strokeDasharray = `${len} ${len}`;
        el.style.strokeDashoffset = `${len}`;
        el.__svgDrawLen = len;
        totalLen += len;
      });
      if (totalLen <= 0) totalLen = els.length || 1;

      // Build linear child timeline (each path sequential, duration proportional to length)
      const tl = gsap.timeline({ paused: true });
      els.forEach(function(el){
        const seg = (el.__svgDrawLen / totalLen) * totalDur; // seconds
        tl.to(el, { strokeDashoffset: 0, duration: seg, ease: "none" }, ">");
      });

      // Driver tween sets overall duration + smooth in/out
      const driver = gsap.to(tl, { progress: 1, duration: totalDur, ease: "power1.inOut", paused: true });

      // Helpers
      const playNow = () => gsap.delayedCall(0.2, () => driver.play()); // +200ms
      const playAfterFirstScroll = () => {
        if (userHasScrolled) playNow();
        else {
          const handler = () => { window.removeEventListener('scroll', handler); userHasScrolled = true; playNow(); };
          window.addEventListener('scroll', handler, { passive: true });
        }
      };

      // 20% viewport threshold ≈ "top 80%"
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const r0 = svg.getBoundingClientRect();
      const pastOnLoad = (r0.top <= vh * 0.8 && r0.bottom >= 0);

      // IMPORTANT FIX: if already past on load, DO NOT create ScrollTrigger — decide immediately.
      if (pastOnLoad) {
        (startMode === 'scroll') ? playAfterFirstScroll() : playNow();
        return;
      }

      // Otherwise, normal trigger behavior
      if (typeof ScrollTrigger !== "undefined") {
        ScrollTrigger.create({
          trigger: svg,
          start: "top 80%",
          once: true,
          onEnter: () => playNow()
        });
      } else {
        // Fallback without ScrollTrigger
        const onScroll = () => {
          const r = svg.getBoundingClientRect();
          const enters = r.top <= vh * 0.8 && r.bottom >= 0;
          if (!enters) return;
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
          playNow();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        onScroll(); // initial check
      }
    });
  });
});
</script>

<!-- Draw shapes -->
<script>
// Unified "grow & pop-up" for wrappers: [data-svg="draw-shape"]
// Options: data-svg-start="auto|scroll" (default auto), data-svg-duration="2" (seconds)

$(function () {
  if (typeof gsap === "undefined") return;
  if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  // track first user scroll (used when start=scroll and already past on load)
  let userHasScrolled = false;
  window.addEventListener('scroll', function onFirstScroll(){
    userHasScrolled = true; window.removeEventListener('scroll', onFirstScroll);
  }, { passive:true });

  // ONLY target draw-shape wrappers
  const wrappers = Array.from(new Set($('[data-svg="draw-shape"]').get()));
  wrappers.forEach(function(wrapper){
    const $w = $(wrapper);
    if ($w.data('svgPopInit')) return; $w.data('svgPopInit', true);

    const startMode = (wrapper.getAttribute('data-svg-start') || 'auto').toLowerCase(); // 'auto'|'scroll'
    const totalDur  = Math.max(0.001, parseFloat(wrapper.getAttribute('data-svg-duration')) || 2); // default 2s

    // all descendant SVGs
    const svgs = Array.from(wrapper.querySelectorAll('svg'));
    if (!svgs.length) return;

    svgs.forEach(function(svg){
      // shapes to animate
      const els = Array.from(svg.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect'));
      if (!els.length) return;

      // initial state: below + scaled down + hidden
      gsap.set(els, { y:24, scale:0, opacity:0, transformOrigin:"50% 50%", transformBox:"fill-box" });

      // child timeline: sequential, linear per item; total = totalDur
      const tl = gsap.timeline({ paused:true });
      const seg = totalDur / els.length;
      els.forEach(el => tl.to(el, { y:0, scale:1, opacity:1, duration:seg, ease:"none" }, ">"));

      // driver tween gives global in/out ease + exact total time
      const driver = gsap.to(tl, { progress:1, duration:totalDur, ease:"power1.inOut", paused:true });

      // helpers
      const playNow = () => gsap.delayedCall(0.2, () => driver.play()); // +200ms delay
      const playAfterFirstScroll = () => {
        if (userHasScrolled) playNow();
        else {
          const h = () => { window.removeEventListener('scroll', h); userHasScrolled = true; playNow(); };
          window.addEventListener('scroll', h, { passive:true });
        }
      };

      // threshold (≈ "top 80%")
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const r0 = svg.getBoundingClientRect();
      const pastOnLoad = (r0.top <= vh * 0.8 && r0.bottom >= 0);

      // If already past on load, decide immediately (fixes start=scroll reliability)
      if (pastOnLoad) { (startMode === 'scroll') ? playAfterFirstScroll() : playNow(); return; }

      // Otherwise, set up trigger
      if (typeof ScrollTrigger !== "undefined") {
        ScrollTrigger.create({
          trigger: svg,
          start: "top 80%",
          once: true,
          onEnter: () => playNow()
        });
      } else {
        // fallback without ScrollTrigger
        const onScroll = () => {
          const r = svg.getBoundingClientRect();
          const enters = r.top <= vh * 0.8 && r.bottom >= 0;
          if (!enters) return;
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
          playNow();
        };
        window.addEventListener('scroll', onScroll, { passive:true });
        window.addEventListener('resize', onScroll);
        onScroll(); // initial check
      }
    });
  });
});
</script>

<!-- Update and open the link for Instant Valuation form -->
<script>
/* Build valuation links using stored UTMs + external referrer domain (fallbacks included) */
$(function () {
  const HOST = location.hostname.replace(/^www\./,'');

  function getAttributionParams(){
    const pick = (s)=>{ try{ return JSON.parse(s.getItem('attribution_session')||'null') || JSON.parse(s.getItem('attribution')||'null'); }catch(_){ return null; } };
    const ss = pick(sessionStorage) || {};
    const ls = pick(localStorage)  || {};
    const utms = (ss.utms && Object.keys(ss.utms).length ? ss.utms : (ls.utms||{}));
    let refDomain = ss.referrerDomain || ls.referrerDomain || '';
    if(!refDomain && document.referrer){
      try{
        const d = new URL(document.referrer).hostname.replace(/^www\./,'');
        if(!(d===HOST || d.endsWith('.'+HOST))) refDomain = d;
      }catch(_){}
    }
    const params = {...utms};
    if(refDomain) params.referrer = refDomain;
    return params;
  }

  function addParams(url, obj){
    const u = new URL(url, location.origin);
    for(const k in obj){ if(!u.searchParams.has(k)) u.searchParams.set(k, obj[k]); }
    return u.toString();
  }

  function generateOrderURL(vrm, mileage){
    const base = 'https://sellcar.carsa.co.uk/new-order?vrm=' + encodeURIComponent(vrm)
               + '&mileage=' + encodeURIComponent(mileage || '');
    return addParams(base, getAttributionParams());
  }

  function getFormValues($form){
    const vrm = ($form.find('[name="vrm"]').first().val() || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '');
    const mileage = ($form.find('[name="mileage"]').first().val() || '').trim();
    return { vrm, mileage };
  }

  function setHref($trigger){
    const $form = $trigger.closest('form');
    if(!$form.length) return null;
    const { vrm, mileage } = getFormValues($form);
    if(!vrm) return null;
    const url = generateOrderURL(vrm, mileage);
    if($trigger.is('a')) $trigger.attr({ href: url, target: '_blank' });
    return url;
  }

  $(document).on('click', '[data-link="valuation"]', function(e){
    const url = setHref($(this));
    if(!url) return;
    if(!$(this).is('a')){
      e.preventDefault();
      window.open(url, '_blank', 'noopener');
    }
  });

  $(document).on('keydown', 'form input', function(e){
    if(e.key !== 'Enter') return;
    const $form = $(this).closest('form');
    const $trigger = $form.find('[data-link="valuation"]').first();
    if(!$trigger.length) return;
    e.preventDefault();
    const url = setHref($trigger);
    if(url && !$trigger.is('a')) window.open(url, '_blank', 'noopener');
    else if(url) $trigger[0].click();
  });

  $(document).on('input', 'form [name="vrm"], form [name="mileage"]', function(){
    const $form = $(this).closest('form');
    $form.find('[data-link="valuation"]').each(function(){ setHref($(this)); });
  });
});
</script>