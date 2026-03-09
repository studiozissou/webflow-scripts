/**
 * Acceptance tests for sz-quality-cards
 * Three scroll-triggered reveal cards (Interfaces / Code / Decisions)
 * with corner pins, dashed SVG connectors, and staggered ScrollTrigger animation.
 *
 * Requires: STAGING_URL in .env.test pointing to Studio Zissou staging site.
 */
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const STAGING_URL = process.env.STAGING_URL;

test.describe("sz-quality-cards acceptance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${STAGING_URL}/`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);
  });

  test("quality cards are visible after scrolling", async ({ page }) => {
    const section = page.locator("[data-quality]");
    const sectionBox = await section.boundingBox();

    // Scroll to the quality section and through the pinned area
    await page.evaluate(
      (y) => window.scrollTo(0, y + 2200),
      sectionBox.y
    );
    await page.waitForTimeout(2000);

    const cards = page.locator("[data-quality-card]");
    await expect(cards).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const opacity = await cards
        .nth(i)
        .evaluate((el) => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0.9);
    }
  });

  test("corner pins animate sequentially — all visible after scroll", async ({
    page,
  }) => {
    const section = page.locator("[data-quality]");
    const sectionBox = await section.boundingBox();

    await page.evaluate(
      (y) => window.scrollTo(0, y + 2200),
      sectionBox.y
    );
    await page.waitForTimeout(2000);

    // Each card has 4 corner pins = 12 total
    const pins = page.locator("[data-quality-pin]");
    await expect(pins).toHaveCount(12);

    for (let i = 0; i < 12; i++) {
      const opacity = await pins
        .nth(i)
        .evaluate((el) => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0.9);
    }
  });

  test("dashed lines are drawn after scroll", async ({ page }) => {
    const section = page.locator("[data-quality]");
    const sectionBox = await section.boundingBox();

    await page.evaluate(
      (y) => window.scrollTo(0, y + 2200),
      sectionBox.y
    );
    await page.waitForTimeout(2000);

    const lines = page.locator("[data-quality-line] line");
    await expect(lines).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const dashOffset = await lines.nth(i).evaluate((el) => {
        const style = window.getComputedStyle(el);
        return parseFloat(style.strokeDashoffset) || 0;
      });
      // After full scroll, dashoffset should be 0 (line fully drawn)
      expect(Math.abs(dashOffset)).toBeLessThan(1);
    }
  });

  test("cards stack on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${STAGING_URL}/`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    const cards = page.locator("[data-quality-card]");
    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();

    // Cards should be stacked vertically (second card below first)
    expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 10);
  });

  test("no scroll pin on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${STAGING_URL}/`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    const section = page.locator("[data-quality]");

    // ScrollTrigger pin adds position: fixed or a pin-spacer wrapper
    const position = await section.evaluate(
      (el) => getComputedStyle(el).position
    );
    expect(position).not.toBe("fixed");

    // Also check no pin-spacer wrapper
    const hasPinSpacer = await page
      .locator(".pin-spacer")
      .count();
    // If pin-spacer exists, it shouldn't wrap the quality section on mobile
    if (hasPinSpacer > 0) {
      const isQualityPinned = await page.evaluate(() => {
        const section = document.querySelector("[data-quality]");
        return section.parentElement.classList.contains("pin-spacer");
      });
      expect(isQualityPinned).toBe(false);
    }
  });

  test("prefers-reduced-motion shows all immediately", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${STAGING_URL}/`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    // Cards should be visible without any scrolling
    const cards = page.locator("[data-quality-card]");
    await expect(cards).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const opacity = await cards
        .nth(i)
        .evaluate((el) => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0.9);
    }

    // Pins should also be visible
    const pins = page.locator("[data-quality-pin]");
    for (let i = 0; i < 12; i++) {
      const opacity = await pins
        .nth(i)
        .evaluate((el) => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBeGreaterThan(0.9);
    }
  });

  test("no console errors on page load", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(`${STAGING_URL}/`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);

    // Scroll through the quality section
    const section = page.locator("[data-quality]");
    const sectionBox = await section.boundingBox();
    if (sectionBox) {
      await page.evaluate(
        (y) => window.scrollTo(0, y + 2200),
        sectionBox.y
      );
      await page.waitForTimeout(2000);
    }

    expect(errors).toEqual([]);
  });
});
