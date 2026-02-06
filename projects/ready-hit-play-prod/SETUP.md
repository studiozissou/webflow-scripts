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

## 🔄 Making Updates

1. Edit files in `ready-hit-play-prod/`
2. **Bump `CONFIG.version` in init.js** when you want module cache to refresh.
3. Commit & push to GitHub.
4. **Update the commit in Webflow** – replace `COMMIT` in both the script and CSS URLs with the new commit hash (e.g. from `git log -1 --oneline`). That way you always load the exact deploy you want.

## ✅ Done

Use a pinned commit (`@cbbef90` or whatever the latest is) in your Webflow URLs so the CDN serves that exact version. When you deploy again, update the commit hash in Webflow to the new one.
