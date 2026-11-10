# Section mapping: Relume (Tailwind) to Client First V3

Read this in step 2 (Map) of `/cf-page`, once per page. It turns a Relume layout into Client First V3 HTML that `data_whtml_builder` accepts and `validate-section.js --structure v3 --no-scheme` passes.

Sources: Finsweet Client First docs (core-structure-strategy, utility-class-systems, spacing-strategy, sizes-and-rem, whats-new), the official Client First skill file, and the V3 starter cloneable CSS, all read on 2026-11-04. Use only the class names below. If a name is not here, check the client's published CSS before using it.

## Ground rules

- Structure is `page-wrapper > main-wrapper > section_<name> > container-<size> > content`. The section is a real `<section>`. Its first child is a container.
- Section padding lives on `section_<name>` through variables: left and right on `--_layout---spacing--global-padding`, top and bottom on a `--_layout---section-padding--small|medium|large` variable. Never `padding-global` or `padding-section-*` in a rebuilt section; they belong to the V3 alternative structure, which this skill does not use.
- Sizes are rem on a 16 px base. Approved steps are 0.5, 1, 1.5, 2, 2.5, 3 rem and so on, with 0.875rem (14 px) and 0.125rem (2 px) as allowed exceptions. Borders stay 1px. No px anywhere else in a class the skill creates.
- One custom class per element, then utilities on top as combos (custom class + utility is the recommended V3 pattern). Two classes is ideal, four is the maximum.
- No `spacer-*` classes. V3 no longer documents them. Vertical space between text elements is an empty spacing block (`<div class="padding-bottom-medium"></div>`) or a flex/grid gap on the parent. Never put spacing classes on text elements.
- No `style=` attributes and no margin on custom classes. `validate-section.js` rejects both (rules 4 and 7).
- Every `<h1>` to `<h6>` carries a `heading-style-*` class (validator rule 9) and keeps its legacy heading level.

## Tailwind to Client First V3

Relume MCP returns React/TSX with Tailwind. Translate each pattern as follows.

| Relume / Tailwind | Client First V3 | Notes |
|---|---|---|
| `<section className="px-[5%] py-16 md:py-24 lg:py-28">` | `<section class="section_<name>">` | Padding goes on the section class through variables. Pick the section-padding size from the legacy section's current desktop padding (visual parity), not Relume's: about 3rem is `small`, 5rem `medium`, 8rem `large`. |
| `<div className="container">` | `container-large` (80rem) | `container-medium` (64rem) or `container-small` (48rem) when the legacy content is that narrow. |
| `container max-w-lg` on the outer wrapper | `container-small` | Outer width is always a `container-*`. |
| `max-w-xs` `max-w-sm` | `max-width-small` (20rem) | Nested widths use `max-width-*`, nearest by rem. |
| `max-w-md` `max-w-lg` `max-w-xl` | `max-width-medium` (32rem) | |
| `max-w-2xl` `max-w-3xl` `max-w-4xl` | `max-width-large` (48rem) | |
| `max-w-5xl` `max-w-6xl` | `max-width-xlarge` (64rem) | |
| `max-w-7xl` | `max-width-xxlarge` (80rem) | |
| `grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12` | `<section>_grid` + `gap-*` | The custom class holds `display: grid`, the columns and the tablet/mobile collapse. Add one `gap-*` utility when row and column gap match; when they differ, set both on the custom class from `--_layout---spacing--*` variables. |
| `grid-cols-3` card lists that wrap | `<section>_list` + `grid-autofit-small\|medium\|large` | Grid utilities sit on top of a custom class and default to a medium gap. |
| `flex flex-col`, `flex items-center` | custom class with flex | Client First has no flex or column utilities. |
| `gap-2` `gap-4` `gap-6` `gap-8` `gap-12` `gap-16` `gap-20` | `gap-xtiny` `gap-xxsmall` `gap-small` `gap-medium` `gap-large` `gap-xlarge` `gap-xxlarge` | Tailwind step n is n × 0.25rem. V3 sizes: xxtiny .25, xtiny .5, tiny .75, xxsmall 1, xsmall 1.25, small 1.5, medium 2, large 3, xlarge 4, xxlarge 5, huge 6, xhuge 8, xxhuge 12 rem. |
| `mb-5 md:mb-6` under a heading | `<div class="padding-bottom-small"></div>` after it | Spacing block, nearest V3 size. |
| `text-h1` … `text-h6`, `text-6xl` … | `heading-style-h1` … `heading-style-h6` | Chosen by the legacy element's current computed size, not Relume's (see Text sizing). |
| `text-xl` `text-lg` `text-md` `text-base` `text-sm` `text-xs` | `text-size-large\|medium\|regular\|small\|tiny` | Same rule: nearest by current size. |
| `font-semibold`, `font-bold` | `text-weight-semibold`, `text-weight-bold` | Only when the weight differs from what the size class already gives. |
| `text-center`, `text-left`, `text-right` | `text-align-center\|left\|right` | |
| `mx-auto` on a block | `align-center`, or flex or grid centering on the parent custom class | `align-center` is the V3 utility for a centred block; prefer the parent when the parent already lays out. |
| `rounded-image`, `rounded-card`, `rounded-button` | `border-radius` on the custom class from the client's radius variable | The V3 starter names are `--_sizes---border-radius--small\|medium\|large`; confirm the client's in the published CSS. Never a literal. |
| `aspect-square` `aspect-[3/2]` `aspect-[2/3]` `aspect-video` | `aspect-ratio-square` `-landscape` `-portrait` `-widescreen` | |
| `size-full object-cover` on an image | `<section>_image` custom class | `width: 100%`, `height: 100%`, `object-fit: cover`. |
| `hidden md:block` | `hide-mobile-landscape` | Client First hides at a breakpoint and below: `hide-tablet` (≤991), `hide-mobile-landscape` (≤767), `hide-mobile-portrait` (≤479), `hide` (always). |
| `md:hidden` (mobile only) | custom class, `display: none` at desktop and tablet | There is no desktop-only hide utility in V3. |
| `<Button>` / `<Button variant="secondary">` | `button`, `button is-secondary` | Variant names differ per project. Check the published CSS before using one. |
| `<Accordion>` | `<details class="<section>_item">` + `<summary>` | Write `open="open"` if one starts open; an empty boolean is dropped. |
| Rich text block | `text-rich-text` | Style nested tags through the class. |
| Theme colours (`bg-background-alternative`, `text-text-alternative`) | `background-color-primary\|secondary\|tertiary\|alternate`, `text-color-primary\|secondary\|alternate` | Only when the client's Theme collection defines them. |

