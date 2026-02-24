Build a GSAP animation — timeline, ScrollTrigger, SplitText, or complex choreography.

## Usage
Describe what you want to animate: elements, trigger, timing, easing, and any special behaviour.

## Steps
1. Apply the `gsap-scrolltrigger` skill for all scroll-triggered animations.
2. Read existing code for the target page/section before writing.
3. Use the `code-writer` agent to produce the animation module.
4. Always wrap in `gsap.context()` for Barba cleanup.
5. Include the `prefers-reduced-motion` guard.
6. Show the GSAP CDN requirements if SplitText or other plugins are needed.

## Animation types and patterns

### Text reveal (SplitText)
```js
gsap.registerPlugin(SplitText);
const split = new SplitText(el, { type: 'lines,words' });
gsap.from(split.lines, { opacity: 0, y: 30, stagger: 0.05, duration: 0.8, ease: 'power3.out',
  scrollTrigger: { trigger: el, start: 'top 85%' }
});
```

### Pinned horizontal scroll
```js
const tl = gsap.timeline({
  scrollTrigger: { trigger: section, pin: true, scrub: 1, end: '+=200%' }
});
tl.to(track, { x: () => -(track.scrollWidth - window.innerWidth), ease: 'none' });
```

### Staggered card entrance
```js
gsap.from(cards, { opacity: 0, y: 50, stagger: 0.1, duration: 0.7, ease: 'power2.out',
  scrollTrigger: { trigger: container, start: 'top 80%' }
});
```

Always call `ScrollTrigger.refresh()` after Barba transitions and Lenis reinitialisation.
