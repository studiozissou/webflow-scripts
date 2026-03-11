# Plan: Add Mobile Video + Video Title Fields to RHP Work CMS

## Context
The RHP `/work/` CMS collection needs two new fields added **per existing Video/Vimeo Link field**:
1. **Mobile video link** (`Link`) — a separate Vimeo progressive MP4 URL for mobile devices
2. **Video title** (`PlainText`) — a plain text field naming each section's video

## Research Summary
- **Site ID**: `697a0b15902562547e759cd9`
- **Work Items collection ID**: `697a0ebd87060ef313c4a342`
- Codebase reads `data-video` from `.dial_cms-item` elements — no mobile-specific handling exists yet
- Case-study pages use `video.video-cover` inside `.section_case-video` — videos baked into CMS template HTML
- No existing mobile video fields or title fields found anywhere in the codebase

## Steps

### 1. Get current collection schema
- Call `get_collection_details` on collection `697a0ebd87060ef313c4a342` to list all existing fields
- Identify every Video/Vimeo Link field and note its display name + number

### 2. Create new fields via Webflow CMS API
For each existing Video/Vimeo Link field (e.g. "Section 1 Vimeo Link"):

a. **Add mobile video field** — `create_collection_static_field`:
   - `type`: `Link`
   - `displayName`: matching name with "Mobile" inserted (e.g. `Section 1 Mobile Vimeo Link`)
   - `helpText`: `Vimeo progressive MP4 URL for mobile devices`

b. **Add video title field** — `create_collection_static_field`:
   - `type`: `PlainText`
   - `displayName`: matching section number (e.g. `Section 1 Video Title`)
   - `helpText`: `Title displayed for this section's video`

### 3. Verify
- Call `get_collection_details` again to confirm all new fields appear in the schema
- Report the full updated field list to the user

## Notes
- This is a CMS-only change — no JS code changes needed at this stage
- The new fields will appear in the Webflow Designer for content editors to populate
- JS integration (reading `data-mobile-video` / `data-video-title` attributes) would be a separate task
- No Barba impact — CMS field additions don't affect transitions or JS modules

## Verification
1. After field creation, re-fetch collection details and confirm field count increased
2. Open the Webflow Designer → Work Items collection → verify new fields are visible and correctly typed
