# Podcast dual-platform inline player (YouTube + Spotify)

Source of truth for the custom code deployed to **jayshetty.webflow.io/podcast-v2**
(page `6a85a907e42332f1eded63d7`, site `64c10a2010e1a379d08bf030`). Spec:
`projects/jayshetty/.claude/specs/podcast-dual-platform-inline-player.md`.

The code ships as Webflow page custom code, not via the CDN pipeline. These files
mirror what is in Webflow so changes are reviewable in git; deploys happen through
the Webflow MCP (or by pasting in Designer page settings).

| File | Deploys to |
| --- | --- |
| `head-code.html` | Page settings → Inside `<head>` tag (full block) |
| `footer-code.html` | Page settings → Before `</body>` tag (full block) |
| `spotify-embed.html` | HtmlEmbed `2356c0b9-cde5-734f-2373-b89173011785` (`.podcast-list-spotify-embed.is-cover`) |

How the player JS finds the episode URL (no extra Designer state):

- It first looks for a `[data-spotify-url]` attribute inside the item (none is
  bound today — the MCP Data API rejected attribute CMS bindings), and falls
  back to the item's `a[href*="open.spotify.com/episode"]` — the mobile watch
  button link, which Will already CMS-bound to the "Spotify Link" field
  (`8fb2404da401ac6e187e39e6e0d4a67c`). If that mobile button is ever removed
  or unbound, bind `data-spotify-url` on any element inside the item instead.
- The embed wrapper keeps its Webflow conditional visibility (shown only on
  Spotify-era items); the YouTube embed keeps the inverse condition.

## Changes vs the previous footer code (Aug 2026)

- The jQuery "Video Player JS" block is replaced by one vanilla-JS IIFE:
  document-level delegated clicks (survive Finsweet v1 re-renders with zero
  re-init), per-platform targeting via `data-watch` / `data-pause`, lazy
  Spotify `createController` on first click with a pruned controller registry.
- The stray video-player handlers that lived at the tail of the Omny script
  (`.image-cover` double bindings, `.videoplay` add) moved into the same IIFE;
  cover clicks now route to the item's *visible* watch button only.
- The Omny blocks (re-ID, `initPlayer`, `setTimeout` pagination re-init) are
  otherwise untouched — refactor is a spec follow-up.

## Publishing rule

Publish to the **webflow.io subdomain only** until sign-off. Copying the code
to the live `/podcast` page and publishing custom domains is a manual step.
