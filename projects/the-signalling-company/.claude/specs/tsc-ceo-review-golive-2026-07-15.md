# TSC — CEO Review Go-Live Punch List

**Source:** Romain email "CEO review - last change wave to go live tomorrow" (15 Jul 2026, 15:33)
**Go-live target:** Thursday morning (after AM alignment call with Romain)
**Legend:** ✅ = Will does now · ⏳ = Will, blocked on TSC asset · 🟦 = TSC owns (blue "with us") · ❓ = needs alignment

**Global rules from Romain:**
- Unpublish (do **not** delete) every page marked **KO**.
- Blue items are TSC's responsibility — do not block on them.

---

## Landing page — OK (keep live)
- [x ] ✅ Move Škoda logo above the partners section, with claim: "Proud member of (the Skoda Group)"
- [x] ✅ Remove SNCB logo (until agreement)
- [ ] ⏳ Add the corporate video — video now exists (`youtu.be/9G0OXItQ1bA`, live on About) — **still needs adding to Landing**
- [x] ✅ Remove Škoda from the bottom banner (**site-wide, every page**) — keep the original claim alone

## Services — OK
- [x] ✅ Unpublish the Guillaume Chaine quote - hidden
  - 🟦 Romain to edit the text: "Guillaume Chaine, Equipment Director, ETF"
- [x] ✅ Unpublish SNCB logo

## Service children pages — KO?
- [x] ❓ Wrong logo, wrong footer (wrong template), no hero image → **decide: finish now or carry to v2 / unpublish.** Likely the "your question" Romain wants to align on in the morning.

## Projects — OK
- [x] ✅ Unpublish Akiem
- [x] ✅ Replace "xMU" with "EMU" — **DONE (Claude):** "xMU" was a single **Vehicle Types** CMS item; renamed → "EMU" (slug `emu`) and published. It renders everywhere it's used as a tag/filter, so that covers "everywhere". (Icon file is still named `mxu.svg` — visual only; swap if you want.)

## Lineas project — OK
- [x] ⏳ Missing photo — **need asset**
- [ ] ⏳ Missing timelapse video — **blocked: link coming from TSC**
- [x] ✅ Replace "under" with the symbol "<"
  - [x] ❓ Capitalise the first letter of all these facts? — **decided: leave as-is** (no change).

## 27ev project — OK
- [x] ⏳ Missing photo — **need asset**

## Akiem — KO
- [x] ✅ Unpublish page (no client agreement yet)

## Products — OK
- [x] ✅ Fix the "weird scroll" of the boxes — align with the Services layout
- [x] ✅ Photos - waiting on tbl1
- [ ] ⏳ Add Sensor Box child page — **blocked: need TSC content (JLA)**
- [ ] ⏳ Add Computer Box child page — **blocked: need TSC content (JLA)**
- [x] ✅ Unpublish PZB
- [x] ✅ Unpublish KVB

## Products ETCS — OK
- [x] ✅ Photos
- [x] ✅ Unpublish ATO — still manual (rich-text `<h3>ATO…</h3>` block in the ETCS body; left in place — confirm if it should be removed)
- [x] ✅ Spell out CAPEX and OPEX — **DONE (Claude):** ETCS body first instance → "Capital Expenditure (CAPEX)" / "Operational Expenditure (OPEX)", contraction thereafter. Also fixed the "See ETCS in action" links (removed the now-unpublished Akiem link; corrected `skoda-27ev` → `skoda-regiojet`). Published.

## Product TBL1 — OK
- [x] ✅ Acronyms — **DONE (Claude):** TBL1 body CAPEX/OPEX expanded, same rule as ETCS (key-features list keeps the contraction). Published. _Only CAPEX/OPEX were expanded — say the word if ETCS/ATP/STM/NG should be spelled out too._
- [x] ✅ Images

## Product Telecom Box — OK
- [x] ✅ Images

## RailOS — OK
- [x] ✅ Move the bottom carousel up into the place of the 2 images (remove the images block)

## RailOS Apps — OK
- [x] ✅ Change title 2 to "Onboard signalling" — unpublish KVB and PZB
- [x] ✅ Change title 3 to "Onboard non-signalling" — add TCMS
- [ ] 🟦 Clarify DRU and JRU: Data Recording Unit / Juridical Recording Unit — RHO

## RailOS Devices — OK
- [x] ✅ Photos

