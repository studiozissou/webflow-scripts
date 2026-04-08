/**
 * Acceptance tests for carsa-rishi-self-serve
 *
 * Validates the verification scripts that /carsa-build's Phase 6 runs via
 * Chrome DevTools MCP. The scripts are inlined here and executed against
 * a known-good live Carsa page (carsa-v2.webflow.io) to confirm they
 * return correct verdicts on real content and synthetic failure cases.
 *
 * Requires: STAGING_URL_CARSA in .env.test pointing to carsa-v2.webflow.io
 *
 * Related spec: .claude/specs/carsa-rishi-self-serve.md
 */
import { test, expect } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const STAGING_URL_CARSA = process.env.STAGING_URL_CARSA;

// ---------- Verification scripts (mirrors /carsa-build Phase 6) ----------

/**
 * Contrast checker — returns { pass, failures } for all text nodes under a root.
 * Uses WCAG 2.1 relative luminance formula.
 */
const CONTRAST_SCRIPT = `
(function(rootSelector) {
  function parseRGB(s) {
    const m = s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  function luminance([r, g, b]) {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrast(fg, bg) {
    const L1 = luminance(fg);
    const L2 = luminance(bg);
    const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
    return (hi + 0.05) / (lo + 0.05);
  }
  function effectiveBg(el) {
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const cs = getComputedStyle(cur);
      const rgb = parseRGB(cs.backgroundColor);
      if (rgb && cs.backgroundColor !== "rgba(0, 0, 0, 0)") return rgb;
      cur = cur.parentElement;
    }
    return [255, 255, 255];
  }
  const root = document.querySelector(rootSelector) || document.body;
  const nodes = root.querySelectorAll("h1, h2, h3, h4, h5, h6, p, a, span, li, button");
  const failures = [];
  nodes.forEach((el) => {
    const text = el.textContent.trim();
    if (!text) return;
    const cs = getComputedStyle(el);
    const fg = parseRGB(cs.color);
    if (!fg) return;
    const bg = effectiveBg(el);
    const ratio = contrast(fg, bg);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const isLarge = size >= 24 || (size >= 18 && bold);
    const required = isLarge ? 3 : 4.5;
    if (ratio < required) {
      failures.push({
        tag: el.tagName.toLowerCase(),
        text: text.slice(0, 40),
        ratio: +ratio.toFixed(2),
        required,
      });
    }
  });
  return { pass: failures.length === 0, failures, checked: nodes.length };
})
`;

/**
 * Touch target checker — finds interactive elements under 44x44 CSS px.
 */
const TOUCH_TARGET_SCRIPT = `
(function(rootSelector) {
  const root = document.querySelector(rootSelector) || document.body;
  const nodes = root.querySelectorAll("button, a, input, select, textarea, [role='button']");
  const failures = [];
  nodes.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.width < 44 || r.height < 44) {
      failures.push({
        tag: el.tagName.toLowerCase(),
        width: Math.round(r.width),
        height: Math.round(r.height),
      });
    }
  });
  return { pass: failures.length === 0, failures, checked: nodes.length };
})
`;

/**
 * Analytics attribute checker — soft check, returns warning not failure.
 */
const ANALYTICS_SCRIPT = `
(function(rootSelector) {
  const root = document.querySelector(rootSelector) || document.body;
  const nodes = root.querySelectorAll("button, a, input[type='submit'], input[type='button']");
  const missing = [];
  nodes.forEach((el) => {
    if (!el.hasAttribute("data-analytics-event")) {
      missing.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || el.value || "").trim().slice(0, 30),
      });
    }
  });
  return {
    pass: true, // soft check — always passes
    warnings: missing,
    checked: nodes.length,
  };
})
`;

// ---------- Tests ----------

