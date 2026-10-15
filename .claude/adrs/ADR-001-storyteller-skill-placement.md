# ADR-001: Storyteller capability is a private skill, not an agent or a design-critic lens
**Date:** 2026-10-14
**Status:** Proposed

## Context
The user owns the Storyteller Tactics deck (53 cards by Steve Rawling, © Pip Decks: 46 tactics in seven categories plus 7 recipes). They want:
1. A reference library transcribed from the cards.
2. A flow that takes a brief (business, audience, page type), proposes several story options, then helps draft copy for websites, blogs, case studies and about pages.
3. A coaching mode that asks questions while they write their own stories.

They asked whether this should be a skill, an agent or both, and said an agent should join the `/plan` roster.

What shapes the answer:
- **Copyright.** The transcription is private. It lives in `~/webflow-internal` and is symlinked in by `scripts/link-internal.sh` (the `TOP_PATHS` list plus `.gitignore`), like `triage`, `draft-email` and `next`. Nothing in this public repo, including this ADR, may contain card text.
- **Conversation.** Options, pick, draft and coaching are multi-turn, free-text exchanges. A subagent returns one message to its parent, and the Agent SDK docs say AskUserQuestion is unavailable in subagents. In `--auto` and background runs there is no user at all.
- **Pipeline.** `/build` writes code. Copy arrives through the spec or the CMS, so nothing in the pipeline generates narrative. The only agent-side needs are narrative review in `/build` wave 2 and option generation in `/plan`.
- **Direction.** Commit 648268e cut agents by merging them into `design-critic` lenses and by folding the interactive `pm` agent into the `/plan` skill, which asks its questions through `pm-questioning`. The architecture doc counts 7 agents; `.claude/agents/` holds 8 files, the extra one being `architect`, which only `/plan` and `/architect` use.
- **Preload mechanics.** `skills:` injects each listed skill's whole SKILL.md into the subagent at start. A listed skill that is missing is skipped with a debug-log warning only, so an unlinked checkout fails silently.
- **Nesting.** `/build` says subagents cannot spawn agents. Current Claude Code docs allow nesting to a configurable depth, which varies by version. `/build` also reviews in the parent so reviewers did not write the code. Nothing below depends on the nesting rule.

## Options considered

### Option A: Skill only
A private `storyteller` skill (SKILL.md, references/, evals/) symlinked in and run in the main conversation. `/plan` and `/copy-review` get one pointer line each. No agent, lens, routing tag or `agents:` value.
- Pros: every need is a conversation or a file lookup, which is what a skill does.
- Pros: precedent is direct. The `/plan` skill took over the `pm` agent's job through `pm-questioning`, `next` has `evals/`, and `triage` and `carsa-webflow` have `references/`.
- Pros: no public contract changes (`.gitignore` and `TOP_PATHS`, plus two pointer lines), and no public file depends on a private one.
- Pros: upgrading to Option B later is additive.
- Cons: no automatic narrative review in `/build`; the user has to ask.
- Cons: triggering depends on the description wording and may need tuning.

### Option B: Skill plus a `story` lens on `design-critic`
Same skill. `design-critic` preloads it and gains a `story` lens, `/plan` step 4 gains a `story` tag row, `spec-format.md` gains `design-critic:story`, and `/build` wave 2 then reviews specs tagged `story`.
- Pros: reuses the lens mechanism and adds no agent.
- Pros: automatic narrative review in `/build`.
- Cons: three public files change (plus the architecture doc) and a public agent now depends on a private skill. When unlinked it is skipped silently, so the lens would review from memory and still look authoritative.
- Cons: preloading injects the interactive instructions (ask the user, propose options) into a read-only reviewer on every `ux` and `visual` run. Avoiding that means splitting workflow from rubric and reading the rubric by path, which gives up the `ai-search-aeo` preload precedent.
- Cons: `all` means every section, so `story` has to be carved out of `all` or it fires on every default review.
- Cons: the tag would rarely fire. Narrative copy is seldom in the diff `/build` hands to wave 2, and an unused routing row is noise.

### Option C: Dedicated `storyteller` agent plus a thin skill
New `.claude/agents/storyteller.md` (opus, preloads the skill, project memory) generating options in `/plan` and reviewing in `/build` wave 2. The skill stays for interactive use.
- Pros: isolated context and a stronger model for option generation.
- Cons: reverses the consolidation in commit 648268e for a job the main conversation does better, because it already holds the brief and the PM answers.
- Cons: the agent cannot run the options, pick, draft loop, so it returns a one-shot list while the skill still has to exist. The method is written twice and drifts.
- Cons: `/plan` research agents are deliberately Sonnet; an opus agent breaks that cost model.
- Cons: same silent private dependency as B, and an agent and a skill sharing one name is confusing.

