# Spec: DevLink Car Card — Webflow as Source of Truth

**Date:** 13 April 2026
**Client:** Carsa
**Status:** Ready to Build
**Slug:** `carsa-devlink-car-card`

---

## Problem

Carsa maintains two implementations of the Car Card:
1. **Webflow** — the native Car Card component on carsa.co.uk (class: `car-card.is-hover-animation`)
2. **React** — Shane's standalone React widget (separate codebase, deployed independently)

These drift visually over time. When the Webflow design updates, Shane's React version doesn't follow — and vice versa. The goal is to make the **Webflow Car Card the single source of truth** and have the React widget consume it automatically.

---

## Solution: Webflow DevLink Component Export

Use DevLink to export the Car Card component from Webflow into Shane's React codebase. The exported component is the **visual shell** (HTML structure + CSS). Shane passes car data (make, model, price, image, etc.) via React props. CMS bindings don't export — that's fine, the React app has its own data source.

---

## Setup Guide (Step-by-Step)

### Prerequisites

- Node.js v20.0.0+
- Shane's React app (standalone, any React framework — Next.js, Vite, CRA, etc.)
- Webflow site: Carsa (`68348ea61096b37caacd2f95`)
- The Car Card must be a **proper Webflow Component** (not just grouped elements)

### Step 1: Prepare the Car Card in Webflow

The Car Card (`div.car-card.is-hover-animation`) must be converted to a Webflow Component if it isn't one already.

1. Open the Carsa site in Webflow Designer
2. Select the Car Card element on any page (e.g., `/used-cars`)
3. Right-click → **Create Component** (or use the Components panel)
4. Name it `Car Card` (DevLink will convert to PascalCase → `CarCard`)
5. **Set up Component Properties** for every dynamic field:
   - `heading` (text) → car title / make + model
   - `price` (text) → price display
   - `mileage` (text) → mileage display
   - `image` (image) → car image URL + alt text
   - `href` (link) → link to VDP (Vehicle Detail Page)
   - `badge` (text, optional) → e.g., "Reduced", "New In"
   - `badgeVisible` (visibility toggle) → show/hide badge
   - Add any other fields the card displays
6. **Add a DevLink Slot** if any child area needs to accept arbitrary React children (e.g., a custom CTA area)
7. **Add Runtime Props** to any element that needs event handlers:
   - The card link element → `linkProps` (for `onClick`, `onMouseEnter`, etc.)
   - The finance link element → `financeProps` (for `onClick`)
8. **Publish** the site so the API can read the component

> **Important:** Only elements converted to Components export via DevLink. Nested child elements export automatically as part of the component — you don't need to componentise every child.

### Step 2: Install DevLink CLI in Shane's React Project

```bash
cd shanes-react-app
npm install -D @webflow/webflow-cli
```

### Step 3: Authenticate

```bash
npx webflow auth login
```

This opens a browser OAuth flow and writes a `.env` file with:
```
WEBFLOW_SITE_ID=68348ea61096b37caacd2f95
WEBFLOW_API_TOKEN=<generated>
```

If a `.env` already exists, use `--force` to append.

### Step 4: Configure `webflow.json`

Create `webflow.json` in the project root:

```json
{
  "devlink": {
    "host": "https://api.webflow.com",
    "rootDir": "./devlink",
    "cssModules": true,
    "relativeHrefRoot": "/"
  }
}
```

### Step 5: Sync Components

```bash
npx webflow devlink sync
```

This creates:
```
devlink/
  CarCard.tsx            # React component with typed props
  CarCard.module.css     # Scoped styles
  global.css             # Webflow normalize + utilities + breakpoints
  DevLinkProvider.tsx     # React context for interactions
  _Builtin/              # Primitive helpers (Block, Link, Image)
  _utils/                # Class management (cx())
  index.ts               # Barrel exports
```

### Step 6: Integrate into the React App

#### 6a. Import global styles (once, at app root)

```tsx
// app/layout.tsx (Next.js) or src/main.tsx (Vite)
import "../devlink/global.css";
import { DevLinkProvider } from "../devlink/DevLinkProvider";

export default function RootLayout({ children }) {
  return (
    <DevLinkProvider>{children}</DevLinkProvider>
  );
}
```

#### 6b. Create a wrapper component (mandatory pattern)

Never import from `devlink/` directly in page components. Create a wrapper:

```tsx
// src/components/CarCard.tsx
import { CarCard as DevLinkCarCard } from "../../devlink/CarCard";

interface CarCardProps {
  title: string;
  price: string;
  mileage: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
  badge?: string;
  onClick?: () => void;
}

export function CarCard({
  title, price, mileage, imageUrl, imageAlt,
  href, badge, onClick
}: CarCardProps) {
  return (
    <DevLinkCarCard
      heading={title}
      price={price}
      mileage={mileage}
      image={{ src: imageUrl, alt: imageAlt }}
      href={href}
      badge={badge}
      badgeVisible={!!badge}
      linkProps={{ onClick }}
    />
  );
}
```

This wrapper:
- Isolates the app from DevLink's generated API (prop names may change on re-sync)
- Provides a stable interface for the rest of the app
- Is the **only file you edit** — never touch anything in `devlink/`

#### 6c. Use in pages

```tsx
import { CarCard } from "../components/CarCard";

export function SearchResults({ cars }) {
  return (
    <div className="car-grid">
      {cars.map(car => (
        <CarCard
          key={car.id}
          title={`${car.make} ${car.model}`}
          price={car.price}
          mileage={car.mileage}
          imageUrl={car.imageUrl}
          imageAlt={`${car.make} ${car.model}`}
          href={`/used-cars/${car.slug}`}
          badge={car.badge}
        />
      ))}
    </div>
  );
}
```

