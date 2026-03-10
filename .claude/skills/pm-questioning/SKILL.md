---
name: pm-questioning
description: Guides the agent through structured PM questioning before writing specs or starting builds — the 5 essential questions, follow-up probes, and red flags. Activates before any spec or build that lacks clear requirements.
---

<objective>
Gather complete requirements before writing any spec or starting any build using 5 essential questions, follow-up probes, and red flag detection to prevent scope creep and ambiguity.
</objective>

<quick_start>
Use this before writing any spec or starting any build. Never skip the questioning phase.

The 5 essential questions:

1. What does success look like?
- "What should a user be able to do after this is built?"
- "How will we know if this feature is working?"
- "What metric or feeling changes if we get this right?"

2. Who is the user and what are they trying to do?
- "Who specifically will use this? (visitor type, device, context)"
- "What is their goal on this page?"
- "What do they do before and after this interaction?"

3. What are the hard constraints?
- "Is there a deadline or launch date?"
- "What Webflow plan is this site on?" (affects CMS limits, custom code)
- "Which browsers and devices must be supported?"
- "Are there performance budgets? (Lighthouse score, LCP target)"
- "Is the content managed in Webflow CMS or is it static?"

4. What is explicitly out of scope?
- "What related things should we NOT build right now?"
- "Are there adjacent features that could wait for v2?"
- Get this in writing — it prevents scope creep.

5. What could go wrong?
- "Has anything similar been tried before? What happened?"
- "What's the riskiest assumption we're making?"
- "What's the fallback if the animation/feature breaks on mobile?"
</quick_start>

<workflow>
Questioning protocol:
1. Ask all 5 essential questions in one message (don't drip them one at a time)
2. Read the answers carefully — identify what's still ambiguous
3. Ask 1-3 follow-up probes maximum
4. Summarise your understanding back to the user for confirmation before writing the spec

Follow-up probes (use when answers are vague):
- "Can you show me an example?" (reference site, video, screenshot)
- "What happens in the edge case where X?"
- "How does this relate to what's already built?"
- "What's the simplest version of this that would still be valuable?"
</workflow>

<anti_patterns>
Red flags that need more questioning:
- "Make it feel premium" — ask: what does premium mean in this context?
- "Add some animation" — ask: what element, what trigger, what purpose?
- "Like that site we saw" — ask: which site? which specific behaviour?
- "It should be dynamic" — ask: dynamic in what way? CMS-driven or JS-driven?
- "Make it faster" — ask: what's the current performance issue? what's the target?
</anti_patterns>

<success_criteria>
- All 5 essential questions asked and answered
- Ambiguities resolved with follow-up probes (max 3)
- Understanding summarised back to user and confirmed
- Out-of-scope items documented in writing
- No spec or build started before questioning is complete
</success_criteria>
