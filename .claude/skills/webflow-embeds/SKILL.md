---
name: webflow-embeds
description: Guides the agent through Webflow custom code placement — site-wide, per-page, and in-canvas embeds, CDN loading order, and CMS data access. Activates when the task involves embedding scripts, custom code, or CDN setup in Webflow.
---

<objective>
Correctly place custom code in Webflow projects — site-wide head/footer, per-page overrides, and in-canvas embeds — with proper CDN loading order and CMS data access patterns.
</objective>

<quick_start>
Types of custom code placement:

Site-wide (all pages):
- Site Settings > Custom Code > Head — scripts/styles loaded on every page, before `</head>`
- Site Settings > Custom Code > Footer — scripts loaded before `</body>` on every page

Per-page:
- Page Settings > Custom Code > Head — overrides/additions for a single page
- Page Settings > Custom Code > Footer — page-specific scripts

In-canvas (Embed element):
- Drag an Embed component from the Add panel
- Use for: in-flow HTML, small JS snippets, third-party widgets, JSON-LD schemas
- Runs after Webflow's JS — good for CMS-driven data
</quick_start>

<common_patterns>
CDN loading order (Site Settings Head):
```html
<!-- 1. Styles first -->
<link rel="stylesheet" href="your-styles.css">

<!-- 2. Core libs (defer so they don't block render) -->
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/@barba/core"></script>
<script defer src="https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js"></script>

<!-- 3. Finsweet (must be defer) -->
<script defer src="https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsfilter@1/cmsfilter.js"></script>
```

Site Footer (orchestrator):
```html
<script src="https://cdn.jsdelivr.net/gh/your-org/webflow-scripts/projects/client/orchestrator.js"></script>
```

CMS Collection page embed (dynamic data):
```html
<script>
  const price = document.currentScript.closest('[data-price]')?.dataset.price;
</script>
```

Passing CMS data to JS — use data attributes on elements:
```html
<!-- In Webflow Designer, add custom attribute -->
<!-- data-price bound to Price field -->
<div class="item" data-price="{{price}}" data-slug="{{slug}}">
```
Then read in JS: `el.dataset.price`

Webflow page namespace (for Barba) — add via Page Settings:
- Attribute: `data-barba`, Value: `wrapper` (on body)
- Attribute: `data-barba-namespace`, Value: `home` (on page container div)
</common_patterns>

<cms_schema_bindings>
JSON-LD on a **Collection Page template** is the one place where inline CMS
bindings are correct — everywhere else, prefer data attributes (see anti_patterns).

Webflow rejects bare `{{ field }}` in the schema field with:

> ⚠️ Contains invalid `{{ variables }}` that will render as empty when published.
> Use `{\{ variables }}` to escape.

**The required token format** — this is the literal string Webflow stores, and what
you must produce if you are writing the field programmatically or handing over a file:

```
{{wf {&quot;path&quot;:&quot;FIELD-SLUG&quot;,&quot;type&quot;:&quot;FIELD-TYPE&quot;\} }}
```

Four things make it valid, and all four are load-bearing:
1. `{{wf ` prefix — not just `{{`
2. Inner JSON uses HTML entities (`&quot;`) for its quotes, not raw `"`
3. `path` is the field **slug** (lowercase, hyphenated: `short-description`), NOT the
   display name ("Short Description")
4. `\}` — the inner closing brace is backslash-escaped, then a space, then `}}`

**Field types** for `type`: `PlainText`, `RichText`, `ImageRef`, `Date`, `Link`,
`Number`, `Bool`, `Option`, `ItemRef`, `ItemRefSet`, `Video`, `Color`, `File`.

Worked example — a real published BlogPosting template:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{{wf {&quot;path&quot;:&quot;name&quot;,&quot;type&quot;:&quot;PlainText&quot;\} }}",
  "description": "{{wf {&quot;path&quot;:&quot;short-description&quot;,&quot;type&quot;:&quot;PlainText&quot;\} }}",
  "image": "{{wf {&quot;path&quot;:&quot;hero-image&quot;,&quot;type&quot;:&quot;ImageRef&quot;\} }}",
  "url": "https://example.com/blog/{{wf {&quot;path&quot;:&quot;slug&quot;,&quot;type&quot;:&quot;PlainText&quot;\} }}",
  "datePublished": "{{wf {&quot;path&quot;:&quot;published-on&quot;,&quot;type&quot;:&quot;Date&quot;\} }}",
  "dateModified": "{{wf {&quot;path&quot;:&quot;updated-on&quot;,&quot;type&quot;:&quot;Date&quot;\} }}"
}
</script>
```

**Built-in item fields** — always available, and they do NOT appear when you list a
collection's fields via the API, so check for them before concluding a field is missing:
`name`, `slug`, `published-on`, `updated-on`, `created-on`.

**Getting the slug right.** The API's `get_collection_details` returns each field's
`slug` — use that value verbatim for `path`. Do not guess from the display name;
"Date Start" is `date-day`, "Main Topic (Podcast)" is `main-theme`.

**Reading and writing the field via MCP:**
- Static pages store a parsed object in `jsonLdSchema`
- **CMS template pages store a raw string in `rawJsonLdSchema`**, including the wrapping
  `<script type="application/ld+json">` tags
- Read with `query_pages_schema_markup`, write with `bulk_update_pages_schema_markup`
- Reading an existing CMS template is the fastest way to confirm current token syntax

**Rules**
- Only bind PlainText into JSON string positions. RichText injects HTML and breaks JSON.
- Validate one real published item before rolling a template out — a malformed token
  fails silently, rendering an empty string rather than erroring.
- A field that is empty for an item yields `""`, which is valid JSON but a meaningless
  value. Make fields required in the collection where schema correctness depends on them.
</cms_schema_bindings>

<anti_patterns>
- Do NOT use inline template variables in **JS** script tags: `var title = "{{wf ...}}"` — use data attributes instead. The exception is a JSON-LD schema block on a Collection Page template, where bindings are the intended mechanism — see cms_schema_bindings.
- Do NOT write bare `{{ field }}` or an invented placeholder like `+{{Field Name}}` into the schema field — Webflow flags it as invalid and publishes it as an empty string
- Webflow re-renders Embed code on every publish — keep embeds minimal
- `defer` scripts execute after DOM is ready — no need for DOMContentLoaded wrapper if using defer
- Webflow's own `webflow.js` runs interactions (IX2) — can conflict with GSAP on same elements
- Use `display: none` + JS-driven show to avoid FOUC for JS-dependent elements
- Webflow Designer preview does NOT run custom JS — test on staging/published site
</anti_patterns>

<success_criteria>
- CDN libraries loaded in correct order (styles, then core libs with `defer`, then Finsweet)
- Orchestrator loaded in site footer (after all deps)
- CMS data accessed via data attributes (not inline template variables)
- No custom JS running in Webflow Designer preview (all tested on staging)
- Embed elements kept minimal — no large scripts inline
</success_criteria>
