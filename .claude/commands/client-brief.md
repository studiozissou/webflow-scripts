# /client-brief — Client Context

Captures client context before touching Figma or Webflow.
Produces `client.md` only — nothing else.

---

## Pre-flight

If `.claude/client.md` already exists, read it and ask:
"client.md already exists for [client name]. Do you want to update it or start fresh?"
Wait for answer before proceeding.

---

## Questions

Ask all of the following in a single conversational block — not one at a time:

1. What's the client name and what does the company do?
2. What's the primary goal of this site? (leads / e-commerce / content / brand)
3. Who is the target audience?
4. What's the geographic market? (affects schema, hreflang, currency)
5. Any known competitors?
6. What's the engagement scope? (retainer / one-off / build + handoff)
7. Who's the main contact — are they technical?
8. Is there an in-house team or other agencies touching the site?
9. Any constraints — budget tier, locked elements, explicitly out of scope?

---

## Output

Write `.claude/client.md` using `.claude/templates/client.md`.

Read back the completed file and ask:
"Here's what I've recorded — does anything need changing before we proceed?"

Wait for explicit confirmation before closing.

---

## Verification tests

1. `.claude/client.md` exists with all 9 questions answered
2. No other files were created or modified
3. User was shown the completed file and confirmed it
4. If `client.md` already existed, user was asked whether to update or start fresh
