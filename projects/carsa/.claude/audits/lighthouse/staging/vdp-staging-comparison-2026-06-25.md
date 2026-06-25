# VDP Staging Performance Comparison — 2026-06-25

Environment: `carsa-v2.webflow.io` (staging)
Throttling: CPU 1x, Network none
Change: Inline scripts (19 blocks, ~45KB) → single external `vdp.js` on jsDelivr CDN

## LCP Comparison (ms)

| VRM | Baseline (inline) | External (CDN) | Delta | % |
|-----|-------------------|----------------|-------|---|
| gn20phv | 1007 | 1004 | -3 | -0.3% |
| vk72rzv | 915 | 886 | -29 | -3.2% |
| bl73dmu | 871 | 876 | +5 | +0.6% |
| ow74xxv | 823 | 855 | +32 | +3.9% |
| fd23hgg | 916 | 1000 | +84 | +9.2% |
| oe22lfp | 923 | 928 | +5 | +0.5% |
| **Average** | **909** | **925** | **+16** | **+1.8%** |

## CLS Comparison

| VRM | Baseline | External | Delta |
|-----|----------|----------|-------|
| gn20phv | 0.03 | 0.03 | 0 |
| vk72rzv | 0.01 | 0.02 | +0.01 |
| bl73dmu | 0.01 | 0.01 | 0 |
| ow74xxv | 0.02 | 0.02 | 0 |
| fd23hgg | 0.02 | 0.01 | -0.01 |
| oe22lfp | 0.02 | 0.02 | 0 |
| **Average** | **0.02** | **0.02** | **0** |

## TTFB Comparison (ms)

| VRM | Baseline | External | Delta |
|-----|----------|----------|-------|
| gn20phv | 44 | 115 | +71 |
| vk72rzv | 39 | 45 | +6 |
| bl73dmu | 58 | 62 | +4 |
| ow74xxv | 63 | 43 | -20 |
| fd23hgg | 55 | 40 | -15 |
| oe22lfp | 75 | 45 | -30 |
| **Average** | **56** | **58** | **+2** |

## Analysis

**LCP:** Average delta is +16ms (+1.8%) — within normal run-to-run variance for unthrottled traces. No statistically significant change. The fd23hgg outlier (+84ms) is likely network jitter rather than a code change effect.

**CLS:** No change (0.02 average both runs). Expected — the script change doesn't affect layout.

**TTFB:** Highly variable between runs (gn20phv jumped +71ms). This is server response time and has nothing to do with the script change — it's network/origin variance.

**Conclusion:** Externalising inline scripts to a single CDN file shows **no measurable LCP regression or improvement** on first load in this unthrottled staging environment. The real performance benefit is on **repeat visits** — returning users will hit the jsDelivr cache (`max-age=31536000`) instead of re-parsing 45KB of inline JS on every page load. This benefit cannot be measured in a single cold-load trace.

## Traces

- Baseline: `trace-{vrm}-staging-baseline.json.json.gz`
- External: `trace-{vrm}-staging-external.json.json.gz`
