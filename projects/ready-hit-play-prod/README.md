# Ready Hit Play — Production Setup

This folder contains the production-ready, modular version of the Ready Hit Play scripts, designed to be loaded via JS Deliver and GitHub for easy maintenance.

## 📁 File Structure

```
ready-hit-play-prod/
├── init.js              # Main loader (loads all modules in order)
├── lenis-manager.js     # Lenis smooth scroll manager
├── work-dial.js         # Interactive dial component
├── orchestrator.js      # Barba transitions & view management
├── utils.js             # Utility scripts (forms, links, year)
└── README.md            # This file
```

## 🚀 Setup Instructions

### Step 1: Push to GitHub

1. **Create a GitHub repository** (or use existing)
2. **Push this folder** to your repo:
   ```bash
   git add projects/ready-hit-play-prod/
   git commit -m "Add RHP production scripts"
   git push origin main
   ```

3. **Note your repository details:**
   - GitHub username: `YOUR_USERNAME`
   - Repository name: `YOUR_REPO`
   - Branch: `main` (or `master`)

### Step 2: Update init.js

Edit `init.js` and update the `CONFIG.baseUrl` with your GitHub details:

```javascript
const CONFIG = {
  baseUrl: 'https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/projects/ready-hit-play-prod',
  // ...
};
```

**Or use raw GitHub URLs:**
```javascript
baseUrl: 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/projects/ready-hit-play-prod',
```

### Step 3: Set Up JS Deliver (Recommended)

1. **Go to [jsDelivr.com](https://www.jsdelivr.com/)**
2. **Search for your GitHub repo** or use the format:
   ```
   https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/projects/ready-hit-play-prod/init.js
   ```
3. **Copy the CDN URL** for `init.js`

### Step 4: Add to Webflow

#### Option A: Site Settings (Recommended)

1. **Webflow Dashboard** → Your Project → **Settings** → **Custom Code**
2. **Inside `<head>` tag**, add:
   ```html
   <script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/projects/ready-hit-play-prod/init.js"></script>
   ```
3. **Save & Publish**

#### Option B: Page Settings (If you need page-specific control)

1. **Page Settings** → **Custom Code** → **Inside `<head>` tag**
2. Add the same script tag as above

### Step 5: Add CSS

1. **Copy `ready-hit-play.css`** to your repo (same location or separate folder)
2. **In Webflow**, add the CSS link in **Site Settings** → **Custom Code** → **Inside `<head>` tag**:
   ```html
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/projects/ready-hit-play-prod/ready-hit-play.css">
   ```

## 🔄 Workflow

### Making Updates

1. **Edit files locally** in `ready-hit-play-prod/`
2. **Commit & push** to GitHub:
   ```bash
   git add projects/ready-hit-play-prod/
   git commit -m "Update dial animation"
   git push origin main
   ```
3. **Changes are live immediately** (JS Deliver caches for ~7 days, but you can force refresh with `?v=timestamp`)

### Force Cache Refresh

If you need immediate updates, append a version query:
```html
<script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/projects/ready-hit-play-prod/init.js?v=1.0.1"></script>
```

## ⚠️ Important Notes

### Initialization Order

The `init.js` loader ensures proper order:
1. Dependencies (GSAP, ScrollTrigger, Barba, Lenis) load first
2. Modules load in sequence: `lenis-manager` → `work-dial` → `orchestrator` → `utils`
3. Each module waits for the previous to finish

### Webflow Requirements

- **Barba.js** and **Lenis** are loaded via CDN (included in `init.js`)
- **GSAP** and **ScrollTrigger** are loaded by `init.js` (no need to enable in Webflow). **SplitText** (Club plugin) is optional: set `splitTextUrl` in `init.js` to your member CDN or self-hosted URL, or leave `null` to skip.
- Ensure your pages have `data-barba="container"` and `data-barba-namespace` attributes

### Namespace Setup

Each page template needs:
```html
<div data-barba="container" data-barba-namespace="home">
  <!-- page content -->
</div>
```

Namespaces:
- `home` - Homepage with dial
- `case` - Case study pages
- `about` - About page
- `contact` - Contact page

## 🐛 Troubleshooting

### Scripts not loading
- Check browser console for errors
- Verify GitHub repo is public (or use GitHub token for private repos)
- Ensure file paths in `init.js` match your repo structure

### Initialization issues
- GSAP is loaded automatically by the init script
- Check that Barba and Lenis CDN links are accessible
- Verify `window.RHP` exists in console after page load

### Barba transitions not working
- Verify `data-barba="container"` exists on all pages
- Check that `data-barba-namespace` is set correctly
- Ensure Webflow Interactions are re-initialized (handled in `orchestrator.js`)

## 📝 File Descriptions

- **init.js**: Main entry point, loads all modules in correct order
- **lenis-manager.js**: Manages Lenis smooth scroll instances
- **work-dial.js**: Interactive dial component with case study navigation
- **orchestrator.js**: Barba page transitions, view management, GSAP animations
- **utils.js**: Helper scripts (form tracking, link security, year update)

## 🔗 Useful Links

- [JS Deliver Documentation](https://www.jsdelivr.com/documentation)
- [Barba.js Documentation](https://barba.js.org/)
- [Lenis Documentation](https://github.com/studio-freight/lenis)
- [GSAP Documentation](https://greensock.com/docs/)
