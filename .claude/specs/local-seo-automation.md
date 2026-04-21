# Local SEO Automation — Internal Tooling

**Slug:** `local-seo-automation`
**Project:** `webflow-scripts` (tooling)
**Status:** Ready to Plan
**Created:** 2026-04-20

## Summary

Internal CLI tooling for a new revenue stream: managed local SEO services for small businesses (€20–120/month). Two pipelines:

1. **Monthly Reporting Engine** — pulls SEMRush rank data + site health metrics → Claude generates plain-English client report (HTML/PDF)
2. **Lead Generation Pipeline** — finds underperforming local businesses → discovers contact email → drafts outreach email → (future) auto-sends

Architecture: Node.js CLI scripts in `tools/local-seo/`, mirroring `tools/site-review/` patterns. Uses `@anthropic-ai/sdk` for content generation and SEMRush HTTP API for data.

## Business Context

### Market Position
- **Gap:** €60–120/month "done-for-you" local SEO is underserved. Below €60 is DIY tools (Moz Local, BrightLocal). Above €120 is agency retainers.
- **Competitors:** Merchynt Paige ($99/loc), Semrush Local ($30–60/loc DIY), Moz Local ($16–33/loc DIY)
- **Differentiator:** AI-managed service in client's brand voice, delivered as a subscription with minimal client effort

### Revenue Model
| Tier | Price | Includes |
|------|-------|----------|
| Starter | €29/month | Monthly report + GBP audit + 3 keyword recommendations |
| Growth | €69/month | Weekly GBP posts + review response drafts + monthly report + rank tracking |
| Pro | €119/month | All Growth + lead gen insights + competitor monitoring + quarterly strategy call |

### Tool Costs Per Client (estimated)
- SEMRush API: ~€5–15/month (depending on query volume)
- Claude API: ~€2–5/month (report generation + content)
- GBP API: free (Google)
- Total margin at Growth tier: ~€45–55/month per client

## Architecture

```
tools/local-seo/
├── index-report.js        # CLI: monthly report generation
├── index-prospect.js      # CLI: lead discovery
├── index-outreach.js      # CLI: email draft generation
├── config.js              # env loading, API keys, defaults
├── lib/
│   ├── semrush.js         # SEMRush HTTP API client
│   ├── gbp.js             # Google Business Profile API client (Phase 2)
│   ├── prospect-scorer.js # Scoring algorithm for lead quality
│   ├── contact-finder.js  # Multi-channel contact discovery (website + GBP + social)
│   ├── report-gen.js      # Claude-powered report narrative generation
│   └── templates/
│       ├── monthly-report.html       # Report HTML template
│       ├── outreach-email-cold.md    # Email: professional, 150-250 words
│       ├── outreach-email-followup.md
│       ├── outreach-gbp-cold.md      # GBP message: customer-tone, 50-80 words
│       ├── outreach-whatsapp-cold.md  # WhatsApp: ultra-short, 30-50 words
│       └── outreach-social-cold.md    # Instagram/Facebook DM: friendly, 50-100 words
├── clients/               # Per-client config (runtime-generated)
│   └── <slug>.json
├── output/                # Generated reports and drafts
│   └── <slug>/
│       ├── reports/
│       └── outreach/
└── prospects/             # Lead database
    └── <location>-<niche>.json
```

## Pipeline 1: Monthly Reporting Engine

### Data Sources
1. **SEMRush API** — keyword positions, visibility score, competitor changes, backlink summary
2. **Site-review tool** (existing) — technical health (broken links, meta tags, PSI scores)
3. **Google Business Profile API** (Phase 2) — review count/rating, post engagement, direction requests, calls
4. **Google Search Console** (Phase 2) — impressions, clicks, CTR for local queries

### Report Generation Flow
```
1. Read client config (clients/<slug>.json)
   → tracked keywords, domain, GBP name, competitor domains

2. Pull SEMRush data (parallel):
   → domain_rank (authority, traffic estimate)
   → tracking_position_organic (keyword rankings)
   → domain_organic (top pages)
   → backlinks_overview (link health)

3. Run site-review subset (meta-tags, broken-links, psi)

4. Feed all data to Claude with report prompt template
   → Generates narrative: wins, issues, recommendations
   → Tone: simple, jargon-free, actionable

5. Render HTML report from template + Claude narrative

6. Save to output/<slug>/reports/YYYY-MM.html
```