Breakpoints: Webflow's are desktop (base), tablet ≤991, mobile landscape ≤767 and mobile portrait ≤479. Relume writes mobile first, so the unprefixed value is mobile, `md:` is tablet and up, and `lg:` is desktop. Put the `lg:` value on the base style and step down from there.

## Section classification

Classify each `main-wrapper` child from its legacy class names, headings and structure, then search the Relume MCP for a layout in that category. Relume category names come from its search results; the search terms below are where to start.

| Type | Recognise it by | Relume search | Default V3 skeleton |
|---|---|---|---|
| Hero | first section, the page's only `<h1>`, CTA buttons, a large image | hero header | `section_hero > container-large > hero_grid gap-xlarge > [hero_content, hero_image]` |
| Feature grid | repeated icon + heading + text cards | features, layout | `section_features > container-large > [features_header max-width-large, spacing block, features_list grid-autofit-medium > features_item*]` |
| Slider | Webflow Slider widget, arrows, dots | features, layout (carousel) | Rebuild as a static `features_list` when the slides fit on one screen at 1440; otherwise keep the legacy slider and mark the row `keep`. The HTML builder does not create native Slider or Tabs widgets. |
| Tabs | Webflow Tabs (TabsWrapper, TabsMenu, TabsPane) | layout (tabs) | Same rule as sliders: static stacked content, or keep. |
| Steps | numbered items, "how to get started" | layout, timeline, process | `section_steps > container-large > [steps_header, steps_list grid-autofit-small > steps_item*]` |
| Pricing | plan cards, prices | pricing | Keep the price-table component instance in place; rebuild only the header around it. |
| Comparison | a table of features vs competitors | comparison, pricing table | `section_comparison > container-large > comparison_table > comparison_row*` (grid rows; no layout tables). |
| FAQ | question/answer pairs, collapse triggers | faq | `section_faq > container-small > [heading, spacing block, faq_list > faq_item*]` |
| CTA | short heading, one or two buttons, signup | cta | `section_cta > container-large > cta_component > [cta_content, cta_buttons]` |
| Testimonial | quotes, ratings, review widgets | testimonial | `section_testimonial > container-medium > testimonial_component` |

Mark component instances (nav, footer, breadcrumbs, price tables) `keep`. Mark hidden sections (`hide` or visibility off; a breakpoint `hide-*` class hides at one width only, so it stays `rebuild`) and sections that repeat another section's content `drop`. Show both in the plan; the user can change them at the approval step.

## Text sizing

