# Quick Setup Guide

## 🚀 5-Minute Setup

### 1. Push to GitHub
```bash
cd /path/to/your/repo
git add projects/ready-hit-play-prod/
git commit -m "Add RHP production scripts"
git push origin main
```

### 2. Update init.js
Edit `init.js` and set `baseUrl` to your repo (and optionally pin a commit, e.g. `@main` or `@cbbef90`).

### 3. Add to Webflow (use pinned commit)

**Site Settings → Custom Code → Inside `<head>` tag:**

Use the **same commit** in both URLs (e.g. replace `COMMIT` with the latest commit hash like `cbbef90`):

```html
<!-- RHP Styles -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@COMMIT/projects/ready-hit-play-prod/ready-hit-play.css">

<!-- RHP Production Scripts -->
<script src="https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@COMMIT/projects/ready-hit-play-prod/init.js"></script>
```

### 4. Verify
- Open your site
- Check browser console for: `✅ RHP scripts loaded successfully` and `RHP: all 5 scripts present`
- Test dial interaction and Barba transitions

## 🖥️ Local development

Serve the project from a local server so scripts load from disk (no deploy or cache).

1. **Start a static server** from the repo root (not inside `ready-hit-play-prod`):
   ```bash
   cd /path/to/webflow-scripts
   npx serve .
   ```
   Or with Python: `python3 -m http.server 8080`

2. **Open the dev page** in your browser:
   - **http://localhost:3000/projects/ready-hit-play-prod/dev.html** (if using `npx serve`, port may be 3000)
   - Or **http://localhost:8080/projects/ready-hit-play-prod/dev.html** (if using Python on 8080)

3. **Init detects localhost** and loads all modules (cursor, work-dial, orchestrator, etc.) from the same folder. Edit any `.js` or `.css` file, refresh the page, and you get your changes without deploying.

4. **Full page testing**: To test with the real layout (dial, nav, etc.), serve the same way and open a reference page instead:
   - **http://localhost:3000/projects/ready-hit-play-prod/reference/homepage.html**
   - In that file, temporarily change the script and link tags to use relative paths: `ready-hit-play.css` and `init.js` (same directory as the reference file is `reference/`, so use `../ready-hit-play.css` and `../init.js`), then init will still load from the parent folder (same origin = local dev).

**Note:** Use a server (localhost). Opening `dev.html` via `file://` may block script loading due to CORS.

## 🔄 Making Updates

1. Edit files in `ready-hit-play-prod/`
2. **Bump `CONFIG.version` in init.js** when you want module cache to refresh.
3. Commit & push to GitHub.
4. **Update the commit in Webflow** – replace `COMMIT` in both the script and CSS URLs with the new commit hash (e.g. from `git log -1 --oneline`). That way you always load the exact deploy you want.

## ✅ Done

Use a pinned commit (`@cbbef90` or whatever the latest is) in your Webflow URLs so the CDN serves that exact version. When you deploy again, update the commit hash in Webflow to the new one.
