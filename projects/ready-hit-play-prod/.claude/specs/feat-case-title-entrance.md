# feat-case-title-entrance

## Summary
Animate `.section_case-title` and its descendant H1/H6 headings on case (work) page entry. Container slides up from below with opacity fade; child headings use word-level SplitText stagger matching the about-hero logo pattern. Animation resets on page leave for clean re-entry.

## Requirements

### Container animation (`.section_case-title`)
- **Initial state:** `opacity: 0`, `y: 40px` (translated below final position)
- **Animate to:** `opacity: 1`, `y: 0`
- **Duration:** `0.8s`, ease: `power3.out`
- **Trigger:** Immediately on Barba `afterEnter` (or direct-land init) for case namespace

### Child heading animation (H1, H6 descendants)
- **Pattern:** Word-level SplitText, matching about-hero logo hover (`orchestrator.js:544-624`)
- **Initial state:** Each word at `yPercent: -100`, `opacity: 0`
- **Animate to:** `yPercent: 0`, `opacity: 1`
- **Timing:** `duration: 0.6`, ease: `power4.out`, `stagger: 0.225` per word
- **Heading delay:** H1 starts first (delay 0), H6 starts at `0.225s` delay (lineDelay pattern)
- **Overlap with container:** Child stagger begins `0.3s` after container animation starts (overlapping sequence)

### Reset on leave
- Kill all active tweens on `.section_case-title` and split words
- Revert SplitText (restore original DOM)
- Reset container to initial state (`opacity: 0`, `y: 40px`)
- This ensures clean re-animation on next case page entry

### Reduced motion
- If `prefers-reduced-motion: reduce`, skip animation entirely — set container and headings to final visible state immediately (`opacity: 1`, `y: 0`)

## Architecture

### Where the code lives
Add to `orchestrator.js` inside `RHP.views.case` IIFE — new helper functions alongside `initAboutHeroLogoHover` pattern:

```
initCaseTitleEntrance(container)   — set initial state, run animation
destroyCaseTitleEntrance()          — kill tweens, revert SplitText, reset state
```

### No new module needed
This is a page-level entrance animation, not a standalone module. It follows the same pattern as `initAboutHeroLogoHover` / `destroyAboutHeroLogoHover` — scoped helper functions inside the orchestrator views IIFE.

### Integration points

1. **`RHP.views.case.init(container)`** — Call `initCaseTitleEntrance(container)` after `RHP.earthParallax?.init?.(container)` (line 709)
2. **`RHP.views.case.destroy()`** — Call `destroyCaseTitleEntrance()` before `RHP.lenis?.stop()` (line 718)
3. **Direct-land case** (line 1007) — `RHP.views.case?.init?.(container)` already calls init, so direct-land is handled

### Implementation sketch

```js
// Scoped variables (inside views IIFE)
let caseTitleSplits = [];
let caseTitleCtx = null;

function initCaseTitleEntrance(container) {
  const gsap = window.gsap;
  const SplitText = window.SplitText;
  if (!gsap) return;

  const section = container?.querySelector('.section_case-title') ||
                  document.querySelector('.section_case-title');
  if (!section) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Query headings: H1 first, then H6
  const h1s = Array.from(section.querySelectorAll('h1'));
  const h6s = Array.from(section.querySelectorAll('h6'));
  const headings = [...h1s, ...h6s];

  if (reducedMotion) {
    gsap.set(section, { opacity: 1, y: 0 });
    headings.forEach(h => gsap.set(h, { opacity: 1 }));
    return;
  }

  caseTitleCtx = gsap.context(() => {
    // Container: initial state
    gsap.set(section, { opacity: 0, y: 40 });

    // SplitText on headings (if SplitText available)
    if (SplitText) {
      headings.forEach(h => {
        // Add role="group" for ARIA before splitting (GSAP SplitText adds aria-label)
        if (!h.getAttribute('role')) h.setAttribute('role', 'group');
        try {
          const split = new SplitText(h, { type: 'words', wordsClass: 'case-title-word' });
          if (split.words?.length) {
            gsap.set(split.words, { yPercent: -100, opacity: 0 });
          }
          gsap.set(h, { opacity: 1 }); // heading visible, words hidden
          caseTitleSplits.push({ split, el: h });
        } catch (e) {}
      });
    } else {
      // Fallback: no SplitText — stagger headings as whole elements
      headings.forEach(h => gsap.set(h, { opacity: 0, y: 20 }));
    }

    // Container slide-up
    gsap.to(section, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });

    // Word stagger (overlapping — starts 0.3s after container)
    const wordDuration = 0.6;
    const wordStagger = 0.225;
    const lineDelay = 0.225;
    const overlapDelay = 0.3;

    if (SplitText && caseTitleSplits.length) {
      caseTitleSplits.forEach(({ split, el }, idx) => {
        const delay = overlapDelay + (idx * lineDelay);
        if (split.words?.length) {
          gsap.to(split.words, {
            yPercent: 0, opacity: 1,
            duration: wordDuration, ease: 'power4.out',
            stagger: wordStagger, delay
          });
        }
      });
    } else {
      // Fallback stagger
      headings.forEach((h, idx) => {
        gsap.to(h, {
          opacity: 1, y: 0,
          duration: 0.6, ease: 'power4.out',
          delay: overlapDelay + (idx * lineDelay)
        });
      });
    }
  }, section);
}

function destroyCaseTitleEntrance() {
  const gsap = window.gsap;
  if (caseTitleCtx) {
    caseTitleCtx.revert();
    caseTitleCtx = null;
  }
  // Revert SplitText instances
  caseTitleSplits.forEach(({ split }) => {
    try { split.revert(); } catch (e) {}
  });
  caseTitleSplits = [];

  // Reset to initial hidden state for next entry
  const section = document.querySelector('.section_case-title');
  if (section && gsap) {
    gsap.set(section, { opacity: 0, y: 40 });
  }
}
```

