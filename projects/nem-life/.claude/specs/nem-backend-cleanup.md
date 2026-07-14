# NEM Life Backend Cleanup

**Slug:** `nem-backend-cleanup`
**Status:** Ready to Build
**Priority:** P1
**Type:** chore
**Created:** 2026-06-09
**Project:** nem-life

## Summary

Translate all Webflow backend labels into English while keeping public-facing slugs in Dutch. Page names, CMS field display names, and help texts all become English Title Case. Dutch option values (e.g. "Vrouw"/"Man") stay Dutch. Collection-level names are skipped (no API endpoint).

## Scope

### In scope
- Page title translations (Dutch → English)
- Page slug corrections (English → Dutch where needed)
- CMS field `displayName` → English Title Case
- CMS field `helpText` → translate existing Dutch + add missing English help texts
- Flag orphaned/duplicate fields for manual review
- Include draft pages

### Out of scope
- Collection-level `displayName` / `singularName` (no API endpoint — manual Designer task)
- Deleting fields (flagged only)
- SEO titles/descriptions (content, not backend labels)
- CMS item content (front-end copy)
- Dutch option values inside fields (keep as-is per client preference)

## API Constraint

The Webflow Data API has **no `update_collection` endpoint**. Collection display names and singular names cannot be renamed programmatically. These are documented below for manual rename in the Designer:

| Collection ID | Current Name | Target Name | Current Singular | Target Singular |
|--------------|-------------|-------------|-----------------|-----------------|
| 69d78962446a916ce78bfc8a | Inzichten | Insights | Inzicht | Insight |
| 69d7896a784024881c06fd32 | Inzichten / Themas | Insights / Themes | Inzichten / Thema | Insights / Theme |
| 69d7d36dcf475c28e32fc101 | Ervaringen | Testimonials | Ervaring | Testimonial |
| 69d7d3aae83b621c2dbc8236 | Ervaringen / Categories | Testimonials / Categories | Ervaringen / Category | Testimonials / Category |
| 6a0f7ba24566497b3d35f8b4 | Inzichten / Tags | Insights / Tags | Inzichten / Tag | Insights / Tag |
| 6a1ed8e938632226a3ae7173 | Zelftests | Self Tests | Zelftest | Self Test |
| 6a1fe73f7348c8e2497cc922 | Zelftests / Vragen | Self Tests / Questions | Zelftests / Vraag | Self Tests / Question |
| 6a1fe8a7152352b2e3e8272d | Zelftests / Resultaten | Self Tests / Results | Zelftests / Resultaat | Self Tests / Result |

---

## Task 1: Page Title Translations

Update page titles to English via `update_page_settings`. Slugs stay Dutch unless noted.

| Page ID | Current Title | New Title | Slug Change |
|---------|--------------|-----------|-------------|
| 6a285a56199803a93e5504fd | Popular Insights | Popular Insights | (none) |
| 69d759788cc49dfcb458eb87 | Inzichten | Insights | (none) |
| 69d78963446a916ce78bfca3 | Inzichten Template | Insights Template | (none) |
| 69d7896a784024881c06fd6c | Inzichten / Themas Template | Insights / Themes Template | (none) |
| 6a0f7ba34566497b3d35fea3 | Inzichten / Tags Template | Insights / Tags Template | (none) |
| 69d7ce37730dc092d7790a8d | Ervaringen | Testimonials | (none) |
| 69d7d36ecf475c28e32fc108 | Ervaringen Template | Testimonials Template | (none) |
| 69d7d3aae83b621c2dbc823d | Ervaringen / Categories Template | Testimonials / Categories Template | (none) |
| 6a1ed8e938632226a3ae7191 | Zelftests Template | Self Tests Template | (none) |
| 6a1fe73f7348c8e2497cc952 | Zelftests / Vragen Template | Self Tests / Questions Template | (none) |
| 6a1fe8a8152352b2e3e827a1 | Zelftests / Resultaten Template | Self Tests / Results Template | (none) |

**Pages already in English (no change needed):**
- Home NEM Life, NEM Method, Our mission, Terms & Conditions, Privacy Policy, 404, Christel, Style Guide, Quiz Test, New Page

## Task 2: Page Slug Dutch Corrections

| Page ID | Current Slug | New Slug | Reason |
|---------|-------------|----------|--------|
| 69ea325bcd5f0b02a71f8f20 | privacy-policy | privacybeleid | Align with Dutch slug convention |

**Warning:** Changing a published page slug breaks existing links. This page is live at `/privacy-policy`. Consider adding a 301 redirect from the old slug.

## Task 3: CMS Field Title Case Fixes

Fields where `displayName` needs Title Case correction. Updated via `update_collection_field`.

### Inzichten (69d78962446a916ce78bfc8a)

