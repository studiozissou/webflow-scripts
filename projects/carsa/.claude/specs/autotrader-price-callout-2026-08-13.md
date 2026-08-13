# AutoTrader Price Callout — VDP redesign brief

**Date:** 2026-08-13
**Source:** Tomek call, 2026-08-06 ("Webflow: Planning & Refinement")
**Designs:** Claude Design project `f37c9ae2-25bc-4fa5-adfc-6357d82cb9cd`
→ https://claude.ai/design/p/f37c9ae2-25bc-4fa5-adfc-6357d82cb9cd?file=AutoTrader+Price+Callout.dc.html

## Why we're redesigning

Rishi disliked the current widget. Note that VDP conversion rate *increased* after
it was introduced, so the live version is not failing commercially — this is a
clarity and trust job, not a rescue. Budget agreed with Tomek: ~2h design + ~2h
implementation, no Rishi approval needed.

## Requirements (from the call)

Must:
- Show the saving clearly and large — the primary message
- Show the AutoTrader market value (calculated)
- Show the car's cash price. The VDP currently only shows monthly, never the cash
  price. Tomek explicitly wants this widget to be where it surfaces.
- AutoTrader branding prominent — it is what justifies the price and builds trust
- Say what the rating is based on: make, model, age, fuel type, optional extras
- Numbers must be bigger than the current version

Must not:
- Show an upper/lower price range. CMS carries one of the two bounds; we derive
  the other, but we are not displaying a range. Saving + market value only.
- Use a bar chart, or anything where the active state changes size. In the live
  version the selected box grows, which reads as "higher price = bigger bar".
- Carry as much body copy as the current version
- Use a pop-up (standing VDP philosophy)
- Be as wide as the iPad sales-app layout

Should:
- Consider an accordion for the "what this is based on" detail, so the breakdown
  is available without cluttering the default state

## Live version — specific faults

- Active segment scales up → reads as a bar chart (Tomek's main objection)
- Only 4 bands (Higher / Good / Great / Lower). AutoTrader's ladder has 5;
  "Fair" is missing.
- No numbers at all — no price, no market value, no saving
- AutoTrader logo too discreet
- Greens are AutoTrader's palette, not Carsa's

## Concepts delivered

| ID | Direction |
|----|-----------|
| 1a | Corrected ladder — equal segments, marker above, closest to live |
| 1b | Dial / gauge — automotive metaphor, needle can't read as a bar chart |
| 1c | Numbers only, no chart — most direct answer to "numbers too small" |
| 1d | Quantitative horizontal scale — two plotted points, gap labelled |
| 1e | Dark brand panel — highest attention on a white VDP |
| 1f | Compact strip + accordion — smallest footprint, both states shown |
| 1g | The disclosure content, shown open — drops under 1a–1d |

## Design tokens used

Pulled from live `carsa-v2.webflow` CSS, not invented:

- Ink / dark purple background `#32044b`
- Brand purple `#511e62`, link hover `#7910b4`, radiant `#9a42ff`
- Lime `#e4ff80` (positive accent, replaces AutoTrader's green)
- Tints: `#faf3ff`, `#f6e6ff`, `#edceff`, tag background `#f1e3f8`
- Neutrals `#222 #444 #666 #aaa #ccc #eee`, grey `#f2f2f2`
- Type: Plus Jakarta Sans (body + heading), DM Mono (labels)

## Open items

- AutoTrader wordmark is a placeholder built from CSS shapes. Swap in the
  official SVG before build.
- Sample data is illustrative: £13,995 car, £14,500 market value, £505 saving.
  Confirm the CMS field names for market value and saving.
- Mileage was added to the "rated on" chips. Confirm AutoTrader includes it —
  the call listed make, model, age, fuel type, optional extras.
