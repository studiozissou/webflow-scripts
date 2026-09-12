# Research: keyword landscape, competitors, local ranking factors, AEO, Dutch terms
**Date:** 2026-09-12 · **Agent:** seo (sonnet) · **Status:** raw briefing. **All volumes are ESTIMATES** — no Semrush access (MCP not in current plan). Confirm via Search Console after launch.

## 1. Keyword map (Dutch-first)

**Head terms — too hard for a new site** (est. monthly vol, NL):
- "indonesisch restaurant haarlem" — est. 200–350/mo, 6 established restaurants + directories rank
- "rijsttafel haarlem" — est. 90–150/mo, De Lachende Javaan / Flamboyant dominate
- "toko haarlem" — est. 150–250/mo, directories (Restoranto, Hapsalons) + 4 existing tokos

**Realistic wins — long-tail / neighbourhood / dish / intent:**
- "indonesisch afhalen haarlem" — est. 40–70/mo. No toko has this in an H1/title — winnable.
- "rijsttafel afhalen haarlem" — est. <20/mo, zero dedicated pages.
- "indonesisch eten haarlem centrum" — est. <20/mo, untargeted.
- "toko haarlem [buurt]" — near-zero individually, zero competition.
- "halal indonesisch haarlem" — est. <10/mo; no competitor mentions halal — total gap if genuinely halal.
- "indonesisch afhalen haarlem zondag" — near-zero, high intent (only Toko Nur/SamaSama open Sundays).
- "beste saté haarlem" — est. <10/mo, unclaimed.
- Dish + haarlem (each est. <10–20/mo, collectively meaningful, wholly untargeted): rendang, nasi goreng, bami, gado gado, sate, lumpia, soto, nasi rames.
- English/expat: "indonesian food haarlem", "indonesian takeaway haarlem" — est. 20–40/mo combined; most competitor copy is Dutch-only (Toko Nur has /en).

**Near-zero volume, high conversion — on page regardless:** "[naam] menu / openingstijden / bestellen", "spekkoek bestellen haarlem", "pisang goreng haarlem", "indonesische catering haarlem" (Selera Anda targets this).

## 2. Competitor audit

| Business | Address | Site | Menu | Schema | Gaps |
|---|---|---|---|---|---|
| De Lachende Javaan (4.4★/420 reviews) | Frankestraat 27 | Decent | PDF only | None | No ordering, PDF menu unindexed |
| Toko SamaSama | Zijlweg 82 | Webflow | Partial HTML + PDF | None | No meta desc, thin copy, no alt, no heading structure |
| Toko Nur | Gedempte Oude Gracht 13 | Next.js, best of set, EN page, pickup ordering | HTML | None | No geo-keyword targeting |
| Café Samabe | Korte Veerstraat 1 | Weakest — no hours shown | Unpopulated | None | Missing hours |
| Flamboyant, Resto Indo Rasa, Toko Gembira, Toko Nobel, Toko Warung Exotica, Kokkie Londo | various | not deep-audited | — | None found | — |

**Zero of ~9 Haarlem Indonesian food businesses have schema.org markup.** De Lachende Javaan has the review moat but the weakest technical site.

Sources: wanderlog.com Haarlem Indonesian list · tripadvisor.com Haarlem Indonesian · tokosamasama.nl · tokonur.nl/en · samabe.nl · delachendejavaan.com · restoranto.com/nl/toko-haarlem · hapsalons.nl Haarlem indonesisch

## 3. Local discovery drivers 2026

Google: Relevance, Distance, Prominence. Prominence wording recently changed to attribute mainly to **backlinks and reviews**; "SEO best practices apply" sentence removed.

Whitespark 2025 survey weights: GBP 32%, on-page 19%, reviews ~20% (up from 16%), links 15%, behavioural 8%, citations 7%, personalisation 3%.

