# Fix: Work page CSS selectors broken after namespace restructure

## Problem
After the 2026-03-12 namespace restructure, `.dial_component` and the Barba container are in **separate DOM branches**:
- `.dial_component` → inside `section_home` (persists across transitions)
- `[data-barba="container"]` → direct child of `main-wrapper` (swapped by Barba)

CSS rules using `.dial_component[data-dial-ns="work"] .dial_video-wrap` (and similar) target elements inside the Barba container as if they're descendants of `.dial_component`. They never match. The base `.dial_video-wrap { border-radius: 999px }` wins, giving work page videos circular clipping.

## Fix
Change broken ancestor selectors from `.dial_component[data-dial-ns="work"]` to `[data-barba-namespace="work"]` for rules targeting Barba-container elements. Keep `.dial_component[...]` for rules targeting elements actually inside the dial.

### Rules to change (ready-hit-play.css)

| Line | Current selector | Target element location | New selector |
|------|-----------------|------------------------|-------------|
| 578 | `.dial_component[data-dial-ns="work"] .dial_video-wrap` | Barba container | `[data-barba-namespace="work"] .dial_video-wrap` |
| 639 | `.dial_component[data-dial-ns="work"] .video-cover` | Barba container | `[data-barba-namespace="work"] .video-cover` |
| 652 | `.dial_component[data-dial-ns="work"] .dial_layer-fg.is-case-study .section_case-video.is-header` | Barba container | `[data-barba-namespace="work"] .section_case-video.is-header` |
| 657-659 | `.dial_component[data-dial-ns="work"] .dial_layer-fg.is-case-study .section_case-video ...` | Barba container | `[data-barba-namespace="work"] .section_case-video ...` |
| 666-667 | `.dial_component[data-dial-ns="work"] .section_case-video ...` | Barba container | `[data-barba-namespace="work"] .section_case-video ...` |

### Rules to KEEP unchanged (elements inside dial_component)

| Line | Selector | Why it works |
|------|----------|-------------|
| 674 | `.dial_component[data-dial-ns="work"] #fg-video-wrap` | `#fg-video-wrap` IS inside dial |
| 678-679 | `.dial_component[data-dial-ns="work"] #fg-video-wrap .dial_fg-video/.video-cover` | Inside dial |
| 646 | `.dial_component .case-homepage-link` | Inside dial |
| 689+ | `.dial_component[data-dial-ns="work"] .dial_layer-ticks` etc. | Inside dial |

## Single file change
`projects/ready-hit-play-prod/ready-hit-play.css` — 6 selector changes, no new rules needed.