| Field ID | Current Name | New Name |
|----------|-------------|----------|
| 43c4417b2ec28075e5213c098da3d38b | Body content | Body Content |
| 30ef65b0bf5e363159417020a6910b68 | Key insight 1 | Key Insight 1 |
| e5638502610f12810bffb32c7f851c3d | Key insight 2 | Key Insight 2 |
| ad0dfc482ebbd149392559ae7737ee75 | Key insight 3 | Key Insight 3 |
| 28865bee81ff2d8220f857c00dd78a7d | Related insights | Related Insights |
| 9c3422146840264288de195d837cee0a | Essential insight - Main page | Essential Insight - Main Page |
| a9d0cd7b02de144115e8e080f7c2ff4e | Date published | Date Published |
| 4106cedd86c2af4b0109ddbef7b06e54 | Date modified | Date Modified |
| 56bff790431f4098325174ae5ef56915 | SEO meta title | SEO Meta Title |
| e12c30c7168be401b9627bc2c579fd04 | SEO meta description | SEO Meta Description |

### Inzichten / Themas (69d7896a784024881c06fd32)

| Field ID | Current Name | New Name |
|----------|-------------|----------|
| 7b6f1fd6fe670000ed5fa6e93f2fbe77 | Page subheading | Page Subheading |

### Inzichten / Tags (6a0f7ba24566497b3d35f8b4)

| Field ID | Current Name | New Name |
|----------|-------------|----------|
| 3a3d99807863db2ce5b4a184ff398293 | Page subheading | Page Subheading |

### Zelftests (6a1ed8e938632226a3ae7173)

| Field ID | Current Name | New Name |
|----------|-------------|----------|
| 2ebd3982b4b643e76f57688ad3b664e9 | SEO Metadescription | SEO Meta Description |

## Task 4: CMS Field Help Text Updates

Add or fix help texts on all fields. Existing help texts that are already good English are left unchanged.

### Inzichten (69d78962446a916ce78bfc8a)

| Field ID | Field Name | Current Help | New Help |
|----------|-----------|-------------|----------|
| 8b87d850af487dc67a695a81bf236e69 | Introduction | (none) | Short preview text shown on cards and at the top of the article. 1-2 sentences. |
| 63a97384768ce99b0ce9aecf6ed22b8e | Tags1 | (none) | Multi-select tags for filtering. Choose all tags that apply to this article. |
| 8a69fc2cc8838928feec44becffbfac2 | Tags | tag 1 | Legacy field — do not use. Replaced by Tags1 multi-reference. |
| b9634fbdbcc16b2e945532068a2f6f9c | Tag 1 | (none) | Legacy single tag reference — do not use. Use Tags1 multi-reference instead. |
| 955c3eb7c1dad476695fc8f71b995b19 | Tag 2 | (none) | Legacy single tag reference — do not use. Use Tags1 multi-reference instead. |
| 43c4417b2ec28075e5213c098da3d38b | Body Content | (none) | Main article body. Use headings, lists, and images as needed. |
| 814e33760f4010a4606fbed8abaa6ecb | Essence (to be removed) | (none) | Deprecated — flagged for removal. Do not populate. |
| 9c3422146840264288de195d837cee0a | Essential Insight - Main Page | (keep) | (keep existing) |
| c20c1ea60e75ce27a1f7cd95c9db98fe | Show in Selected | (none) | Show this article in the "Selected Insights" section on the Insights main page. |
| 63766944a4e5537da941243621d50336 | Show in Popular | (none) | Show this article in the "Popular Insights" section on the Insights main page. |
| 2f539d2a11034d9bbb62aa52920f40e1 | Main Image | (none) | Hero image displayed at the top of the article and on cards. Recommended: 1200x800px. |
| fb473330c74251e49b4f290c7316b3f6 | Blog Tag 1 | (none) | Plain text tag label shown on article cards. |
| c16d3328cbff163ba9a50f2b4dba4848 | Blog Tag 2 | (none) | Second plain text tag label shown on article cards. |

### Inzichten / Themas (69d7896a784024881c06fd32)

| Field ID | Field Name | Current Help | New Help |
|----------|-----------|-------------|----------|
| 7b6f1fd6fe670000ed5fa6e93f2fbe77 | Page Subheading | (none) | Descriptive subheading shown below the theme title on the category page. |
| 38bce376f93d862156f44cf16732978a | Name | (none) | Theme display name. Shown as the category heading on the Insights page. |

### Ervaringen (69d7d36dcf475c28e32fc101)