## RailOS App Store — KO
- [x] ✅ Unpublish page (done). **Crosslinks — needs Designer:** no App Store links exist in CMS content, so they're Designer elements. Check the **RailOS nav dropdown** and any **"App Store" card/CTA on the RailOS page** and hide those (can't be done via the CMS API).

## RailOS Open — OK
- [x] ✅ Fix text display bug on load (text only appears after scrolling)
- [ ] 🟦 Rewrite first paragraph — "TSC is opening its platform to third-party developers" — RHO to do
- [ ] 🟦 Rework second paragraph into a teaser — RHO

## About — OK
- [ ] 🟦 Remove "ex-[company]" references (no free advertising for competitors) — RHO
- [x] ✅ Remove "250" (not impactful enough)
- [x] ⏳ Replace photos with corporate video — **DONE:** corporate video (`youtu.be/9G0OXItQ1bA`) live on About; verified on staging.
- [ ] 🟦 Keep only "care" — RHO
- [ ] 🟦 Our Philosophy — remove the first sentence — RHO
- [x] ✅ Remove the carousel

## About Leadership — OK
- [x] ✅ Split into two sections: Board and Executive Committee — **CMS updated (Claude, 16 Jul):** dual membership solved. Since Webflow has no true multi-select option field, added two **Switch** fields to Leadership — **"On Board"** (`on-board`) and **"On Executive Committee"** (`on-executive-committee`). All 8 existing leaders set to On Executive Committee. **Alexandre Betis** and **Stanislas Pinte** set to On Board *and* On Executive Committee (they now appear in both lists). Added **Jaromir Silhanek** and **Zdenek Zvata** as **draft** items tagged On Board. _(The old single-select "Section" field is left in place but is now redundant — the switches are authoritative; delete Section later if you like.)_
  - **In Designer:** bind two Collection Lists — Board list filtered by `On Board = on`, Executive Committee list filtered by `On Executive Committee = on`.
  - **Needs you:** (1) Jaromir + Zdenek are **drafts with no role / photo / bio** — fill those in and publish. Names entered without diacritics (Jaromir Silhanek / Zdenek Zvata) — correct if they should carry accents. (2) Republish the site once the Designer lists are built and the two drafts are complete. Nothing was published — production is live and these entries are incomplete.
- [ ] ✅ Drop any photo that's poor quality

## About Careers
- 🟦 Updates done — nothing to do

---

## Summary by owner

**✅ Will — do now (unblocked):** Landing (Škoda logo move, SNCB remove, banner Škoda remove), Services (2 unpublishes), Projects (Akiem unpublish, xMU→EMU site-wide), Lineas ("under"→"<"), Akiem page unpublish, Products (scroll fix, photos, PZB + KVB unpublish), ETCS (photos, ATO unpublish), TBL1 images, Telecom Box images, RailOS (carousel move), RailOS Apps (2 title changes + TCMS + unpublishes), RailOS Devices photos, App Store page unpublish, RailOS Open (scroll bug), About ("250" remove, carousel remove), Leadership (2-section split).

**⏳ Will — blocked on TSC assets:** corporate video link (Landing + About), Lineas photo + timelapse link, 27ev photo, Products Sensor Box + Computer Box content (JLA).

**🟦 TSC (Romain/JLA):** Guillaume Chaine text, ETCS CAPEX/OPEX, TBL1 acronyms, DRU/JRU, RailOS Open paragraphs 1 & 2, About (ex-company / "care" / Our Philosophy first sentence).

**❓ Align with Romain in AM:** Service children pages (finish vs unpublish), Lineas facts capitalisation.

## Automation log — done by Claude via Webflow MCP (15 Jul, 18:05)

Reverted to **draft** (unpublished, not deleted). Site NOT republished — do a staging publish to finalise.

| Target | Collection / Type | ID | Result |
|--------|------|-----|--------|
| SNCB/NMBS logo | Partners | `…8406e` | ✅ unpublished (covers Landing + Services) |
| PZB | Products | `…27ae0` | ✅ unpublished |
| KVB | Products | `…27ae2` | ✅ unpublished |
| PZB | RailOS Apps | `…bef07` | ✅ unpublished |
| KVB | RailOS Apps | `…bef09` | ✅ unpublished |
| RailOS App Store | Page | `…8065a` | ✅ set to draft |
| Akiem | Projects | `…fb3c5` | ⚠️ **blocked** — still referenced by Services item "ETCS Retrofit Viability Assessment" (`6a3ba1707ced7726c4df377b`). Remove that reference / unpublish the service first, then retry. |

