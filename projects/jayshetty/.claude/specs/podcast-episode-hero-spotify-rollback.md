# Rollback record — podcast-episode-hero-spotify build (2026-08-19)

Site `64c10a2010e1a379d08bf030` (jayshetty.webflow.io), page **Podcasts Template** `64c133963e40ee8d4e6df725`, collection `64c133963e40ee8d4e6df704`.

## Pre-build state (read via Webflow MCP)

### Hero element tree (unchanged element IDs)
- `.section_podcast-hero` — element `33690fe9-431f-0a2b-2736-d7e96a273640`
  - `.podcast-hero_background-wrapper` — `33690fe9-431f-0a2b-2736-d7e96a273649`
    - `img.image-cover` — `1572533a-88c9-5a60-a679-d6037a79aa52` (asset `64f055d0fe4b3cbdb01c92d5`)
    - HtmlEmbed `.podcast-youtube-embed.is-hero` — `ae92e2c3-3019-c6d3-7f95-c1878a44afce` (code contains CMS bindings; API reports `containsBindings`)
    - `.hero-gradient` — `5672f4db-b709-da48-e301-db957fc2fb0b`
  - `.scroll-down-wrapper` — `2a3c4f55-9870-96d6-e427-c4b683f58b3e`

### Conditional visibility (NOT exposed via MCP APIs)
Raw settings on the section and YouTube embed show only `visibility: true` — the CMS
conditional-visibility rules are invisible to the API. Live-HTML evidence (spec, 19 Aug):
on Spotify-era pages BOTH `.section_podcast-hero` and `.podcast-youtube-embed.is-hero`
render with `w-condition-invisible`. These rules were therefore **left untouched** by the
build; the section is revealed on Spotify-era pages by a CSS override in page head code
instead (see spec deviation note in build report).

### CMS fields (Podcasts collection `64c133963e40ee8d4e6df704`)
- Spotify Link — field `8fb2404da401ac6e187e39e6e0d4a67c`, type Link, slug `spotify-link`
- Youtube ID — field `21f39532ef533e85137253ca2fe68580`, type PlainText, slug `youtube-id-2`

### Page head custom code (BEFORE build — restore this to roll back)
```html
<!-- Canonical URL -->
<link rel="canonical" href="https://www.jayshetty.me/podcast/{{wf {&quot;path&quot;:&quot;slug&quot;,&quot;type&quot;:&quot;PlainText&quot;\} }}">

<style>
/*Hides unused previous and next post buttons*/
div.next-post-insert-previous > div > div > a.next-post-block.is-right,
div.next-post-insert-next > div > div > a.next-post-block.is-left {
    display: none;
}

.swiper-pagination-bullet-active {
    background-color: #000!important;
}
.swiper-pagination-bullet {
    width: 8px;
    height: 8px;
    background-color: transparent;
    border: 1px solid #000;
    opacity: 1;
}
.swiper-pagination {
position: relative;
}
@media screen and (max-width: 679px){
	.swiper-pagination {
		display: none;
}
}
</style>
```

### Page footer custom code (BEFORE build — restore this to roll back)
Swiper CSS link, Finsweet cmsprevnext + cmsload scripts, Swiper JS + init, jQuery
testimonial-modal script — verbatim copy retained in Webflow (the build only APPENDS a
new block after this content; to roll back, delete the appended block marked
`<!-- podcast-episode-hero-spotify -->`).

### Site-wide custom code
Untouched by this build. Confirmed no Spotify iFrame API loader present site-wide
before the build (no collision with the sibling list-page spec).

## Final shipped state (for reference)
- New element: DOM div `class="podcast-spotify-embed is-hero"` (element
  `1d8eb54c-2bcb-854b-06dd-20d3d9da92eb`) containing `div.spotify-hero-target`,
  sibling directly after the YouTube embed. No Webflow style classes, no
  conditional visibility — all styling/behaviour in page custom code.
- Head appended block (`<!-- podcast-episode-hero-spotify -->`): CSS only —
  wrapper hidden by default + absolute inset-0 z-2 positioning, `.is-active`
  reveal, `.section_podcast-hero.spotify-hero-active { display:block !important }`
  override of `w-condition-invisible`, gradient `pointer-events:none` when active.
- Footer appended block (`<!-- podcast-episode-hero-spotify -->`): IIFE reads
  Youtube ID + Spotify Link via `{{wf}}` tokens; if YouTube empty and a
  22-char episode id parses, injects
  `https://open.spotify.com/embed/episode/{id}/video?utm_source=generator&theme=0`
  iframe into the target and adds the activation classes. **No Spotify iFrame
  API** — during the build the API rendered the audio card for video episodes,
  so the spec's predefined fallback (plain `/video` iframe, tap-to-play) shipped.

## Rollback steps
1. Delete the new Spotify embed wrapper element inside `.podcast-hero_background-wrapper` (class `podcast-spotify-embed is-hero`).
2. Restore page head code to the block above (removes appended `<!-- podcast-episode-hero-spotify -->` section).
3. Remove the appended footer block marked `<!-- podcast-episode-hero-spotify -->`.
4. Republish to jayshetty.webflow.io only.
