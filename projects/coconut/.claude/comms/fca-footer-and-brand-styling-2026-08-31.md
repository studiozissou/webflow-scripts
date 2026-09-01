# For Anna — two decisions and one heads-up before the "!Coconut" change goes live

**Date:** 2026-08-31
**Re:** [Trello card 123 — removing the `!` from `!Coconut`](https://trello.com/c/887uZsDt/123-from-from-anywhere-on-the-website-coconut-is-mentioned)
**Spec:** `projects/coconut/.claude/specs/remove-brand-exclamation-mark.md`

We're removing the `!` from `Coconut` everywhere it appears in copy across the site.
Leah confirmed on 14 July that there's no SEO downside. Two things need a decision
from you before, or shortly after, it goes live, and one is just for your awareness.

---

## 1. The FCA line in the footer — needs your sign-off

Every page carries this sentence at the bottom:

> @Coconut and !Coconut are trading names of @Coconut Platform Ltd, company number
> 09904418. !Coconut is registered with the Financial Conduct Authority (FCA) as an
> Account Information Service Provider under the Payment Services Regulations 2017
> (reference 931194).

We've deliberately **not** touched it, because it does two things a marketing sentence
doesn't: it states your registered **trading names**, and it's an **FCA disclosure**.
Changing either felt like your call rather than ours.

**What this means in practice:** once the change ships, the footer will say `Coconut`
in the copyright line and the nav, but this one sentence will still say `!Coconut`.
That's a visible inconsistency, so it's worth an answer sooner rather than later.

**What we need:** either confirmation we can change `!Coconut` to `Coconut` here too,
or a corrected version of the sentence from whoever owns your regulatory copy.

---

## 2. `@Coconut` — we're leaving it alone

The same footer sentence uses `@Coconut`, your Organization structured data lists the
company as `@Coconut Platform Ltd`, and the legal pages say `@Coconut Platform Limited`.
Companies House has it as **Coconut Platform Ltd**, with no `@`.

The card only asked about the `!`, so we're **not** touching the `@` — just flagging it
so you know it's there and that leaving it was deliberate. If you ever want it changed,
it's a small, separate job.

---

## 3. Profiles outside the website

Leah's note recommended keeping the brand consistent "across the site and any key
external profiles". We can only change the website. These are worth someone checking:

- Google Business Profile
- App Store and Google Play listings
- LinkedIn, and other social bios
- Trustpilot
- Any partner or directory listings

This needs an owner — it isn't web development work.

---

## Two smaller things we noticed

**The logo is staying as it is.** The wordmark image still shows `!Coconut`, and its
filename contains `!Coconut` too. We've left both alone — renaming the file would risk
breaking images across the site for no visible benefit. If you want the wordmark itself
redrawn without the `!`, that's a separate design job and we'd need new artwork.

**`/partners` has the wrong meta description.** It's currently a copy-paste of the
webinars page description ("Join Coconut's free online webinars and events…"). Unrelated
to this card, but it's what Google shows for that page, so it's worth fixing. Happy to
pick it up if you want it added.

---

## For reference — what's actually changing

| | |
|---|---|
| Pages on the live site | 231 |
| Mentions of `!Coconut` in the page code | 4,339 |
| Of those, invisible file references we're leaving alone | 2,124 |
| Actually visible to people or to Google | 2,215 |
| Fixed by five edits to the shared nav and footer | 1,131 |
| The FCA line above (left alone, pending your answer) | 460 |
| Everything else — page copy, FAQs, articles, page titles | 624 |

The biggest single page is the Terms page, with 121 mentions. We're including it.