### Client Config Schema (`clients/<slug>.json`)
```json
{
  "name": "Joe's Plumbing",
  "slug": "joes-plumbing",
  "domain": "joesplumbing.ie",
  "gbpName": "Joe's Plumbing Dublin",
  "location": "Dublin, Ireland",
  "niche": "plumber",
  "tier": "growth",
  "keywords": [
    "emergency plumber dublin",
    "plumber rathmines",
    "blocked drain dublin"
  ],
  "competitors": [
    "dublincityplumbers.ie",
    "plumbersdublin.ie"
  ],
  "semrushProjectId": null,
  "contacts": {
    "email": "joe@joesplumbing.ie",
    "name": "Joe Murphy"
  },
  "created": "2026-04-20",
  "lastReport": null
}
```

## Pipeline 2: Lead Generation

### Discovery Flow
```
1. Input: --location "Dublin" --niche "plumber" --radius 10km

2. Find businesses via Google Maps / Places API
   → Filter: has website, has GBP listing

3. Score each prospect:
   → SEMRush domain_rank (low authority = opportunity)
   → GBP completeness (few reviews, no posts = opportunity)
   → Website quality (site-review quick scan)
   → Keyword positions (not ranking for obvious terms)

4. Rank by "opportunity score" (higher = more likely to convert)

5. Find contact channels (no third-party lookup API needed):
   → Parse mailto: links from website HTML (header, footer, contact page)
   → Extract email/telephone from JSON-LD LocalBusiness schema on their site
   → Google Places API place_details (phone, website — sometimes email)
   → Regex scan for email patterns on /contact and /about pages
   → Scrape social links: Instagram, Facebook, WhatsApp (from website + GBP)
   → Check if GBP messaging is enabled (Places API)
   → If no channels found → flag for manual lookup

6. Save to prospects/<location>-<niche>.json (includes all discovered channels)
```

### Prospect Scoring Algorithm
```
opportunityScore = (
  (100 - authorityScore) * 0.3 +     // Low authority = bigger opportunity
  missingKeywords * 10 * 0.25 +        // Not ranking for obvious terms
  (5 - reviewRating) * 20 * 0.15 +     // Low reviews = pain point
  technicalIssues * 5 * 0.15 +         // Broken site = urgent need
  gbpGaps * 10 * 0.15                   // Incomplete GBP = quick win
)
```

### Outreach Flow (Multi-Channel)

Four outreach channels, each with different tone, length, and delivery method:

| Channel | Tone | Length | Delivery | Auto-send feasibility |
|---------|------|--------|----------|----------------------|
| Email | Professional, value-led | 150-250 words | Gmail API draft → review → send | High (Gmail API) |
| GBP Message | Customer-tone, casual | 50-80 words | Manual paste into GBP chat | Low (no API for messaging) |
| WhatsApp | Ultra-short, personal | 30-50 words | WhatsApp Business API template | Medium (API exists, approval needed) |
| Instagram/Facebook DM | Friendly, visual | 50-100 words + audit screenshot | Meta Business Suite API or manual | Medium (API exists, rate-limited) |

```
1. Read prospect from prospects/<location>-<niche>.json

2. Select channel(s) based on available contact info:
   → email found? → generate email draft
   → GBP messaging enabled? → generate GBP message
   → WhatsApp/phone found? → generate WhatsApp template
   → Instagram/Facebook found? → generate social DM
   → Multiple channels? → generate all, recommend best

3. Generate personalised message via Claude per channel:
   → Reference their specific weaknesses (tactfully)
   → Lead with value ("I noticed X about your Google listing...")
   → Attach/reference free mini-audit (PDF or screenshot)
   → CTA: free 15-min audit call
   → Tone and length adapted per channel

4. Save drafts to output/outreach/<prospect-slug>/
   → email.md, gbp-message.md, whatsapp.md, social-dm.md

5. Channel-specific delivery (phased):
   → Email: Gmail API draft → manual review → send
   → GBP: copy-paste (no send API exists)
   → WhatsApp: WhatsApp Business API (requires approved template)
   → Instagram/Facebook: Meta Business Suite API or manual
```

