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
Edit `init.js` line 8-9, replace:
- `YOUR_USERNAME` with your GitHub username
- `YOUR_REPO` with your repository name

### 3. Get JS Deliver URL
Your `init.js` URL will be:
```
https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/projects/ready-hit-play-prod/init.js
```

### 4. Add to Webflow

**Site Settings → Custom Code → Inside `<head>` tag:**

```html
<!-- RHP Production Scripts -->
<script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/projects/ready-hit-play-prod/init.js"></script>

<!-- RHP Styles -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/projects/ready-hit-play-prod/ready-hit-play.css">
```

### 5. Verify
- Open your site
- Check browser console for: `✅ RHP scripts loaded successfully` and `RHP: all 5 scripts present`
- Test dial interaction and Barba transitions

**Not seeing the latest init/checks?** The browser or CDN may be caching `init.js`. In Webflow, add the same version to the script URL, e.g. `init.js?v=2026.2.6.3` (use the `version` from `init.js` CONFIG). After each deploy, bump the `?v=` value to match.

## ✅ Done!

Now you can edit files locally and push to GitHub - changes will be live automatically (with ~7 day CDN cache).

## 🔄 Making Updates

1. Edit files in `ready-hit-play-prod/`
2. **Bump `CONFIG.version` in init.js** (e.g. `'2026.2.6.3'`) so module URLs change and the CDN serves fresh files.
3. Commit & push:
   ```bash
   git add projects/ready-hit-play-prod/
   git commit -m "Your update message"
   git push origin main
   ```
4. Optionally add the same version to the CSS link in Webflow: `ready-hit-play.css?v=2026.2.6.3`

## 🛠 Cache busting & dev mode

- **Production:** init.js loads modules with `?v=<CONFIG.version>`. Bump `version` in init.js on each deploy so the CDN fetches new module files.
- **Development:** Dev mode (nocache) runs automatically when the page URL contains `webflow.io`, or when init is loaded with `?dev=1` / `?nocache=1`. Init then loads both RHP CSS and all modules with a timestamp (`?t=...`), so you get the latest from the CDN without bumping version or hard-refreshing. Keep your normal CSS `<link>` in Webflow; in dev mode init injects a second load that overrides with the fresh file.
