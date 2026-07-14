/**
 * Acceptance tests for carsa-near-location-redirect
 *
 * Validates the near-page location redirect script:
 * - Zero-count location facet-wrappers are hidden
 * - Non-zero location facet-wrappers remain visible
 * - Clicking a zero-count location triggers navigation to /used-cars
 * - Script does not interfere on non-near pages
 *
 * Requires: STAGING_URL_CARSA in .env.test (e.g. https://carsa-v2.webflow.io)
 *
 * Related spec: projects/carsa/.claude/specs/near-location-redirect.md
 */
import { test, expect } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const BASE = process.env.STAGING_URL_CARSA || "https://carsa-v2.webflow.io";
const NEAR_PAGE = `${BASE}/used-cars/near/wakefield?cars_sort_dated-added=desc&cars_location_equal=%5B%22Bradford%22%5D`;
const USED_CARS_PAGE = `${BASE}/used-cars`;

// Wait for Finsweet facet counts to settle
const FINSWEET_SETTLE_MS = 4000;

test.describe("carsa-near-location-redirect", () => {
  test.describe("on /near/ page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(NEAR_PAGE, { waitUntil: "networkidle" });
      // Wait for Finsweet to render facet counts
      await page.waitForTimeout(FINSWEET_SETTLE_MS);
    });

    test("no console errors on page load", async ({ page }) => {
      const errors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      // Reload to capture errors from start
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(FINSWEET_SETTLE_MS);
      expect(errors).toEqual([]);
    });

    test("zero-count facet-wrapper is hidden", async ({ page }) => {
      // Find a location with 0 count
      const zeroCountItems = page.locator(
        'label.dropdown1_checkbox-field:has([fs-list-element="facet-count"]:text-is("0"))'
      );
      const count = await zeroCountItems.count();
      expect(count).toBeGreaterThan(0);

      // Each zero-count item should have .facet-wrapper hidden
      for (let i = 0; i < Math.min(count, 3); i++) {
        const facetWrapper = zeroCountItems.nth(i).locator(".facet-wrapper");
        await expect(facetWrapper).toBeHidden();
      }
    });

    test("non-zero facet-wrapper is visible", async ({ page }) => {
      // Find a location with non-zero count (Bradford should have results)
      const nonZeroItems = page.locator(
        'label.dropdown1_checkbox-field:has([fs-list-field="location"]):has([fs-list-element="facet-count"]:not(:text-is("0")))'
      );
      const count = await nonZeroItems.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < Math.min(count, 3); i++) {
        const facetWrapper = nonZeroItems.nth(i).locator(".facet-wrapper");
        await expect(facetWrapper).toBeVisible();
      }
    });

    test("click on zero-count location triggers navigation", async ({
      page,
    }) => {
      // Click a zero-count location checkbox label
      const zeroCountLabel = page
        .locator(
          'label.dropdown1_checkbox-field:has([fs-list-element="facet-count"]:text-is("0"))'
        )
        .first();

      await zeroCountLabel.click();

      // Should navigate away from the /near/ page
      await page.waitForURL(/\/used-cars(?!\/)/, { timeout: 10000 });
      expect(page.url()).toContain("/used-cars");
      expect(page.url()).toContain("cars_location_equal");
    });
  });

  test.describe("on /used-cars page (non-near)", () => {
    test("script does not hide any facet-wrappers", async ({ page }) => {
      await page.goto(USED_CARS_PAGE, { waitUntil: "networkidle" });
      await page.waitForTimeout(FINSWEET_SETTLE_MS);

      // All facet-wrappers in location filters should remain visible
      const locationLabels = page.locator(
        'label.dropdown1_checkbox-field:has([fs-list-field="location"]) .facet-wrapper'
      );
      const count = await locationLabels.count();
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          await expect(locationLabels.nth(i)).toBeVisible();
        }
      }
    });
  });
});