### Comparison
Confidence is how sure I am the option is the right call today.

| Approach | Confidence | Complexity | Key risk | Reusable code / precedent |
|----------|-----------|------------|----------|---------------------------|
| A. Skill only | 80 | Low | No automatic story review in `/build`; relies on the user invoking it and on trigger wording | `TOP_PATHS` + `.gitignore` private skills; `next/evals`; `triage/references`; `/plan` + `pm-questioning` |
| B. Skill + `story` lens | 40 | Medium | Public agent depends on a private skill (silently skipped if unlinked); interactive SKILL.md injected into a read-only reviewer; tag rarely fires | `ai-search-aeo` preload; lens table; `agents:` values; wave 2 prompt |
| C. Agent + thin skill | 10 | High | Reverses the consolidation; method written twice; opus cost for work the main conversation does with more context | `architect.md` and `schema.md` as templates; no precedent for a public agent with a private dependency |

## Decision
We will use Option A: a private `storyteller` skill, with no agent, no lens and no routing tag.

The three needs are conversations and file lookups, and the repo showed where those belong when it folded the `pm` agent into `/plan` and `pm-questioning`. The agent-side need, reviewing narrative copy in `/build`, does not exist yet because narrative copy is not in the diffs `/build` reviews. Option B would add public-file changes and a silent private dependency to serve it. The skill includes a review mode and a rubric file from day one, so the rubric is proven by hand before any reviewer is asked to apply it.

**`/plan` roster.** No agent is added, so the step 4 routing table, the valid `agents:` values and the agent count are unchanged. `/plan` step 3 gains one conditional paragraph: for features whose deliverable is narrative copy (about, case study, founder story, landing narrative, story-led blog post), if the `storyteller` skill is present, run its craft mode before writing the spec and record the chosen story under Approach. Auto mode takes the recommended option and lists the other two under Assumptions, as `/plan` already does for approaches. `/copy-review` gains a step that runs the skill's review mode on narrative pages.

**Shape.**
```
.claude/skills/storyteller/                 real files in ~/webflow-internal, symlinked in
  SKILL.md                                  modes: craft (propose, pick, draft), coach, review, card
  references/index.md                       one line per card: name, category, when it fits (read first)
  references/cards/<category>/<slug>.md     the transcription, one file per card, read on demand
  references/web-copy-playbook.md           which cards suit a home hero, about page, case study, blog post
  references/review-checklist.md            checklist for judging a draft
  evals/evals.json, evals/trigger-evals.json
  tests/library.test.mjs                    library integrity
```
The spec (`storyteller-skill`, private) is the source of truth for the full layout.
- Draft mode follows the `ai-search-aeo` lead rules on public pages: answer first, story in the body.
- Output for a client page is saved under `projects/<client>/.claude/research/`, never top-level `.claude/`.
- The skill names tactics to the user but never pastes card text into client-facing copy.

**Revisit.** Supersede this ADR if narrative copy appears in a `/build` diff on three or more specs, or if the user catches themselves running the rubric by hand after builds. The first step up is not Option B in full: add one line to the existing `copy` lens that applies `references/review-checklist.md` when it is readable and says so when it is not. Add a separate `story` lens only if that proves too coarse.

## Consequences
- Positive: smallest change that meets all three needs; the roster, `/plan` routing and the spec format are untouched.
- Positive: no public file depends on a private one, so an unlinked checkout simply lacks the skill.
- Positive: moving up to a `copy` lens addition or a full `story` lens is a few lines in public files.
- Negative / trade-offs: no automatic story review in `/build`.
- Negative / trade-offs: output is only as good as the transcription. A typo in the library reaches every draft, so proof-read it once against the deck.
- Negative / trade-offs: the skill is unavailable outside this checkout unless it is also linked into `~/.claude/skills/` (step 5).
- Next steps, evals first:
  1. Add `.claude/skills/storyteller` to `.gitignore` and to `TOP_PATHS` before any file exists in this checkout, so the transcription can never be staged. Add a test in `tests/internal/` that every `TOP_PATHS` entry is ignored and untracked.
  2. Write `evals/evals.json` (craft, coach, review, card, and "never reproduces card text in client copy") and `evals/trigger-evals.json`.
  3. Write SKILL.md and the references in `~/webflow-internal/.claude/skills/storyteller/`, then run `scripts/link-internal.sh`.
  4. Add the pointer lines to `/plan` step 3 and `/copy-review`.
  5. Optional, for use outside this repo: symlink (never copy) the skill to `~/.claude/skills/storyteller`. Same-name skills resolve enterprise, then personal, then project, so a real copy would silently shadow the project one and drift. Symlinks to one target load once.

Sources, read as search summaries on 2026-10-14 rather than in full: code.claude.com/docs/en/sub-agents, /skills and /agent-sdk/user-input.
