# Skill: Howler.js

## CDN
```html
<script src="https://cdn.jsdelivr.net/npm/howler@2/dist/howler.min.js"></script>
```

## Basic sound setup
```js
const AudioManager = (() => {
  let bgMusic, sfxPool;

  function init() {
    bgMusic = new Howl({
      src: ['/audio/ambient.webm', '/audio/ambient.mp3'],
      loop: true,
      volume: 0,
      autoplay: false,
    });

    sfxPool = {
      click: new Howl({ src: ['/audio/click.webm', '/audio/click.mp3'], volume: 0.6 }),
      hover: new Howl({ src: ['/audio/hover.webm', '/audio/hover.mp3'], volume: 0.3 }),
    };
  }

  function playBg() {
    bgMusic.play();
    bgMusic.fade(0, 0.4, 1000);
  }

  function pauseBg() {
    bgMusic.fade(0.4, 0, 500);
    setTimeout(() => bgMusic.pause(), 500);
  }

  function playSfx(name) {
    sfxPool[name]?.play();
  }

  function destroy() {
    bgMusic?.unload();
    Object.values(sfxPool || {}).forEach(s => s.unload());
  }

  return { init, playBg, pauseBg, playSfx, destroy };
})();
```

## Mute/unmute toggle
```js
let muted = false;

muteBtn.addEventListener('click', () => {
  muted = !muted;
  Howler.mute(muted);
  muteBtn.setAttribute('aria-pressed', muted);
  muteBtn.textContent = muted ? 'Unmute' : 'Mute';
});
```

## Web Audio policy (autoplay)
Browsers block autoplay audio without user interaction. Pattern:
```js
document.addEventListener('click', () => {
  if (Howler.ctx.state === 'suspended') {
    Howler.ctx.resume().then(() => AudioManager.playBg());
  }
}, { once: true });
```

## Spatial audio (3D)
```js
const sound = new Howl({
  src: ['/audio/wind.webm'],
  loop: true,
  pannerAttr: { panningModel: 'HRTF', refDistance: 1, rolloffFactor: 1 },
});
sound.pos(x, y, z); // position in 3D space
Howler.pos(listenerX, listenerY, listenerZ); // listener position
```

## Formats
Always provide both WebM (Opus) and MP3 for compatibility:
- WebM/Opus: smaller, better quality
- MP3: Safari fallback (Safari supports WebM since 16.4 but MP3 is safer)

## Barba cleanup
```js
barba.hooks.before(() => {
  AudioManager.pauseBg();
});
barba.hooks.after(() => {
  // Re-init or resume as appropriate for the new page
});
// On final destroy:
AudioManager.destroy();
```

## Accessibility
- Always provide a visible mute/unmute control
- Never autoplay audio without user consent
- Indicate audio is playing with a visual state change on the button
- Use `aria-pressed` on toggle buttons
