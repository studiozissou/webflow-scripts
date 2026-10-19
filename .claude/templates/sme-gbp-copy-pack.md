# {{business_name}}: Google Business Profile copy

> **When to use:** the paste-ready pack that goes with the `/sme-audit` report.
> **Output file:** `projects/{client}/.claude/reports/gbp-copy-YYYY-MM.md`
>
> - Every field gets a status line: **filled** (facts checked against the live site) or **OWNER-CHECK** (needs the owner's login, a fact only they know, or their approval).
> - Use facts from the live site only. No claims the site does not already make.
> - Reuse the same name, address and phone on every other listing (Apple Business Connect, Bing Places, sector directories).

**Date:** {{date}} · **Facts from:** {{fact_sources}}

## Name, address, phone

Status: {{filled_or_owner_check}}

- **Name:** {{business_name}} (the real business name only; adding keywords to the name breaks Google's guidelines and can get the profile suspended)
- **Address:** {{street_and_number}}, {{postcode}} {{city}}
- **Phone:** {{phone}} (same format as on the site)
- **Website:** `{{website_url}}?utm_source=google&utm_medium=organic&utm_campaign=gbp`
- **Booking link:** `{{booking_url}}?utm_source=google&utm_medium=organic&utm_campaign=gbp-booking`

## Categories

Status: {{filled_or_owner_check}}

- **Primary:** {{primary_category}}
- **Secondary:** {{secondary_category}} · {{secondary_category}}

## Description

Status: {{filled_or_owner_check}} · Limit: 750 characters · Length: {{character_count}}

{{description_text}}

Checked against: {{pages_checked}}

## Services

Status: {{filled_or_owner_check}}

- **{{service_name}}:** {{service_description}}
- **{{service_name}}:** {{service_description}}

## Hours

Status: {{filled_or_owner_check}}

{{opening_hours}}

Special hours to add: {{holiday_hours}}

## Photos

Status: {{filled_or_owner_check}} · Current count: {{photo_count}} · Newest: {{newest_photo_date}}

Minimum set: logo · cover photo · {{n}} exterior (so people find the door) · {{n}} interior · {{n}} of the work or service · owner or team. Then add {{n}} new photos a month.

## First three posts

Status: {{filled_or_owner_check}} · Limit: up to 1,500 characters each · One a week.

1. **{{post_title}}.** {{post_text}} Button: *{{button_label}}*.
2. **{{post_title}}.** {{post_text}} Button: *{{button_label}}*.
3. **{{post_title}}.** {{post_text}} Button: *{{button_label}}*.

## Review request

Status: {{filled_or_owner_check}}

Get the short review link from the profile under "Ask for reviews". Send it after a visit, by email or on a card.

**NL**
> {{nl_review_request}} [review link: {{review_link}}]

**EN**
> {{en_review_request}} [review link: {{review_link}}]

Reply to every review within a few days. Mention the service or the town naturally now and then.
