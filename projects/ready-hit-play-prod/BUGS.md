# RHP — Bug & Task Backlog

## Barba Transitions — Video Persistence

### B1: bg + fg videos destroyed after home -> work transition
- **Status:** Open
- **Area:** orchestrator / work-dial / Barba transitions
- bg and fg videos should persist during and after home -> work transition. Currently destroyed after transition completes. Same issue for work -> home.

### B2: fg video shows as circle during home -> work transition
- **Status:** Open
- **Area:** CSS / orchestrator transition
- fg video appears circular instead of rectangular. Needs to fill the height specified in the code that sets the top/hero video height on work pages (leaves room at bottom for page title).

### B3: videos don't autoplay on work pages after Barba transition
- **Status:** Open
- **Area:** orchestrator / Barba enter hooks
- Work page videos stop autoplaying when navigated to via Barba. Likely missing play() calls in afterEnter or video elements not re-initialized.

### B4: bg/fg video switching inconsistent after Barba transition
- **Status:** Open
- **Area:** work-dial video pool
- Link and UI switch correctly, but video doesn't follow. Likely a video pool state issue — pool references stale after transition.

## Barba Transitions — About Page

### B5: scroll broken + GSAP content reveal stuck hidden on about page
- **Status:** Open
- **Area:** orchestrator / lenis-manager / about namespace
- After namespace HTML update: scroll doesn't work, GSAP content reveal animations stay hidden, HIT logo animation doesn't trigger. All broken following namespace restructure.

### B6: work -> about: .dial_layer-fg should scroll to top
- **Status:** Open
- **Area:** orchestrator transition
- On work -> about, fg layer should scroll to top. After transition, homepage should show the just-visited project with dial in active state. Revert to normal dial on mouse move.

### B7: about -> home: transition layer fades out too early
- **Status:** Open
- **Area:** orchestrator / about-transition-persist
- Transition overlay fades before the transition completes, causing a flash of the about page large logo. Also, transition logo doesn't quite reach its destination position.

### B8: dial missing inside .about_dial-link after work -> about transition
- **Status:** Open
- **Area:** orchestrator / about-dial-ticks
- After work -> about transition, the small dial inside `.about_dial-link` doesn't render.

## Mobile

### M1: upgrade dial for mobile (spec TBD)
- **Status:** Blocked — waiting for spec
- **Area:** work-dial / CSS
- Upgrade dial interaction to work on mobile per spec (to be provided).

### M2: autoplay video fallback for mobile
- **Status:** Open
- **Area:** work-dial / work pages / orchestrator
- Figure out fallback when autoplay is blocked: homepage fg/bg, work hero, work laptop videos, work column layout videos.

### M3: mobile responsiveness
- **Status:** Open
- **Area:** CSS / all modules
- General mobile responsiveness pass.

## Design / Content Updates

### D1: update laptop mockups
- **Status:** Open
- **Area:** assets / work pages
- Replace current laptop mockup images/videos with updated versions.

### D2: about page team section animations
- **Status:** Open
- **Area:** about namespace / GSAP
- Add animations to the team section on the about page.

### D3: video title responsive scale
- **Status:** Open
- **Area:** CSS / work pages
- Video title text needs responsive scaling across breakpoints.

## Performance

### P1: video quality optimization
- **Status:** Open
- **Area:** assets / work-dial
- Add lower quality videos for bg. Tighten fg video resolution. Reduce bandwidth / decode overhead.
