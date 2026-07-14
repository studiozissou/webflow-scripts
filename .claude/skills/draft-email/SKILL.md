---
name: draft-email
description: >-
  Write a short email from a brief instruction and save it straight to the
  user's Gmail drafts. Use this whenever the user wants to draft, write, or
  knock out an email, a reply, a quick note, or a message to someone, even if
  they don't say the word "draft" or mention Gmail explicitly. Triggers on
  phrases like "email X about Y", "draft a note to...", "reply to...", "write
  to...", or "/draft-email". The email is written in Will's voice and the draft
  is created in Gmail without a separate confirmation step.
---

# Draft Email

Turn a short instruction into a finished email and save it to Gmail drafts using
`mcp__claude_ai_Gmail__create_draft`. The point is speed: the user gives you the
gist, you produce a ready-to-send draft in their voice, and it lands in Gmail so
they can glance at it and hit send.

## Voice

Write as **Will**: a polite, well-educated British man of 39. The tone is warm
but efficient. He sounds like a real person writing quickly to someone he
respects, not like a template.

- **Very short.** Aim for two to four sentences. Say the thing, then stop.
  Length is a feature; a wall of text is a failure even if every sentence is
  good.
- **Warm opener, warm off-ramp.** A brief friendly line at the top ("Hope
  you're well," "Lovely to meet you the other day,") and a light closing line
  when it fits. Never gushing.
- **British English throughout:** organise, apologise, colour, whilst is fine,
  etc. Use the Oxford comma.
- **No em dashes or en dashes.** Restructure with commas, full stops, or
  parentheses instead. This one matters; check the draft before saving.
- **No corporate jargon.** Ban "circle back", "touch base", "reach out",
  "synergy", "leverage", "action this", "bandwidth". Say it plainly: "I'll get
  back to you", "let's talk", "can you send me".
- **Contractions are natural.** "I'm", "don't", "we'll", "it's". He wouldn't
  say "I am writing to inform you".
- **No emoji.** Not in the body, not in the subject.
- **Avoid crutch words.** Don't lean on the same stock phrases every time. In
  particular avoid "landed" ("something's landed"), "circle", "just wanted to",
  and "quick" as filler. Reach for a fresh, plain way to say it instead; variety
  is what makes it read like a person rather than a template.
- **No sign-off.** End on the last real sentence. Do not add "Best", "Cheers",
  "Kind regards", or a name; Will adds his own sign-off in Gmail. Do still
  include a greeting line ("Hi Sarah,") when you know the recipient's name.

The instruction the user gives you sets the content and any specific tone shift
(e.g. "make it apologetic", "keep it firm"). When their instruction conflicts
with the defaults above, follow their instruction, but keep the hard rules (no
em dashes, no jargon, no emoji, no sign-off) unless they explicitly override
them.

## Recipient and subject

Fill `to` and `subject` when the instruction makes them clear. Infer the subject
from the content if it's obvious and natural, do not force one.

If the recipient's email address or the subject is genuinely unclear and you
can't reasonably infer it, ask the user one short question before saving rather
than guessing an address. A wrong `to` address is worse than a quick question.
If they give a name but no address, ask for the address (or leave `to` empty and
tell them you've left it blank for them to fill).

## Saving

Create the draft immediately with `create_draft`, no separate "shall I save
this?" step. Pass:

- `to`: array of plain email addresses (e.g. `["sarah@acme.co.uk"]`). The tool
  does not accept "Name <email>" format, addresses only.
- `subject`: the subject line, if known.
- `body`: the email text.

If the email is a reply to a specific message you've been given the ID for, pass
`replyToMessageId` so it threads correctly.

After saving, show the user the email you wrote (subject and body) in your reply
so they can see it without opening Gmail, and confirm the draft is saved. Keep
your own commentary to a line or two.

## Examples

**Example 1**
Instruction: "email tom at brightfold to say I can't make Thursday's call, suggest Friday afternoon instead"

Draft:
- to: `["tom@brightfold.com"]` (ask for the address if you don't have it)
- subject: `Thursday's call`
- body:
```
Hi Tom,

Hope you're well. I'm afraid something's come up and I won't be able to make our call on Thursday. Would Friday afternoon suit you instead? I'm free from two o'clock onwards.

Sorry for the short notice.
```

**Example 2**
Instruction: "quick thank you to Priya for the intro to the design team"

Draft:
- subject: `Thank you`
- body:
```
Hi Priya,

Thank you so much for introducing me to the design team, that was really kind of you. They were a pleasure to talk to and I think there's a lot we can do together.

Owe you one.
```

Both stay under four sentences of substance, sound like a real person, carry no
em dashes or jargon, and stop before any sign-off.
