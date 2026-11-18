# ADR-003: One private repo, hosted files served from Cloudflare Pages
**Date:** 2026-11-18
**Status:** Proposed

## Context
Two repos hold the work today:
- `studiozissou/webflow-scripts` is **public**. It has about 1,100 tracked files (672 MB, mostly PNGs) and 37 tags such as `oost-v0.4.2`, `rhp-live-v2` and `tsc-live-v2`. It holds the hosted Webflow scripts (`projects/*/init.js` loaders and their modules, `shared/`, `styles/`). It also holds much private tooling: `tools/triage`, `tools/outreach`, `tools/gbp`, `tools/site-review`, the tests and `.claude/skills|commands|agents`.
- `studiozissou/webflow-internal` is **private** (347 commits, about 3,150 files). It holds client docs and personal skills. `scripts/link-internal.sh` symlinks it into the public checkout. A `post-checkout` hook runs the script, and CI checks the repo out with the deploy key `WEBFLOW_INTERNAL_DEPLOY_KEY`.

The split has a cost. Every private file needs a `.gitignore` or `TOP_PATHS` entry, the hook, and a CI checkout. ADR-002 needs a `needsInternal` flag for this reason. One missed entry can publish client data. The user chose one private repo for everything.

What shapes the answer:
- **Hosting.** Live Webflow sites load `https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@<tag>/projects/<client>/init.js`. jsDelivr cannot serve a private repo. When the repo goes private, every live site loses its scripts, so a new host must be live first. The user chose Cloudflare Pages (free plan: unlimited static requests and bandwidth, 500 builds a month, 20,000 files a deploy, 25 MiB a file).
- **Loaders.** Most loaders get their base from their own `src` (`src.slice(0, src.lastIndexOf('/') + 1)`), so their modules follow any host and path. `projects/ready-hit-play-prod/init.js` is different. `getBaseUrl()` reads the tag with `/@([^/?#@]+)\//` and puts it into `baseUrlTemplate`, which is hard-coded to jsDelivr. On a Pages URL there is no `@`, so it falls back to `@main` on jsDelivr. That URL breaks when the repo goes private. Old RHP tags cannot change, so RHP needs a new tag before cutover.
- **CORS.** No loader uses `fetch()` on its own hosted files, except RHP's ngrok dev path. RHP sets `crossOrigin = 'anonymous'` on scripts and `crossOrigin = ''` on its stylesheet. A cross-origin request in CORS mode fails if the response has no `Access-Control-Allow-Origin`. jsDelivr sends `*` today, so the new host must also send it.
- **Out of scope.** Carsa is hosted from Carsa's own repo. Third-party CDN dependencies (npm on jsDelivr, unpkg, Webflow's GSAP) do not change.

## Options considered

### Option A: Make `webflow-scripts` private and merge `webflow-internal` into it
Merge in a fresh clone with `git merge --allow-unrelated-histories`. The internal repo already mirrors the public paths (link-internal.sh links `$INTERNAL/<p>` to `<root>/<p>`), so its files land where the symlinks point now. A subtree does not fit, because the internal files sit under many paths, not one prefix. After the merge, delete `link-internal.sh`, the hook, the CI checkout and the `TOP_PATHS` ignore entries.
- Pros: tags, repo name, CI, worktree tooling, launchd `tidy`, and the memory folder path (`-Users-willmorley-webflow-scripts`) do not change.
- Pros: both histories stay, and `git log` works across them.
- Cons: top-level files that exist in both repos (`.gitignore`, READMEs, maybe `package.json`) conflict and need a merge by hand.
- Cons: the merge must run in a clean clone. A checkout with symlinks would let git write through the links into `~/webflow-internal`.

### Option B: Move the public content into `webflow-internal` and retire `webflow-scripts`
- Pros: the repo that was never public becomes the home.
- Cons: every path that names `webflow-scripts` changes: clone folder, worktrees, launchd plist, memory folder, triage `repo` fields, CI secrets and branch protection.
- Cons: you must push the 37 tags across by hand. The hosting work is the same as in Option A, so B adds churn and gives nothing in exchange.

### Option C (hosting): Cloudflare Pages, built from every tag on each tag push
A GitHub Action runs on each tag push and on `workflow_dispatch`. It checks out with `fetch-depth: 0`. For every tag, it extracts an allowlist of hosted files (`projects/**`, `shared/**` and `styles/**` with `.js`, `.css` and `.json` only; no tests, `reference/` or images) into `dist/<tag>/...`. Then it deploys with `wrangler pages deploy` (Direct Upload). The URL is `https://<host>/<tag>/projects/<client>/init.js`.
- Pros: stateless. Git rebuilds the whole site, so the host holds no state that git does not have.
- Pros: Pages deploys are atomic, and the dashboard rolls back to any earlier deploy in one click.
- Pros: free plan limits on requests and bandwidth do not apply to static files.
- Cons: the file count grows with tags × hosted files, and the cap is 20,000. The allowlist must stay tight.
- Cons: if you delete a tag, the next deploy drops it. That breaks any site that pins the tag.

### Option D (hosting): Cloudflare R2, one immutable upload for each tag
- Pros: additive. A new tag uploads its files once, and old tags are never touched.
- Cons: the bucket holds state that git does not have, so you need a backfill script for the 37 tags and a drift check.
- Cons: production needs a custom domain on a Cloudflare zone, because `r2.dev` has a rate limit. The free tier meters reads, and Pages does not.

