/* =========================================
   RHP — Case Video Controls
   Wires play/pause + mute/unmute icon pairs to video.video-cover
   in every .section_case-video block on case study pages.
   ========================================= */
(() => {
  const VERSION = '2026.2.25.1';
  window.RHP = window.RHP || {};

  const cleanups = [];

  function syncIcons(video, playPause, muteUnmute) {
    const playIcon   = playPause.querySelector('.is-play');
    const pauseIcon  = playPause.querySelector('.is-pause');
    const muteIcon   = muteUnmute.querySelector('.is-mute');
    const unmuteIcon = muteUnmute.querySelector('.is-unmute');

    if (playIcon)   playIcon.style.display   = video.paused  ? 'flex' : 'none';
    if (pauseIcon)  pauseIcon.style.display  = video.paused  ? 'none' : 'flex';
    if (muteIcon)   muteIcon.style.display   = video.muted   ? 'none' : 'flex';
    if (unmuteIcon) unmuteIcon.style.display = video.muted   ? 'flex' : 'none';
  }

  function wireSection(section) {
    const video      = section.querySelector('video.video-cover');
    const playPause  = section.querySelector('.play-pause');
    const muteUnmute = section.querySelector('.mute-unmute');

    if (!video || !playPause || !muteUnmute) return;

    syncIcons(video, playPause, muteUnmute);

    const onPlayPauseClick = () => {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    };

    const onMuteUnmuteClick = () => {
      video.muted = !video.muted;
      syncIcons(video, playPause, muteUnmute);
    };

    const onPlayPause  = () => syncIcons(video, playPause, muteUnmute);
    const onVolumeChange = () => syncIcons(video, playPause, muteUnmute);

    playPause.addEventListener('click', onPlayPauseClick);
    muteUnmute.addEventListener('click', onMuteUnmuteClick);
    video.addEventListener('play',         onPlayPause);
    video.addEventListener('pause',        onPlayPause);
    video.addEventListener('volumechange', onVolumeChange);

    cleanups.push(() => {
      playPause.removeEventListener('click', onPlayPauseClick);
      muteUnmute.removeEventListener('click', onMuteUnmuteClick);
      video.removeEventListener('play',         onPlayPause);
      video.removeEventListener('pause',        onPlayPause);
      video.removeEventListener('volumechange', onVolumeChange);
    });
  }

  function init(container) {
    const ctx = container || document;
    const sections = ctx.querySelectorAll('.section_case-video');
    sections.forEach(wireSection);
  }

  function destroy() {
    cleanups.forEach(fn => fn());
    cleanups.length = 0;
  }

  window.RHP.caseVideoControls = { init, destroy, version: VERSION };
})();
