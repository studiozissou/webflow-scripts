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
- Check browser console for: `✅ RHP scripts loaded successfully`
- Test dial interaction and Barba transitions

## ✅ Done!

Now you can edit files locally and push to GitHub - changes will be live automatically (with ~7 day CDN cache).

## 🔄 Making Updates

1. Edit files in `ready-hit-play-prod/`
2. Commit & push:
   ```bash
   git add projects/ready-hit-play-prod/
   git commit -m "Your update message"
   git push origin main
   ```
3. Changes are live! (Force refresh with `?v=timestamp` if needed)