On-site items worth doing (no competitor has any):
- `Restaurant` schema: `servesCuisine`, `priceRange`, `telephone`, `address` (exact GBP match), `geo`
- `openingHoursSpecification` structured, incl. Sunday
- `hasMenu` → real `Menu`/`MenuSection`/`MenuItem` in HTML
- `acceptsReservations`, `sameAs` (GBP, IG, Thuisbezorgd if used)
- Exact NAP match across site, GBP, Hapsalons, Eet.nu, Restoranto

https://support.google.com/business/answer/7091 · https://www.seroundtable.com/google-local-ranking-docs-updates-39761.html · https://www.brightlocal.com/learn/google-local-algorithm-and-ranking-factors/

## 4. AEO / AI search

OpenAI licenses Yelp + Foursquare; Perplexity licenses Tripadvisor; Gemini grounded in Google Maps. Yelp/Foursquare thin in NL → **GBP completeness and a Tripadvisor listing matter disproportionately for AI inclusion** here. ChatGPT surfaces ~1.2% of locations asked about vs Google local pack ~35.9%; Gemini ~11%, Perplexity ~7.4%. Consistency across GBP + Tripadvisor + own schema beats content volume.

https://www.soci.ai/blog/how-to-rank-in-chatgpt-perplexity-and-google-ai-overview/ · https://www.cheers.tech/geo-academy/ai-search-engine-source-differences

## 5. Dutch-language notes

- **afhalen** (pickup) vs **bezorgen** (delivery) — distinct intents; both Haarlem tokos use afhalen.
- **rijsttafel** — one word, only correct spelling.
- **toko** (shop, often with takeaway) vs **warung** (small eatery); toko more searched in NL.
- **saté/sate** primary; "satay" secondary/English.
- **bami** for SEO; "bahmi" parenthetical only if branded that way.
- Confirmed terms: rendang, gado-gado (hyphen), soto, nasi goreng, lumpia, spekkoek, pisang goreng, sambal, nasi rames / nasi campur, bijgerechten.
- Gado-gado, soto, sate, nasi goreng, rendang = Indonesia's five national dishes (2018) — citable framing sentence for AEO.

## 6. Name collision: "Oost" (follow-up briefing)

**SERP collision — confirmed, severe.** "Oost Haarlem" / "restaurant Oost Haarlem" / "Oost Haarlem eten" are dominated by the Haarlem-Oost stadsdeel (Thuisbezorgd postcode pages 2031/2032/2034, neighbourhood listicles, even Amsterdam-Oost bleed). Second layer: "Oost" is directory shorthand for **Oost-Europees** (Eet.nu) and **Oosters** (TheFork) categories. A bare-name strategy will not rank for its own name on a zero-authority site.

**Existing "Oost" businesses:** Café Oost, Amsterdam (cafe-oost.nl); Op Oost, Texel (opoost.nl). No Indonesian match. BOIP trademark register not checked — do a manual search at boip.int/nl/merkenregister before committing; "Oost" is low-distinctiveness so a broad word mark is unlikely, but prior use could support opposition.

**Recommended split:**
- Real-world name (sign, receipts, GBP): **Toko Oost** or Warung Oost. GBP name must match the sign — keyword-rich strings there are suspension risk.
- HTML `<title>`: `Toko Oost — Indonesisch eten & rijsttafel afhalen Haarlem`.
- Identical string on every directory.
- Bare "Oost" on the sign is meaningfully worse; push back.

**Domains (DNS check only — confirm via WHOIS/sidn.nl):** tokooost.nl, oosthaarlem.nl, eetbijoost.nl, oost-haarlem.nl → no record, likely free. restaurantoost.nl → taken, parked for resale (Dovendi). Grab tokooost.nl first; oosthaarlem.nl as a defensive redirect.

**"De Oost" story:** genuine historical term for Nederlands-Indië (vs "de West"); About-page and AI-quotable fact; zero search volume as a term.

Sources: thuisbezorgd.nl haarlem-oost-2034 · eet.nu/haarlem/oost-europees · thefork.nl haarlem oosters · cafe-oost.nl · opoost.nl · sterlingsky.ca/50-cases-of-keyword-spam · nl.wikipedia.org/wiki/Nederlands-Indië