| Field ID | Field Name | Current Help | New Help |
|----------|-----------|-------------|----------|
| 8de3a0f295d08e3f0290199ef10075f1 | Essence Title | (none) | One-line headline summarising the testimonial. Shown as the H1 on the detail page. |
| 3306804195ffd1646ee8222cc3dbe2e4 | Short Description | (none) | Brief excerpt shown on testimonial cards. 1-2 sentences. |
| 88f91f8b2beae1b4f2c5741ebd8d62ce | Age | (none) | Age of the person sharing their experience. Shown on the card. |
| bc85ace65b5e7a008ac8a0df61bdd4c1 | Person State | (none) | Gender of the person. Used for dynamic CTA copy on the Testimonials page. Options are in Dutch. |
| ff235d41e95a5545a20f344f7b4ba3a0 | Category Is | (none) | Journey type category. Used for filtering on the Testimonials page. |
| 0ffa030fa3102e4f5aaeb1568fcdead2 | Region | (none) | Geographic region of the person. Shown on the card. |
| 91a020f9135b738e81ebc863d8152287 | Full Text | (none) | Complete testimonial text. Displayed on the detail page. |
| 85ea71349c189ce5175dffb03fe3686f | Name | (none) | Person's first name or pseudonym. Shown on cards and the detail page. |

### Ervaringen / Categories (69d7d3aae83b621c2dbc8236)

| Field ID | Field Name | Current Help | New Help |
|----------|-----------|-------------|----------|
| 92459b33e53a49b72e28d6e6bc90d159 | Name | (none) | Category display name. Shown as a filter label on the Testimonials page. |

### Inzichten / Tags (6a0f7ba24566497b3d35f8b4)

| Field ID | Field Name | Current Help | New Help |
|----------|-----------|-------------|----------|
| 3a3d99807863db2ce5b4a184ff398293 | Page Subheading | (none) | Descriptive subheading shown below the tag title on the tag page. |
| 7b001727c56254d405ceea9a59cf7c32 | Name | (none) | Tag display name. Shown on article cards and tag filter pages. |

### Zelftests (6a1ed8e938632226a3ae7173)

| Field ID | Field Name | Current Help | New Help |
|----------|-----------|-------------|----------|
| 26b649c06b7dd6952d649dab04f2a17f | Questions | (none) | Link to quiz questions. Order determines question sequence. |
| 82f684cb5359ef0c4ee4d9379ba9ec7f | Intro Heading | (none) | Heading shown on the quiz intro screen before the user starts. |
| 5f1aa624a3ad6a9307ea949f101421ab | Intro Body | (none) | Body text on the quiz intro screen. Brief description of what the test measures. |
| 7eed8605e57040cd7e2efa9d3dd7dedb | Intro Button Text | (none) | Call-to-action button text on the intro screen. E.g. "Start de test". |
| cc3783b26919b12d1b3ee5f39b475135 | Results Heading | (none) | Heading shown above the quiz results after completion. |
| 75f39da4fd7a8b4fa4d431cfaf68d4b9 | Mailing List Heading | (none) | Heading for the email signup shown after quiz results. |
| 1bd7e08d5a389a4e62bc98d5e7b41f3d | Mailing List Button Text | (none) | Button text for the email signup form. E.g. "Ontvang tips". |
| 9ea365d34dff8f6490773d8d99c6d9e4 | Form Action URL | (none) | External form endpoint URL for the mailing list signup. Paste the full URL from your email provider. |
| a42a997b8be6d19e4ebd8b9b8d85b03e | SEO Title | (none) | Page title for search engines. Keep under 60 characters. |
| ac8186e5ac4e46cdfb9dfe3c5e4b1702 | Name | (none) | Internal quiz name. Not displayed on the front end. |

### Zelftests / Vragen (6a1fe73f7348c8e2497cc922)

| Field ID | Field Name | Current Help | New Help |
|----------|-----------|-------------|----------|
| 46d404ea866b01558965f5a7775d7577 | Question | (none) | The quiz question text shown to the user. |

### Zelftests / Resultaten (6a1fe8a7152352b2e3e8272d)

| Field ID | Field Name | Current Help | New Help |
|----------|-----------|-------------|----------|
| 501ad5fe43c79998ef8e384c72870e53 | Title | (none) | Result heading shown to the user after completing the quiz. |
| 76d0b663f72c2a1ad623d0d1a24e81d2 | Description | (none) | Short result summary shown below the title. 1-2 sentences. |
| dd644d6227053a741bb5ebfe4956cdc5 | Lower Score | (none) | Minimum score (inclusive) that triggers this result band. |
| ff5cdafe32c03ed00d95df06acfa3367 | Upper Score | (none) | Maximum score (inclusive) that triggers this result band. |
| 552cc8ecb214f89444608dd443c910e2 | Content | (none) | Full result explanation in rich text. Shown below the summary. |

---

## Task 5: Flag Orphaned / Duplicate Fields

