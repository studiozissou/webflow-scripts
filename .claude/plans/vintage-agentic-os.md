# Agentic OS — Vintage Clothes Business

## Context

Side hustle: buying and reselling vintage clothes (charity shops, markets, car boots).
Current state: ~5 items/month listed manually.
Target: £1,000–1,500/month within 6 months.

### Core problems to solve
1. **Time** — manual listing is slow; kills throughput
2. **Buying risk** — hard to know what will sell before spending money
3. **Capital stuck in stock** — slow movers tie up cash

Automation doesn't fix low volume directly, but it removes the ceiling so volume can grow without proportionally more time.

---

## Phase 1 — Build volume manually (months 1–2)

Before writing any automation, get to 30–50 items/month by hand. Goal: learn which items sell, which platforms work, which sourcing spots are best. Can't automate what you don't understand yet.

---

## Phase 2 — Core agent pipeline (months 2–4)

Three agents, in priority order:

### Agent 1: Sourcing Assistant
**Problem it solves:** Buying risk + not knowing what sells

Workflow:
- In a charity shop, snap a photo or type a label/brand/item description
- Agent queries Vinted + Depop sold listings (not just listed — *sold*)
- Returns: average sold price, typical days-to-sell, buy/skip/maybe verdict
- Optional: flag if the brand has a high sell-through rate in your history

Output: a fast, in-store answer — "This Levi's denim jacket sells for £45 avg, usually within 4 days. Buy it."

### Agent 2: Batch Listing Pipeline
**Problem it solves:** Time spent on listings

Workflow:
- Batch photograph items (Sunday session)
- Drop photos into a folder / send to agent
- Agent produces per-item:
  - Title + description (SEO-optimised for each platform's norms)
  - Suggested price (based on sold comps)
  - Background-removed / cropped variants for each platform
  - Draft Instagram caption + hashtags
- Publishes to: Vinted, website, Instagram (draft or live)
- Cross-platform sync: when one sells, auto-delists from others

### Agent 3: Price Decay + Stale Stock
**Problem it solves:** Capital stuck in slow movers

Workflow:
- Weekly run: flags anything unsold for 14+ days
- Auto-drops price by 10–15% increments
- If unsold at 60 days, flags for bundle, donation, or loss-cut decision
- Builds a "slow mover" category log to inform future buying decisions

---

## Phase 3 — Scale layer (months 4–6+)

Once the core pipeline is stable and volume is 50+ items/month:

- **P&L per item**: cost + fees + postage vs. sale price → true margin
- **Sourcing map**: log which shops/markets yield best ROI, update automatically after each haul
- **Content automation**: auto-generate TikTok/Reel scripts from product photos; schedule posts
- **Email newsletter**: "New arrivals this week" auto-generated from new listings, sent weekly
- **Waitlist**: buyer messaged about a sold item → notify them when similar arrives
- **Tax prep**: auto-categorise COGS, platform fees, postage for self-assessment

---

## Tech approach (high level)

- **Claude API** as the reasoning/description-generation layer
- **Vision model** for photo analysis (item identification, condition grading)
- **Vinted/Depop scraping or APIs** for sold comp data
- **Zapier or Make** for no-code cross-platform triggers (or custom Node scripts)
- **Airtable or Notion** as the inventory database (items, cost, status, P&L)
- **Cloudinary or similar** for photo storage + transforms

Start with the sourcing assistant (lowest effort, highest immediate value). It requires no integrations — just a Claude API call with a photo.

---

## Success metrics

| Metric | Now | 3-month target | 6-month target |
|--------|-----|----------------|----------------|
| Items listed/month | 5 | 30–50 | 80–100 |
| Avg monthly profit | ~£75 | £500–700 | £1,000–1,500 |
| Time per item (listing) | ~30 min | ~5 min | ~5 min |
| Slow mover rate | unknown | tracked | <20% |

---

## What to build first

**Sourcing assistant** — can be a simple mobile-friendly web app or even a Claude.ai Project with a custom prompt and sold-data context. No complex infra needed to start. Proves the concept before investing in the full pipeline.
