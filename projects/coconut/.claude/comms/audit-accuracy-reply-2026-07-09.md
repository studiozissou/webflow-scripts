# Reply — audit accuracy feedback

**Date:** 9 July 2026
**Re:** Coconut Website Audit — Findings & Recommendations (comments of 8 July)
**Status:** Draft for Will's review before sending

---

Thanks for going through this properly — you're right on both counts, and the challenge is a fair
one. Here's what happened, what I've corrected, and what I found when I went back and re-checked
the whole document rather than just the two items you flagged.

## You're right about Consent Mode

I re-tested the site this morning in a clean browser with no stored consent cookie, and read the
consent state directly rather than inferring it:

```
gtag('consent', 'default', {
  ad_storage: denied, analytics_storage: denied, ad_user_data: denied,
  ad_personalization: denied, personalization_storage: denied,
  security_storage: denied, functionality_storage: denied
})
```

Consent Mode v2 is implemented, correctly, with all seven categories defaulting to denied. No
`_ga` cookie is set before consent. Your description — anonymised pings until someone actively
consents — is exactly what the site does.

**Task 13 ("Fix analytics consent timing", 2 hours) is withdrawn.** It should never have been
raised.

For what it's worth, here's how we got it wrong, because it's a genuinely easy trap. A correct
Consent Mode v2 install *does* load GTM and *does* fire tags before the user chooses — that's the
whole design. In a network panel, a compliant site and a non-compliant one look identical. Our
check was written to flag "tags firing before consent", which describes correct behaviour. We
observed something true and drew the wrong conclusion from it. The one query that separates the
two cases takes about ten seconds, and we didn't run it. That's on us.

## You're right about FAQ rich results

Google restricted FAQ rich results to authoritative government and health sites in August 2023.
Coconut is neither, so FAQ markup was never going to produce expandable Q&As in search results,
and we shouldn't have said it would.

The markup itself is still worth having — it's a clean page-type signal and it helps AI assistants
extract the Q&As — but that's a much more modest claim than the one we made, and it wouldn't on its
own justify the same priority. Tasks 9 and 10 stay, with corrected reasoning and no promise of
rich results. Your instinct that "the jury is still out" is the right read.

## Two things I found going back through the rest

I re-checked every claim in the document under the same standard. Two things came out of it.

### Hotjar is running on the site

You commented "we don't use hotjar". It is live, and I don't think it's a scanning artefact.
On a clean page load this morning:

- `window.hj` is defined — the Hotjar client is loaded and initialised
- Cookies `_hjSessionUser_429202` and `_hjSession_429202` are set on page load
- Hotjar site ID **429202**

Your follow-up guess — "previous Coconut may have done and we just haven't noticed" — is probably
the answer. Worth someone tracking down who owns that account, both because it's recording
sessions and because nobody appears to be looking at the data. Happy to remove the code if you
want it gone.

### There is a real consent gap, and it isn't the one we reported

This is the part that matters. Consent Mode only governs Google's own tags. It has no effect on
anything else. On that same clean load, before I touched the banner, the site set cookies for:

| Vendor | Cookies set before consent |
|---|---|
| Meta / Facebook Pixel | `_fbp` |
| TikTok | `_ttp`, `_tt_enable_cookie`, `ttcsid` |
| Hotjar | `_hjSessionUser_429202`, `_hjSession_429202` |
| Intercom | `intercom-id-*`, `intercom-session-*`, `intercom-device-id-*` |
| Zoho PageSense | `zabUserId`, `zft-sdc`, `zps-tgr-dts`, and others |

GA4 set nothing, exactly as it should. Everything else fired regardless.

That asymmetry is the finding. Consent Mode is doing its job for the tags it covers, which is
precisely why the gap is easy to miss — the Google side looks clean, so nobody looks further.
Cookies from these vendors before a consent choice is the actual PECR exposure, and it's a
different fix: those tags need gating on consent state in GTM, and Zoho and Intercom may need
handling outside GTM entirely.

I'd rather scope this properly than put a number on it now. It's narrower than the 2 hours we
originally quoted for the wrong problem, but it's real, and I don't want to guess at it twice.

### One claim I'm still checking

Task 16 says star ratings can appear in Google results if we add your review score to the
homepage. Google restricts review snippets for self-serving reviews — a business marking up
reviews of itself on its own site — and I want to confirm whether Coconut's usage qualifies before
I let that sentence stand. Treat it as unverified until I come back on it.

## On "can we ensure the facts are checked"

The short version: the facts about your website were checked. The facts about Google weren't.

Every observation about Coconut in that document came from a live crawl and was accurate — the 13
Q&A pairs, the missing alt text, the archive pages, the dual Facebook pixels. Where it fell down
was the "why it matters" column, which explains what Google or an AI assistant will *do* in
response to a fix. Those are third-party behaviours, they change without announcement, and they
were being written from memory rather than checked against a source. FAQ rich results changed in
2023. Consent Mode has always worked the way it works.

So the fix isn't "check the LLM's work harder" in a general sense. It's specific: any claim about
what an external platform does now has to carry a source and a date, or it gets rewritten to rest
only on what we directly observed, or the task gets dropped. That rule is now in the audit tooling
itself, along with the corrected Consent Mode check and a standing note about FAQ rich results, so
neither of these can recur on your site or anyone else's. Every platform-behaviour claim in the
Coconut document has now been through it.

## Revised numbers

| | Was | Now |
|---|---|---|
| P1 total | 4.5 hrs | 2.5 hrs + non-Google consent gating (to be scoped) |
| Task 13 — Consent Mode v2 | 2 hrs | Withdrawn |
| Tasks 9 & 10 — FAQ markup | 1 hr | Unchanged; rationale corrected, no rich-results claim |
| Task 16 — review stars | 0.25 hrs | Unverified, pending check |

Everything else in the document stands. Happy to walk through any of it.