### Outreach Sequence (multi-touch)
```
Day 0:  Best available channel (email or GBP message)
Day 3:  Second channel if no response (WhatsApp or social DM)
Day 7:  Follow-up on original channel (different angle)
Day 14: Final touch — different channel, softer CTA ("no worries if not")
```

### Free Audit as Universal Hook
Every outreach message references or attaches a mini-audit generated by `site-review`:
- Email: PDF attachment or inline highlights
- GBP message: "I ran a quick check on your Google listing and found 3 things..."
- WhatsApp: Screenshot of their Maps ranking vs competitors
- Social DM: Carousel of 3 audit findings as images

## Implementation Phases

### Phase 1: Foundation + Reporting MVP (build first)
- `config.js` — env loading, API key management
- `lib/semrush.js` — SEMRush HTTP API client (domain_rank, keyword positions)
- `lib/report-gen.js` — Claude report narrative generation
- `index-report.js` — CLI entry point
- `lib/templates/monthly-report.html` — report template
- Client config schema + sample client

### Phase 2: Lead Generation + Contact Discovery
- `lib/prospect-scorer.js` — scoring algorithm
- `lib/contact-finder.js` — multi-channel contact discovery (website scrape, JSON-LD, Places API, social links)
- `index-prospect.js` — CLI entry point
- Google Places API integration for business discovery

### Phase 3: Multi-Channel Outreach
- `index-outreach.js` — CLI entry point with `--channel email|gbp|whatsapp|social|all`
- Channel-specific templates (email, GBP message, WhatsApp, Instagram/Facebook DM)
- Mini-audit generation as universal hook (leverages existing site-review)
- Gmail API integration for email drafts
- Multi-touch sequence engine (Day 0 → Day 3 → Day 7 → Day 14)

### Phase 4: GBP Management (future)
- `lib/gbp.js` — Google Business Profile API
- Post generation + scheduling
- Review response drafting
- GBP audit + optimisation recommendations

## API Keys Required

| Service | Env Var | Purpose | Cost |
|---------|---------|---------|------|
| SEMRush | `SEMRUSH_API_KEY` | Keyword/rank data | Included in Pro+ plan |
| Anthropic | `ANTHROPIC_API_KEY` | Report/email generation | Already configured |
| Google Places | `GOOGLE_PLACES_API_KEY` | Business discovery + contact details | $17/1000 requests |
| Google PSI | `GOOGLE_PSI_API_KEY` | Site speed (existing) | Already configured |
| Gmail | `GMAIL_OAUTH_*` | Draft creation (Phase 3) | Free |
| GBP | `GBP_OAUTH_*` | Profile management (Phase 4) | Free (requires approval) |

## Dependencies

Existing (already in package.json):
- `@anthropic-ai/sdk` — Claude API
- `dotenv` — env loading

New (to add):
- None for Phase 1 (use native `fetch` for SEMRush HTTP API)
- `googleapis` — Phase 2+ (Places, Gmail, GBP)

## CLI Interface

```bash
# Monthly report for a client
node tools/local-seo/index-report.js --client joes-plumbing

# Report for all clients
node tools/local-seo/index-report.js --all

# Find prospects in a location
node tools/local-seo/index-prospect.js --location "Dublin" --niche "plumber" --limit 20

# Draft outreach for a prospect (all available channels)
node tools/local-seo/index-outreach.js --prospect "joes-plumbing" --channel all

# Draft outreach for a specific channel
node tools/local-seo/index-outreach.js --prospect "joes-plumbing" --channel email --template cold
node tools/local-seo/index-outreach.js --prospect "joes-plumbing" --channel whatsapp
node tools/local-seo/index-outreach.js --prospect "joes-plumbing" --channel gbp
node tools/local-seo/index-outreach.js --prospect "joes-plumbing" --channel social

# Quick audit of a prospect's site (uses existing site-review)
npm run site-review -- --url https://joesplumbing.ie --tier 1
```