The following fields in the **Inzichten** collection appear to be legacy duplicates. Do not delete — flag for manual review with the client.

| Field | Type | Issue |
|-------|------|-------|
| Tags (8a69fc2cc8838928feec44becffbfac2) | Option | Single option "tag 2" with help text "tag 1" — appears to be a test field |
| Tag 1 (b9634fbdbcc16b2e945532068a2f6f9c) | Reference | Single tag ref — superseded by Tags1 MultiReference |
| Tag 2 (955c3eb7c1dad476695fc8f71b995b19) | Reference | Single tag ref — superseded by Tags1 MultiReference |
| Essence (to be removed) (814e33760f4010a4606fbed8abaa6ecb) | PlainText | Explicitly marked for removal in display name |
| Blog Tag 1 (fb473330c74251e49b4f290c7316b3f6) | PlainText | Plain text tag — possibly redundant with Tags1 ref |
| Blog Tag 2 (c16d3328cbff163ba9a50f2b4dba4848) | PlainText | Plain text tag — possibly redundant with Tags1 ref |

Help texts for these fields have been set to "Legacy — do not use" or "Deprecated — flagged for removal" (see Task 4) so editors know to avoid them.

---

## Task Execution Order

1. **Task 3** — CMS field Title Case fixes (14 fields)
2. **Task 4** — CMS field help text updates (~40 fields)
3. **Task 1** — Page title translations (11 pages)
4. **Task 2** — Page slug Dutch correction (1 page — do last, has redirect implications)
5. **Task 5** — Flagging is done via help text in Task 4 (no separate API calls)

Tasks 1-4 are all independent API calls with no dependencies between them. They can run in parallel.

## Parallelisation Map

| Stream | Agent | Tasks | Est. API Calls | Dependencies |
|--------|-------|-------|---------------|-------------|
| A | code-writer | Task 1 (page titles) | 11 | None |
| B | code-writer | Task 2 (page slug) | 1 | None (but do last for safety) |
| C | code-writer | Task 3 + 4 combined (CMS fields) | ~54 | None |

**Recommendation:** Sequential execution is fine — all tasks are pure MCP API calls, no code to write. A single `/build` session can execute all ~66 API calls in under 10 minutes. No worktrees needed.

## Barba Impact

N/A — no Barba transitions on NEM Life.

## Verify Loop

### Pass/fail criteria
- All 11 page titles are in English (verified via `list_pages`)
- Privacy Policy slug is `privacybeleid` (verified via `get_page_metadata`)
- All 14 Title Case field names match spec (verified via `get_collection_details`)
- All ~40 help text fields are populated with English text (verified via `get_collection_details`)
- No Dutch text remains in any `displayName` field (except Slug/Name system fields)

### Reproduction steps
1. Call `list_pages` for site `69bfba56f3622791a798b816` — check all titles
2. Call `get_collection_details` for each of the 8 collections — check all field displayNames and helpTexts
3. Call `get_page_metadata` for page `69ea325bcd5f0b02a71f8f20` — check slug is `privacybeleid`

### Tier mapping
- **Tier 1 (Auto):** Playwright test verifies page titles via Webflow API calls in a Node script
- **Tier 2 (CDN):** N/A — no deployed code
- **Tier 3 (Manual):** Collection-level names must be verified manually in Designer (see API Constraint table above)

### Regression scope
- Page slug change (`privacy-policy` → `privacybeleid`) may break inbound links — verify 301 redirect is in place
- CMS field slug changes: NONE — only `displayName` and `helpText` are modified, no slug changes
- No code changes, no animation changes, no DOM changes

## Test Plan

### Tier 1 — Auto: API verification script
- Verify all page titles match expected English values
- Verify privacy-policy slug changed to `privacybeleid`
- Verify all CMS field displayNames match expected Title Case values
- Verify all CMS fields have non-empty helpText

### Tier 2 — CDN regression
- N/A — no deployed code changes

### Tier 3 — Manual
- Verify collection-level names in Webflow Designer (cannot be checked via API)
- Verify the privacy policy page loads at `/privacybeleid` on staging
- Spot-check that CMS editor UI shows correct field labels and help texts

## Acceptance Tests

| Test Name | What It Checks |
|-----------|---------------|
| page titles are in English | All 11 renamed pages have correct English titles |
| privacy policy slug is Dutch | Slug changed from privacy-policy to privacybeleid |
| inzichten fields are Title Case | All 10 renamed fields have correct casing |
| themas fields are Title Case | Page Subheading field has correct casing |
| tags fields are Title Case | Page Subheading field has correct casing |
| zelftests fields are Title Case | SEO Meta Description field has correct casing |
| all CMS fields have help text | Every non-system field across all 8 collections has non-empty helpText |
