# Skill: GSAP ScrollTrigger

## CDN
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/SplitText.min.js"></script><!-- Club GreenSock -->
```

## Setup (always do this once, globally)
```js
gsap.registerPlugin(ScrollTrigger, SplitText);
```

## Core patterns

### Fade-up on scroll
```js
gsap.from(elements, {
  opacity: 0, y: 40, duration: 0.8, stagger: 0.1, ease: 'power3.out',
  scrollTrigger: { trigger: container, start: 'top 80%', toggleActions: 'play none none none' }
});
```

### Pin + scrub (horizontal scroll)
```js
const tl = gsap.timeline({
  scrollTrigger: { trigger: section, pin: true, scrub: 1, end: '+=300%', anticipatePin: 1 }
});
tl.to(track, { x: () => -(track.scrollWidth - innerWidth), ease: 'none' });
```

### SplitText line reveal
```js
const split = new SplitText(heading, { type: 'lines', linesClass: 'line' });
gsap.set(split.lines, { overflow: 'hidden' }); // wrap in overflow:hidden parent
gsap.from(split.lines, {
  yPercent: 110, duration: 1, stagger: 0.08, ease: 'power4.out',
  scrollTrigger: { trigger: heading, start: 'top 90%' }
});
```

### Parallax
```js
gsap.to(image, {
  yPercent: -30, ease: 'none',
  scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true }
});
```

### Counter
```js
const obj = { val: 0 };
gsap.to(obj, {
  val: targetNumber, duration: 2, ease: 'power2.out',
  onUpdate: () => { el.textContent = Math.round(obj.val).toLocaleString(); },
  scrollTrigger: { trigger: el, start: 'top 85%', once: true }
});
```

## Barba cleanup (always do this)
```js
const ctx = gsap.context(() => {
  // all animations here
}, containerEl);

// in Barba leave hook:
ctx.revert();
ScrollTrigger.getAll().forEach(st => st.kill());
```

## Lenis + ScrollTrigger integration
```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);
```

## Common gotchas
- Call `ScrollTrigger.refresh()` after DOM changes (Barba transitions, dynamic content)
- Use `invalidateOnRefresh: true` for animations that depend on element dimensions
- Never create ScrollTrigger inside a `resize` listener — use `invalidateOnRefresh`
- `pin: true` adds a spacer div — account for this in layout
- `scrub: true` (boolean) = laggy; `scrub: 0.5` (number) = smoothed lag
