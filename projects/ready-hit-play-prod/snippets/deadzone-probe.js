// Paste the block below into DevTools console, then hover the fg video.
// Logs fgDist, videoR, percentage, and current work-dial state flags.
// Only logs when the cursor is within 1.1 * videoR of the fg centre.
(function () {
  var last = 0;
  window.__rhpProbe && window.removeEventListener('mousemove', window.__rhpProbe);
  window.__rhpProbe = function (e) {
    var fg = document.querySelector('.dial_layer-fg');
    if (!fg) return;
    var r = fg.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var vr = Math.min(r.width, r.height) / 2;
    var d = Math.hypot(e.clientX - cx, e.clientY - cy);
    if (d >= vr * 1.1) return;
    var now = Date.now();
    if (now - last < 100) return;
    last = now;
    console.log(
      'fgDist', Math.round(d),
      '/', Math.round(vr),
      '=', Math.round((d / vr) * 100) + '%',
      '| activeIdx:', window.RHP && window.RHP.workDial && window.RHP.workDial.getActiveIndex && window.RHP.workDial.getActiveIndex()
    );
  };
  window.addEventListener('mousemove', window.__rhpProbe, { passive: true });
  console.log('[probe armed — hover the fg video]');
})();