### Comparison
Confidence is how sure I am the option is the right call today.

| Approach | Confidence | Complexity | Key risk | Reuse |
|----------|-----------|------------|----------|-------|
| A. Private `webflow-scripts` + merge internal | 85 | Medium | Merge conflicts on shared top-level files | All tags, paths, CI and tooling |
| B. Move into `webflow-internal` | 15 | High | Every repo-name reference changes | Internal repo history only |
| C. Pages, rebuilt from tags | 80 | Low | 20,000-file cap; deleted tag drops a live site | Git tags stay the release unit |
| D. R2, per-tag upload | 35 | Medium | Bucket drifts from git; zone and metering | None |

## Decision
We will use Option A for the repo and Option C for hosting.

Option A keeps every name, tag and tool that the workflow uses. Option C keeps git as the single source of truth for what is live, and a rollback is one click. The order is important. Hosting must be live and verified on every site before the flip, and the merge happens only after the flip.

**Host.** Put a custom subdomain (CNAME) on the Pages project, for example `cdn.<studio domain>`, so that a future host change does not need a new footer swap. `<project>.pages.dev` also works, but the next move would need every footer changed again.

**`_headers`** (written into `dist/` by the Action):
```
/*
  Access-Control-Allow-Origin: *
  X-Content-Type-Options: nosniff
/:tag/projects/*
  Cache-Control: public, max-age=31536000, immutable
/:tag/shared/*
  Cache-Control: public, max-age=31536000, immutable
/:tag/styles/*
  Cache-Control: public, max-age=31536000, immutable
```
Tagged paths are immutable, so a tag must never move. The repo already pins to tags, and the `?v=` busting continues to work. There is no `main` path to cache.

**Cutover order.** Do not continue to a step until the step before it passes its check.
1. **Inventory.** List every URL that loads from `cdn.jsdelivr.net/gh/studiozissou/webflow-scripts`. Look at site-wide head and footer code, page-level custom code and CMS embeds on every Webflow site. Also look at non-Webflow pastes such as `projects/jayshetty/*/PASTE-INTO-FOOTER.html`. Cross-check the list against jsDelivr's hit stats for the repo.
2. **Preflight.** Count the allowlist files across all tags (it must stay under 20,000). Run a secret scan (for example `gitleaks`) over the full history.
3. **Host.** Ship the Action, the Pages project, the domain and `_headers`. For every URL in the inventory, the Pages copy must return 200 and be byte-identical to the jsDelivr copy. It must also send `Access-Control-Allow-Origin: *`, the immutable `Cache-Control` and the right `Content-Type` (check with `curl -I`).
4. **RHP.** Change `getBaseUrl()` to get the base from its own `src`, like the other loaders. Tag `rhp-live-v3` and verify on staging (`window.RHP.scriptsOk === true`).
5. **Swap.** Change one site at a time, staging first, then publish. After each publish, fetch every sitemap URL and confirm that no page references `jsdelivr.net/gh/studiozissou`. Then run that site's health probe.
6. **Soak.** Wait at least 7 days. jsDelivr stats for the repo must fall to about zero.
7. **Flip.** Make `webflow-scripts` private and run the step 5 checks again.
8. **Merge.** Merge `webflow-internal` (Option A), then remove link-internal, the hook, the CI deploy-key step, `needsInternal` and the "THIS REPO IS PUBLIC" rules. Archive `webflow-internal` as read-only. Do not delete it.

**Public history.** A flip to private does not erase anything. Clones, the public forks (GitHub splits them into their own network) and jsDelivr's cache keep everything that was already pushed. Treat all of it as permanently public. Secrets never belonged in the repo. If the step 2 scan finds a secret, rotate it. A history rewrite does not help.

**Rollback.**
- Before step 7: change the footer back to the jsDelivr URL, which still works.
- A bad Pages deploy: roll back to the earlier deploy in the Pages dashboard.
- Between steps 7 and 8: make the repo public again, and jsDelivr resumes. This is safe only because no private files are in the repo yet. This is why the merge comes last.
- After step 8: the repo must never go public again. Pages rollback is the remedy. If Pages itself fails, upload the same `dist/` to R2 (Option D) as a cold standby.

## Consequences
- Positive: one repo, one commit per change. No symlinks, hook, deploy key or ignore list can leak client data.
- Positive: live hosting comes from tags only, is rebuilt from git, and rolls back in one click.
- Positive: a CNAME host makes the next host change a DNS edit, not a footer swap.
- Negative / trade-offs: GitHub Actions minutes become metered (2,000 a month on Free). The 10-minute test job and the weekly `zissou-drop-prices` job fit, but watch usage.
- Negative / trade-offs: the repo grows to about 4,250 files. Combined history makes `git log` noisier.
- Negative / trade-offs: deleting a tag now takes down any site that pins it. Old RHP tags on Pages still point modules at jsDelivr, so RHP footers must use `rhp-live-v3` or later.
- Next steps: run cutover steps 1 and 2 first. Then update the `_template` loader README, the client READMEs and `SETUP.md`, which document jsDelivr URLs. Then update ADR-002 when `needsInternal` goes.

Riskiest assumption: the inventory finds every live page that loads from jsDelivr, so the flip breaks no forgotten site — test first: pull last month's per-version hit stats for gh/studiozissou/webflow-scripts from data.jsdelivr.com and match every tag that has traffic to a footer on the swap list
Goal fit: Recurring client and admin work runs itself
