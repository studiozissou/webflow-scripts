import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const STAGING_URL = process.env.STAGING_URL;

test.describe("sz-work-clients acceptance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${STAGING_URL}/`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);
  });

  test("client rows render from CMS", async ({ page }) => {
    const rows = page.locator("[data-work-row]");
    await expect(rows).toHaveCount(5);
  });

  test("client names display with bracket characters", async ({ page }) => {
    const firstRow = page.locator("[data-work-row]").first();
    const nameEl = firstRow.locator(".sz-work-name").first();

    const fontFeatures = await nameEl.evaluate(
      (el) => getComputedStyle(el).fontFeatureSettings
    );
    expect(fontFeatures).toContain("ss05");
    expect(fontFeatures).toContain("case");
  });

  test("external links have correct attributes", async ({ page }) => {
    const rows = page.locator("[data-work-row]");
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      await expect(row).toHaveAttribute("target", "_blank");
      await expect(row).toHaveAttribute("rel", /noopener/);
      const href = await row.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);
    }
  });

  test("hover shows preview image", async ({ page }) => {
    const firstRow = page.locator("[data-work-row]").first();
    const preview = page.locator("[data-work-preview]");

    // Verify preview starts hidden
    const initialOpacity = await preview.evaluate(
      (el) => getComputedStyle(el).opacity
    );
    expect(initialOpacity).toBe("0");

    // Hover on first row
    await firstRow.hover();
    await page.waitForTimeout(500);

    const hoverOpacity = await preview.evaluate(
      (el) => getComputedStyle(el).opacity
    );
    expect(hoverOpacity).toBe("1");
  });

  test("hover exit hides preview image", async ({ page }) => {
    const firstRow = page.locator("[data-work-row]").first();
    const preview = page.locator("[data-work-preview]");

    // Hover then move away
    await firstRow.hover();
    await page.waitForTimeout(500);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);

    const opacity = await preview.evaluate(
      (el) => getComputedStyle(el).opacity
    );
    expect(opacity).toBe("0");
  });

  test("preview image hidden on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${STAGING_URL}/`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1500);

    const preview = page.locator("[data-work-preview]");
    await expect(preview).not.toBeVisible();
  });

  test("prefers-reduced-motion skips animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${STAGING_URL}/`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    const firstRow = page.locator("[data-work-row]").first();
    const preview = page.locator("[data-work-preview]");

    await firstRow.hover();
    // Should be instant — no need to wait for animation
    const opacity = await preview.evaluate(
      (el) => getComputedStyle(el).opacity
    );
    expect(opacity).toBe("1");
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
    expect(errors).toEqual([]);
  });
});