test.describe("carsa-rishi-self-serve verification scripts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${STAGING_URL_CARSA}/`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);
  });

  test("contrast script passes on live homepage body", async ({ page }) => {
    const result = await page.evaluate(
      ({ script, selector }) => {
        const fn = eval(script);
        return fn(selector);
      },
      { script: CONTRAST_SCRIPT, selector: "body" }
    );

    expect(result.checked).toBeGreaterThan(10);
    // Production site may have a handful of legacy issues — allow small tolerance
    // but fail if there's widespread contrast breakage.
    if (!result.pass) {
      // eslint-disable-next-line no-console
      console.log("Contrast failures on homepage:", result.failures);
    }
    expect(result.failures.length).toBeLessThan(5);
  });

  test("contrast script detects an injected low-contrast element", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const bad = document.createElement("p");
      bad.id = "__carsa_contrast_test__";
      bad.textContent = "Low contrast test text";
      bad.style.color = "#BBBBBB";
      bad.style.backgroundColor = "#FFFFFF";
      bad.style.fontSize = "14px";
      document.body.appendChild(bad);
    });

    const result = await page.evaluate(
      ({ script, selector }) => {
        const fn = eval(script);
        return fn(selector);
      },
      { script: CONTRAST_SCRIPT, selector: "#__carsa_contrast_test__" }
    );

    expect(result.pass).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0].ratio).toBeLessThan(4.5);
  });

  test("touch target script passes on homepage nav links", async ({ page }) => {
    const nav = await page.locator("nav, [role='navigation']").first();
    const exists = (await nav.count()) > 0;
    if (!exists) test.skip(true, "No nav element found on homepage");

    const result = await page.evaluate(
      ({ script, selector }) => {
        const fn = eval(script);
        return fn(selector);
      },
      { script: TOUCH_TARGET_SCRIPT, selector: "nav, [role='navigation']" }
    );

    // Allow a handful of small decorative elements (e.g. social icons).
    expect(result.checked).toBeGreaterThan(0);
    expect(result.failures.length).toBeLessThan(3);
  });

  test("touch target script detects an injected undersized button", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const wrapper = document.createElement("div");
      wrapper.id = "__carsa_touch_test__";
      const btn = document.createElement("button");
      btn.textContent = "X";
      btn.style.width = "20px";
      btn.style.height = "20px";
      btn.style.display = "inline-block";
      wrapper.appendChild(btn);
      document.body.appendChild(wrapper);
    });

    const result = await page.evaluate(
      ({ script, selector }) => {
        const fn = eval(script);
        return fn(selector);
      },
      { script: TOUCH_TARGET_SCRIPT, selector: "#__carsa_touch_test__" }
    );

    expect(result.pass).toBe(false);
    expect(result.failures.length).toBe(1);
    expect(result.failures[0].width).toBeLessThan(44);
  });

  test("analytics script warns (not fails) when data-analytics-event is missing", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const wrapper = document.createElement("div");
      wrapper.id = "__carsa_analytics_test__";
      const btn = document.createElement("button");
      btn.textContent = "Untagged CTA";
      // Intentionally no data-analytics-event
      wrapper.appendChild(btn);
      document.body.appendChild(wrapper);
    });

    const result = await page.evaluate(
      ({ script, selector }) => {
        const fn = eval(script);
        return fn(selector);
      },
      { script: ANALYTICS_SCRIPT, selector: "#__carsa_analytics_test__" }
    );

    expect(result.pass).toBe(true); // soft check
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].text).toBe("Untagged CTA");
  });

  test("analytics script passes (no warnings) when data-analytics-event is present", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const wrapper = document.createElement("div");
      wrapper.id = "__carsa_analytics_pass_test__";
      const btn = document.createElement("button");
      btn.textContent = "Tagged CTA";
      btn.setAttribute("data-analytics-event", "test-section-cta-click");
      wrapper.appendChild(btn);
      document.body.appendChild(wrapper);
    });

    const result = await page.evaluate(
      ({ script, selector }) => {
        const fn = eval(script);
        return fn(selector);
      },
      {
        script: ANALYTICS_SCRIPT,
        selector: "#__carsa_analytics_pass_test__",
      }
    );

    expect(result.pass).toBe(true);
    expect(result.warnings.length).toBe(0);
  });

  test("no console errors on homepage load", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(`${STAGING_URL_CARSA}/`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test("skill trigger collision — carsa-webflow trigger should be narrowed", async () => {
    // Read the actual SKILL.md file and assert the trigger no longer contains
    // the broad "the website" / "landing page" phrases that caused collision.
    const fs = await import("fs");
    const path = await import("path");
    const skillPath = path.resolve(
      ".claude/skills/carsa-webflow/SKILL.md"
    );
    const content = fs.readFileSync(skillPath, "utf8");
    // Extract the description field from the YAML frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    expect(fmMatch).toBeTruthy();
    const frontmatter = fmMatch[1];
    const descMatch = frontmatter.match(/description:\s*>?\s*([\s\S]*?)(?:\n\w+:|$)/);
    expect(descMatch).toBeTruthy();
    const description = descMatch[1].toLowerCase();

    // Hard-fail triggers that must NOT appear in the narrowed description
    expect(description).not.toContain('"the website"');
    expect(description).not.toContain('"landing page"');
    // Must reference the unambiguous Carsa site ID
    expect(description).toContain("68348ea61096b37caacd2f95");
  });

  test("SKILL.md stays under 500 lines (progressive disclosure cliff)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const skillPath = path.resolve(
      ".claude/skills/carsa-webflow/SKILL.md"
    );
    const content = fs.readFileSync(skillPath, "utf8");
    const lineCount = content.split("\n").length;
    expect(lineCount).toBeLessThan(500);
  });
});