**Could NOT auto-map (manual, in Designer):**
- **ATO** (Products ETCS) — not a CMS item; it's an `<h3>ATO…</h3>` block inside the ETCS product rich-text body. Edit manually.
- **Guillaume Chaine quote** (Services) — static element, not CMS. Remove in Designer. (RHO editing the text anyway.)

**⚠️ Still to publish:** the App Store page unpublish and CMS reversions need a **staging site publish** to go live. Held back so your unfinished manual edits aren't pushed prematurely — publish when ready.

## Remaining unpublish (needs manual step first)
- ~~Akiem project — clear the Services reference, then unpublish.~~ **DONE** (reference cleared + unpublished + published).
- Service children pages (KO?) — hold for AM alignment.

## Automation log 2 — doc comment actions (15 Jul, 21:33)

All published to the staging subdomain.

| Comment | Action taken |
|---------|-------------|
| xMU → EMU | Renamed Vehicle Types item `…cebc0a` → "EMU" (slug `emu`). |
| CAPEX/OPEX (ETCS) | ETCS body first instance expanded; broken Akiem + skoda-27ev crosslinks fixed. |
| Acronyms (TBL1) | TBL1 body CAPEX/OPEX expanded (CAPEX/OPEX only). |
| Project full-width images | Lineas → freight-loco photo (2850px); 27ev → RegioJet render (1200px). Uploaded + set on `cover-image` + published. |
| Leadership sections | Added "Section" option field (Board / Executive Committee); tagged 8 leaders Exec Committee. |
| App Store crosslinks | Not in CMS — flagged for Designer (RailOS nav dropdown / RailOS-page CTA). |

**Open (need you):**
- 27ev hero is a white-bg render — swap if you have a real photo.
- ~~Leadership Board: add Jaromir Silhanek + Zdenek Zvata; decide Alex/Stan dual membership (→ multi-select).~~ **DONE (16 Jul):** switched to two boolean fields (`on-board` / `on-executive-committee`); Alex + Stan dual-tagged; Jaromir + Zdenek added as drafts. Still need: their role/photo/bio, the two Designer Collection Lists filtered by the switches, then republish.
- App Store nav/CTA crosslinks — hide in Designer.
- ATO block on ETCS — confirm remove or keep.

## Automation log 3 — Leadership Board dual membership (16 Jul)

Leadership collection `6a3b8e50468af0c57a1db9d5`. **Not published** (production is live; new entries incomplete).

| Action | Detail |
|--------|--------|
| Added Switch `on-board` | field `a31dacfd34ee4247a29fdcc077438905` |
| Added Switch `on-executive-committee` | field `e47f2015627efdc4329529fb803fe098` |
| 8 existing leaders | `on-executive-committee = on` |
| Alexandre Betis (`…879d`) | `on-board = on` + `on-executive-committee = on` |
| Stanislas Pinte (`…87a9`) | `on-board = on` + `on-executive-committee = on` |
| Jaromir Silhanek — CEO, Škoda Electric (`6a58a30bd62572601646d9af`) | **PUBLISHED**, `on-board = on`; role + SEO + photo set |
| Zdeněk Sváta — COO, Škoda Group (`6a58a30bd62572601646d9b1`) | **PUBLISHED**, `on-board = on`; name/slug corrected (was "Zdenek Zvata" → `zdenek-svata`), role + SEO + photo set |

_Roles supplied by Will (16 Jul): Zdeněk Sváta, COO of Škoda Group; Jaromir Silhanek, CEO at Škoda Electric._

**Photos (16 Jul):** Landscape source headshots centre-cropped to 800×800 square, exported to AVIF (~24–28 KB), stored in `TSC Web Content/TSC Leadership Photos/` (+ `avif/`). Uploaded to Webflow and attached to both items with alt text. **Both items published** to the live CMS.

**Still open:** (1) **Bios** for both are still empty. (2) The two-section Designer split (Board / Exec Committee Collection Lists filtered by the switches) still isn't built — so on the live About/Leadership page these two now appear in **whatever single leadership list currently exists**, mixed with the Exec Committee until the split is built. Check the live page and build the split when ready.
