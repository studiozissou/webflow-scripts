Scaffold a new animated section for a Webflow page.

## Usage
Provide: section name, client, page/namespace, animation style (fade / slide / pin / parallax / text-reveal / custom)

## Steps
1. Ask clarifying questions if animation style or content is unclear.
2. Read the project orchestrator and existing page modules.
3. Use the `code-writer` agent + `gsap-scrolltrigger` skill to build the section JS module.
4. Output the module as `projects/<client>/<section-name>.js`
5. Show the integration snippet for `orchestrator.js`
6. List any Webflow Designer steps: custom attributes, embed placement, CSS classes needed
7. Show the Webflow Embed HTML if required

## Section module template
```js
// Section: <SectionName>
// Page: <namespace>
// Animation: <style>

const <SectionName>Section = (() => {
  let ctx;

  function init() {
    const section = document.querySelector('[data-section="<name>"]');
    if (!section) return;

    ctx = gsap.context(() => {
      // animation code
    }, section);
  }

  function destroy() {
    ctx?.revert();
  }

  return { init, destroy };
})();
```