## Barba Impact

N/A — no Barba transitions. This is standalone CLI tooling, not a Webflow page feature.

## Verify Loop

### Pass/fail criteria
- `index-report.js --client <slug>` exits 0 and produces `output/<slug>/reports/YYYY-MM.html`
- Report HTML contains: executive summary, keyword table, recommendations section
- `index-prospect.js --location X --niche Y` exits 0 and produces `prospects/<location>-<niche>.json`
- Prospect JSON contains array of objects with `name`, `domain`, `score`, `channels` (object with `email`, `phone`, `gbpMessaging`, `instagram`, `facebook`, `whatsapp` fields)
- `index-outreach.js --prospect <slug> --channel all` exits 0 and produces `output/outreach/<slug>/` directory
- Each channel draft exists only if that channel was discovered for the prospect
- Outreach drafts reference specific prospect weaknesses (not generic)
- Each channel's tone and length match the channel spec (email 150-250 words, GBP 50-80, WhatsApp 30-50, social 50-100)
- No `console.log` in committed code (use `DEBUG && console.log(...)` pattern)
- All API calls handle rate limits and auth failures gracefully

### Reproduction steps
1. Create a test client config: `tools/local-seo/clients/test-client.json`
2. Run `node tools/local-seo/index-report.js --client test-client`
3. Verify report exists at `tools/local-seo/output/test-client/reports/2026-04.html`
4. Open report in browser — confirm sections render, no broken template tags

### Tier mapping
- **Tier 1 (auto):** Node.js unit tests for scoring algorithm, config loading, template rendering. Integration test with mocked SEMRush responses.
- **Tier 2 (CDN regression):** N/A — not deployed to CDN
- **Tier 3 (manual):** Report readability review, email tone/quality check, prospect relevance validation

### Regression scope
- Existing `tools/site-review/` must continue working (shared `package.json`)
- `@anthropic-ai/sdk` usage must not conflict with existing `code-review.js`

## Parallelisation Map

### Phase 1 (Foundation + Reporting)

| Stream | Tasks | Agent | Est. Time | Est. Tokens |
|--------|-------|-------|-----------|-------------|
| A | config.js + semrush.js | code-writer | 20min | 8k |
| B | report-gen.js + templates | code-writer | 25min | 10k |
| C | index-report.js (CLI orchestration) | code-writer | 15min | 6k |
| D | Unit tests | code-writer | 15min | 6k |

**Dependencies:** C depends on A + B completing. D can run after all.

**Recommendation:** Run A and B in parallel, then C sequentially, then D.

### Phase 2 (Lead Gen)

| Stream | Tasks | Agent | Est. Time | Est. Tokens |
|--------|-------|-------|-----------|-------------|
| E | prospect-scorer.js | code-writer | 20min | 8k |
| F | contact-finder.js (website + GBP + social) | code-writer | 20min | 8k |
| G | index-prospect.js | code-writer | 15min | 6k |

**Dependencies:** G depends on E + F.

**Recommendation:** E and F in parallel, then G.

### Phase 3 (Outreach)

| Stream | Tasks | Agent | Est. Time | Est. Tokens |
|--------|-------|-------|-----------|-------------|
| H | Channel templates (email, GBP, WhatsApp, social) | code-writer | 20min | 8k |
| I | index-outreach.js (multi-channel orchestrator) | code-writer | 20min | 8k |
| J | Mini-audit hook (site-review integration) | code-writer | 10min | 4k |

**Dependencies:** I depends on H. J is independent.

**Recommendation:** H and J in parallel, then I.

## Open Questions

1. **SEMRush API access** — Do you have a SEMRush API key on a Pro+ plan? The MCP tools work in-session but standalone scripts need the HTTP API key.
2. **First test client** — Do you have a real local business to test with, or should we use a dummy/your own site?
3. **Email compliance** — For Ireland/EU, cold B2B email is legal under "legitimate interest" but needs an unsubscribe mechanism and company registration. Want me to bake compliance into the templates?
4. **Report delivery** — HTML file saved locally for now, but eventually: email to client? Shared Google Drive folder? Client portal?
