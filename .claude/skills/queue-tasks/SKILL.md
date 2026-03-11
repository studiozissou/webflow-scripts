---
name: queue-tasks
description: Enforces queue.json task formatting and Notion sync standards — plain-English names, no-contraction slugs, step-by-step Notion pages, and spec embedding. Activates whenever creating, updating, or syncing queue.json entries. Also activates when running /sync-notion or any command that touches queue.json.
---

<objective>
Ensure every queue.json task has a clear plain-English name, a slug that matches the name without contractions, and a well-structured Notion page with step-by-step description and embedded spec content when available.
</objective>

<template>
The canonical reference task is `rhp-case-video-progress-autohide` (Notion page 31fe1848-bb51-81da-a663-c683b95d99a2). All queue tasks should match this standard.
</template>

<rules>
## Task Name
- Write in plain English — a stranger should understand what the task does
- Use sentence-style capitalisation (not Title Case for every word)
- Colon separates the subject from the detail (e.g. "Case video: progress bar, viewport auto-pause, auto-hide controls")
- No abbreviations or shorthand (write "background" not "bg", "navigation" not "nav") unless the abbreviation IS the product name (e.g. "CMS", "CTA", "SVG")

## Slug
- No contractions (write "is not" → use full words in the slug concept, but slugs are kebab-case so just avoid contracted forms like "dont" or "cant")
- Align with the task name — someone reading the slug should be able to guess the task name
- Prefix with the project abbreviation (e.g. `rhp-`, `sz-`, `wf-`)
- Use kebab-case, keep it concise but readable
- Bad:  `sz-nav-compass` (too terse — what kind of nav?)
- Good: `sz-navigation-compass-rotary-switch`

## Notion Sync
Every queue task must be synced to Notion. When syncing:

1. Follow the `notion-dashboard` skill for property mapping (Slug, Client, Status, Priority, Type, Last Updated)
2. Write a **step-by-step description** in the Notion page body:
   - Group steps by feature area with H2 headings
   - Use numbered lists for sequential steps within each area
   - Keep steps concise — one action per line
   - Include key technical details (thresholds, durations, selectors) but not full implementation code
3. If a **spec doc** exists (check `.claude/specs/` and project-level `.claude/specs/`):
   - Embed the spec content below the step-by-step description
   - Use an H2 heading like "## Spec" to separate it
   - Convert markdown tables and code blocks to Notion-compatible format
   - If the spec is very long (>200 lines), include the Summary, Design, Implementation Steps, and Verification sections — omit verbose code examples and full DOM structures
4. End the page body with a "## Files" section listing the files to modify
5. If the task supersedes other tasks, add a "## Supersedes" section listing the old slugs
</rules>

<example>
Queue entry:
```json
{
  "id": "rhp-case-video-progress-autohide",
  "project": "ready-hit-play",
  "type": "feature",
  "priority": "P0",
  "status": "Ready to Build",
  "title": "Case video: progress bar, viewport auto-pause, auto-hide controls",
  "spec": ".claude/specs/feat-case-video-progress-autohide.md"
}
```

Notion page body:
```
Consolidates two previous tasks (viewport auto-pause + auto-hide controls) into one feature, plus adds a new progress bar.
## Progress Bar
1. Inject a clickable progress bar at the bottom of each video section with controls
2. Track background: white at 20% opacity, 0.5rem height
3. Fill: RHP teal (#05EFBF), width tracks currentTime/duration
4. Hover preview: white at 30% opacity shows where user would skip to
5. Click anywhere on track to seek video to that position
6. Cursor: pointer on track. Videos loop — bar resets on each loop
## Viewport Auto-Pause with Volume Fade
1. IntersectionObserver (threshold 0.3) on each controlled video section
2. Out of viewport: fade volume to 0 over 0.5s via GSAP, then pause
3. Back in viewport: play, then fade volume back up over 0.5s
4. Respect manual pause — if user clicked pause, do not auto-resume
5. If video is muted, skip volume fade and just pause/play directly
## Auto-Hide Controls on Inactivity
1. Desktop: 2s mouse idle -> fade out controls + progress bar. Mouse move -> fade in, restart timer
2. Mobile (hover:none, pointer:coarse): tap-to-toggle controls. 3s auto-hide after last tap
3. Hidden cursor while controls are hidden (desktop)
4. Tapping play/pause/mute on mobile does NOT trigger the hide/show toggle
## Barba Safety
- All RAF loops, IO observers, timers, and GSAP tweens killed in destroy()
- In-flight volume tween callbacks prevented by killTweensOf
- Everything inside data-barba container — no transition interference
- Clean re-entry on case->home->case cycle
## Files
- `case-video-controls.js` — main implementation
- `ready-hit-play.css` — progress bar styles
## Supersedes
- feat-case-video-intersection
- feat-video-controls-autohide
```
</example>

<checklist>
Before finishing any queue.json update, verify:
- [ ] Task name is plain English, readable by a stranger
- [ ] Slug has no contractions and aligns with the task name
- [ ] Slug is prefixed with the project abbreviation
- [ ] Notion page has step-by-step description grouped by feature area
- [ ] Spec content is embedded if a spec file exists
- [ ] Files section lists files to modify
- [ ] Supersedes section present if task replaces others
- [ ] All notion-dashboard skill rules followed (Slug + Client match, correct status spelling, Last Updated set)
</checklist>
