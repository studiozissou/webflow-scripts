# Agentic OS — Phase 3 Outline: Brand Context + Creative Skills

> Outline spec — to be expanded into a full spec when Phase 3 begins.
> Depends on: Phase 2 cron running smoothly + learnings indicating demand.

---

## Trigger to Start

Phase 3 begins when ALL of:
- Phase 2 cron has run ≥4 weekly consolidations
- learnings.md shows repeated patterns like "needed brand voice reference",
  "did copywriting manually", "wished I had research context"
- You're ready to fill in brand_context files (you have clarity on your
  positioning, ICP, and voice)

---

## Goal

Populate the brand context layer and add the first creative/marketing skills.
The system starts producing non-dev output (copy, research, content strategy)
informed by accumulated learnings and brand context.

---

## Deliverables

### 1. Brand context — fill _self/ templates

Complete the templates created in Phase 1:

**brand-voice.md** (~40 lines):
- Tone attributes (e.g. "confident but not arrogant", "technical but accessible")
- Vocabulary: words to use, words to avoid
- Example sentences: "sounds like us" vs "doesn't sound like us"
- Channel variations (website vs LinkedIn vs proposals)

**icp.md** (~40 lines):
- Primary ICP: who you're targeting for AI consulting
- Secondary ICP: Webflow dev clients
- Pain points, goals, objections
- Where they hang out, how they buy

**positioning.md** (~30 lines):
- What you do (1 sentence)
- For whom (1 sentence)
- Why you're different (1-3 differentiators)
- Proof points (portfolio, testimonials, case studies)

### 2. Brand context — first client profiles

Create `brand_context/{client}/` directories for active clients.
Start with 1-2 clients. Each gets brand-voice.md, icp.md, positioning.md
populated from existing knowledge (MEMORY.md, project specs, past work).

### 3. mkt-copywriting skill

Location: `~/.claude/skills/mkt-copywriting/SKILL.md`

Reads: `brand_context/_self/brand-voice.md`, `brand_context/_self/icp.md`,
`context/learnings.md#mkt-copywriting`

Capabilities:
- Website copy (headlines, CTAs, feature descriptions)
- LinkedIn posts
- Proposal copy (paired with existing rate-card.md)
- Email sequences
- Case study drafts

Writes learnings to its section in learnings.md after feedback.

### 4. str-research skill

Location: `~/.claude/skills/str-research/SKILL.md`

Reads: `brand_context/_self/icp.md`, `brand_context/_self/positioning.md`,
`context/learnings.md#str-research`

Capabilities:
- Competitor research (what are other AI consultants/Webflow devs doing?)
- Trend research (Claude Code updates, Webflow features, AI tooling)
- ICP research (where is your audience, what are they saying?)
- Topic research (for content or proposals)

Outputs to a `research/` directory. Writes learnings after feedback.

### 5. mkt-content-repurposing skill

Location: `~/.claude/skills/mkt-content-repurposing/SKILL.md`

Reads: `brand_context/_self/brand-voice.md`,
`context/learnings.md#mkt-content-repurposing`

Capabilities:
- Take a long-form piece (case study, blog post, project write-up) and
  produce: LinkedIn post, Twitter thread, newsletter section, website blurb
- Adapt tone per channel using brand-voice.md channel variations
- Maintain consistent messaging across formats

### 6. Update existing commands to read brand_context

Six existing commands currently ask for brand/client context manually on
every invocation. Update them to auto-read `brand_context/{client}/` first,
only asking for info that's missing or stale.

| Command | Update |
|---------|--------|
| `/intake` | After audit, populate `brand_context/{client}/` files (brand-voice.md from site tone, icp.md from audience signals, positioning.md from messaging). This is the primary client profile builder. |
| `/client-brief` | Read existing `brand_context/{client}/` first. Only ask questions that aren't already answered. Write any new info back to brand_context files. |
| `/copy-review` | Auto-read `brand_context/{client}/brand-voice.md` for tone, audience, do/don't words. Skip manual tone questions if file exists. |
| `/design-review` | Auto-read `brand_context/{client}/brand-voice.md` for brand voice context. Skip the "brand voice" question in design-context gathering if file exists. |
| `/proposal` | Read `brand_context/{client}/positioning.md` + `icp.md` for project framing and value proposition language. |
| `/estimate` | Read `brand_context/{client}/` for scope context and client expectations. |

Pattern: each command checks `brand_context/{client}/` → if files exist,
read and inject as context → if missing, fall back to asking (current behaviour)
→ offer to save answers to brand_context after the command completes.

### 7. catalog.json updates

Register all new skills with category `mkt` or `str`. Add `reads` and
`writes` fields showing brand_context dependencies.

---

## Estimated Scope

- Brand context files: ~3 hours (requires your input, not just AI generation)
- Client profiles: ~1 hour per client
- 3 new skills: ~2-3 hours total
- catalog.json updates: ~30 minutes
- **Total**: ~1 week (spread across sessions, since brand context needs your voice)

---

## Token Cost per Skill Invocation

| Skill | Context reads | Est. tokens |
|-------|--------------|-------------|
| mkt-copywriting | brand-voice + icp + learnings section | ~1,500 |
| str-research | icp + positioning + learnings section | ~1,200 |
| mkt-content-repurposing | brand-voice + learnings section | ~1,000 |

Minimal — brand context files are small by design.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Brand context files are generic / not authentic | You fill these in, not AI. AI can draft, you must edit to sound like you |
| Creative skills produce mediocre output | learnings.md feedback loop — flag bad output, skill improves over time |
| Scope creep into more skills | Stick to 3. Add more only when learnings show demand |
| Client brand context gets stale | 90-day heartbeat scan flags stale files |

---

## Success Criteria

- brand_context/_self/ files are filled and feel authentic
- ≥1 client profile exists and is referenced by a skill
- Each creative skill has been used ≥5 times
- Each creative skill's learnings.md section has ≥3 entries
- You've used AI-generated copy in a real deliverable (website, LinkedIn, proposal)