### Step 7: Add a sync npm script

```json
{
  "scripts": {
    "devlink:sync": "webflow devlink sync"
  }
}
```

---

## Maintenance Workflow

When the Car Card design changes in Webflow:

1. **Designer** updates the Car Card component in Webflow Designer
2. **Designer** publishes the site
3. **Developer** runs `npm run devlink:sync`
4. **Developer** checks the git diff on `devlink/CarCard.tsx`:
   - If props were renamed → update the wrapper component (`src/components/CarCard.tsx`)
   - If props were added → add them to the wrapper interface
   - If props were removed → remove from wrapper, update callsites
   - If only CSS changed → no code changes needed, just commit
5. **Developer** commits and deploys

### Sync checklist (per sync)

- [ ] Run `npm run devlink:sync`
- [ ] Review `git diff devlink/` for breaking changes
- [ ] Check for `@warning` tags in generated files (indicate export failures)
- [ ] Update wrapper component if props changed
- [ ] Run the app locally and visually verify the Car Card
- [ ] Commit `devlink/` + wrapper changes together

---

## What Exports vs. What Doesn't

### Exports
- HTML structure (divs, links, images, text, buttons)
- All CSS (colours, spacing, typography, shadows, border-radius, hover states)
- Component properties → React props (typed)
- DevLink Slots → React children
- Runtime props → spread props for event handlers
- Code Embed elements inside the component
- Images, dimensions, alt text, link attributes
- Responsive breakpoints (991px, 767px, 479px)

### Does NOT export
- CMS Collection data / bindings (by design — React app has its own data)
- Webflow Interactions / animations (re-implement in React or use runtime props)
- Page-level or site-level custom code
- Lottie animations
- Lightbox elements
- E-commerce elements
- Webflow Component Slots (use DevLink Slots instead)

---

## Gotchas

1. **CSS conflicts with existing styles.** DevLink's `global.css` includes opinionated resets. If Shane's app uses Tailwind or another reset, check for conflicts. Set `skipTagSelectors` in `webflow.json` if needed.

2. **TypeScript + CSS Modules required.** Shane's React app must support `.tsx` and `.module.css` imports. Most modern React setups (Next.js, Vite) handle this out of the box. CRA may need `react-app-rewired` or ejection.

3. **Hover animation won't export.** The `is-hover-animation` class on the Car Card likely uses Webflow Interactions. This needs to be re-implemented in the wrapper component (CSS `:hover` or React state).

4. **Equal-height card logic is JS, not CSS.** The `setEqualHeight()` function in `homepage.js` won't export. Use CSS Grid's implicit equal-height behaviour or re-implement in React.

5. **Component naming.** DevLink converts component names to PascalCase and sanitises them. `Car Card` → `CarCard`. If Webflow renames the component, the import path changes.

6. **`.env` security.** The `.env` file contains an API token. Add it to `.gitignore`. For CI/CD sync, use environment variables.

---

## Fallback: If DevLink Proves Unworkable

If DevLink doesn't fit (CSS conflicts too severe, prop mapping too fragile, etc.):

**Option A — Webflow CSS Variable Consumption:**
Promote the Car Card's key design tokens (colours, spacing, border-radius, shadows, typography) into Webflow's native variable system. Shane's React app loads the published Webflow stylesheet from CDN and reads the CSS custom properties. Structure stays separate; visual tokens stay synced.

**Option B — Standard embed + Webflow Symbol:**
Mount Shane's React widget in Webflow via a script tag embed inside a Webflow Symbol. The React app renders its own Car Card. Design sync is manual but deployment is simpler.

---

## Tasks

| # | Task | Owner | Est. |
|---|------|-------|------|
| 1 | Convert Car Card to Webflow Component with properties + slots | Will (Webflow) | 1h |
| 2 | Install DevLink CLI + authenticate in Shane's React project | Shane | 30m |
| 3 | Run first sync + verify generated output | Shane | 30m |
| 4 | Create wrapper component + integrate into search results | Shane | 2h |
| 5 | Handle hover animation re-implementation | Shane | 1h |
| 6 | Visual QA — compare Webflow card vs React card side-by-side | Will + Shane | 30m |
| 7 | Document sync workflow in Shane's repo README | Shane | 30m |

**Total estimate:** ~6h across Will + Shane

---

## Verify Loop

### Pass/fail criteria
- Webflow Car Card and React Car Card are visually identical at desktop (1440px), tablet (768px), and mobile (375px)
- Car data (title, price, mileage, image, badge) renders correctly via props
- Hover state works on the React version
- No console errors in the React app
- `devlink:sync` runs without `@warning` tags

### Reproduction steps
1. Open Webflow staging (`carsa-v2.webflow.io`) → navigate to `/used-cars`
2. Screenshot a Car Card at desktop, tablet, mobile
3. Open Shane's React app locally → navigate to the equivalent search results page
4. Screenshot the same car at the same breakpoints
5. Compare side-by-side

### Tier mapping
- **Tier 1 (auto):** Not applicable — DevLink setup is in Shane's separate repo
- **Tier 2 (auto):** Not applicable
- **Tier 3 (manual):** Visual comparison at 3 breakpoints, hover state verification, badge visibility toggle

### Regression scope
- Webflow site must not be affected (we're only adding Component properties, not changing the rendered output)
- Shane's existing Car Card should be replaced by the DevLink version, not run alongside it