1. Run `css-sizes.js <published.css> <legacy class …>` (with `--scale css` once the foundation gate passes, so the site's own utility values are the scale). It resolves each legacy class's base font size, weight and line-height, ignoring `@media` overrides.
2. A heading element (`<h1>` to `<h6>`) gets the `headingUtility`: the nearest `heading-style-*`. Its tag keeps its legacy level, so an `<h2>` at 32 px becomes `<h2 class="heading-style-h3">`.
3. Any other text gets the `utility`: the nearest of all eleven classes. A 40 px `<div>` can carry `heading-style-h3`; a 16 px paragraph gets `text-size-regular`.
4. Ties go to the smaller size, and `text-size-*` wins over `heading-style-*` at the same size. Sizes outside the scale clamp to its ends and are flagged `clamped`; list those in the plan, because they change the look.
5. Weight: add the `weightUtility` (`text-weight-light|normal|medium|semibold|bold|xbold`) only when it differs from what the size class already sets.
6. If a legacy class has no resolvable size (no font-size, or a `clamp()`), inherit from the parent's mapping and say so in the plan.

## Custom class naming

- `<section>_<element>`: lowercase, hyphens inside a part, one underscore between the parts. Examples: `hero_grid`, `hero_content`, `faq_item`, `pricing_header`, `comparison_row`.
- The section part matches the section class: `section_faq` owns `faq_*`.
- Modifiers are combo classes that start with `is-`: `button is-secondary`, `section_cta is-dark`. Never stack a third custom class instead.
- Keep a legacy custom class only when it is already Client First shaped (for example `layout505_tabs` from a Relume import) and the published CSS styles it correctly.
- Create every new custom class with `data_style_tool` before the insert, in rem, then send the HTML with the class names only.

## Samples

Both samples use only verified V3 utilities plus the six custom classes `section_hero`, `hero_grid`, `hero_content`, `section_faq`, `faq_list` and `faq_item`. Each starts on the line after its `<!-- sample: … -->` marker so a script can extract it. Image and link values are placeholders; the build sets real assets and native link settings after the insert.

```html
<!-- sample: hero -->
<section class="section_hero">
  <div class="container-large">
    <div class="hero_grid gap-xlarge">
      <div class="hero_content">
        <h1 class="heading-style-h1">Page heading</h1>
        <div class="padding-bottom-small"></div>
        <p class="text-size-medium">Supporting text in one or two lines.</p>
        <div class="padding-bottom-medium"></div>
        <a href="#" class="button">Primary action</a>
      </div>
      <img src="hero-image.webp" alt="Describe the image" loading="eager" class="aspect-ratio-landscape">
    </div>
  </div>
</section>
```

```html
<!-- sample: faq -->
<section class="section_faq">
  <div class="container-small">
    <h2 class="heading-style-h2 text-align-center">Frequently asked questions</h2>
    <div class="padding-bottom-large"></div>
    <div class="faq_list">
      <details class="faq_item">
        <summary class="text-size-medium text-weight-bold">First question</summary>
        <div class="padding-bottom-small"></div>
        <div class="text-rich-text">
          <p>Answer to the first question.</p>
        </div>
      </details>
      <details class="faq_item">
        <summary class="text-size-medium text-weight-bold">Second question</summary>
        <div class="padding-bottom-small"></div>
        <div class="text-rich-text">
          <p>Answer to the second question.</p>
        </div>
      </details>
    </div>
  </div>
</section>
```

Custom class styles for the samples, in rem and variables (create these with `data_style_tool` before the insert):

| Class | Declarations |
|---|---|
| `section_hero`, `section_faq` | `padding: var(--_layout---section-padding--large) var(--_layout---spacing--global-padding)` |
| `hero_grid` | `display: grid; grid-template-columns: 1fr 1fr; align-items: center`; tablet and below `grid-template-columns: 1fr` |
| `hero_content` | `display: flex; flex-direction: column; align-items: flex-start` |
| `faq_list` | `display: flex; flex-direction: column` |
| `faq_item` | `padding-top: var(--_layout---spacing--small); padding-bottom: var(--_layout---spacing--small); border-bottom: 1px solid var(--_theme---border--primary)` |

Validate with the published CSS plus these drafted classes concatenated into one file, because the new classes are not published yet:

```
cat published.css drafted.css > check.css
node tools/webflow/validate-section.js --structure v3 --no-scheme check.css hero.html
```

Under `--structure v3` rule 7 allows padding on `section_*` (where V3 puts section padding), on `padding-*`, `button` and names ending `_item`, `_component`, `_wrapper`, `_card`, `_group`, `_field` or `_box`, and allows margin on `container-*`, `margin-*` and `align-center`. Padding or margin on any other class is still a rule 7 error, and that is the point: spacing belongs on the section, on the V3 spacing utilities or on gap, not on content classes.