## Barba Impact

1. **Init/Destroy lifecycle:** Yes — adds `initCaseTitleEntrance(container)` / `destroyCaseTitleEntrance()` called from `RHP.views.case.init()` / `RHP.views.case.destroy()`. Wrapped in `gsap.context()` for clean revert.

2. **State survival:** No cross-transition state needed. Animation is stateless — always resets to initial on destroy, always plays fresh on init.

3. **Transition interference:** Low risk. `.section_case-title` is inside the Barba container (inside `.dial_layer-fg`). The dial morph animation in `leave()` operates on `#fg-video-wrap` and `.dial_component` — no overlap. Container `opacity: 0` initial state means it won't flash during transition.

4. **Re-entry correctness:** `destroy()` reverts SplitText (restores original DOM), kills gsap.context, and resets inline styles to hidden. Next `init()` starts fresh. Safe for home → case → home → case loops.

5. **Namespace scoping:** Case only. `RHP.views.case.init` / `.destroy` gate this. Will not run on home, about, or contact.

## Tasks

1. **Implement `initCaseTitleEntrance` + `destroyCaseTitleEntrance`** in `orchestrator.js` — Add scoped vars and two functions inside the views IIFE, wire into `RHP.views.case.init()` / `.destroy()`.
2. **Add CSS for `.case-title-word`** — `display: inline-block` (SplitText words need this for transform). Add to `ready-hit-play.css`.
3. **Test & verify** — Run acceptance tests, check Barba lifecycle (case → home → case), check reduced motion, check direct-land.

## Parallelisation Map

| Task | Agent | Dependencies | Est. tokens |
|------|-------|-------------|-------------|
| 1. Implement JS | code-writer | None | ~2k |
| 2. Add CSS | code-writer | None | ~200 |
| 3. Acceptance tests | qa | 1, 2 | ~1k |

Tasks 1 + 2 can run in parallel (same agent, different files). Task 3 gates on both.
**Recommendation:** Sequential — small scope, single agent, <30 min total.

## Namespace rename (separate task)

The "case" → "work" namespace rename is intentionally excluded from this plan. It touches 30+ references across JS, CSS, Webflow Designer attributes, and documentation. Added as a separate queue item: `refactor-case-to-work-namespace`.

## Verification

1. Navigate to any case/work page → `.section_case-title` slides up with word-level stagger
2. Navigate away (to home or about) → no errors in console
3. Navigate back to a case page → animation plays again cleanly (no doubled words, no stuck opacity)
4. Direct-land on a case page URL → animation plays
5. Enable `prefers-reduced-motion` → title visible immediately, no animation
6. Run `npm run test:smoke` → no regressions
7. Run acceptance tests → all pass

## Acceptance Tests

See `tests/acceptance/feat-case-title-entrance.spec.js`:

1. `section_case-title is present on case page`
2. `section_case-title is visible after animation settle`
3. `H1 heading is visible after animation settle`
4. `H6 heading is visible after animation settle`
5. `no JS errors on case page load`
6. `navigate away and back: animation replays cleanly`
7. `direct-land on case page: title animates in`
8. `reduced motion: title visible immediately`
