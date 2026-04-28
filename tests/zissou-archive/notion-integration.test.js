/**
 * Notion integration tests for Zissou Archive.
 *
 * These tests hit the real Notion API and require:
 *   NOTION_TOKEN — Notion integration token
 *
 * The tests use the real Zissou Inventory and Price Drop Log databases.
 * They create test items, verify reads/writes, and clean up after.
 *
 * Run: NOTION_TOKEN=secret_xxx node --test tests/zissou-archive/notion-integration.test.js
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

// Skip entire suite if no token
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const SKIP = !NOTION_TOKEN;

// Dynamic import to avoid load errors when not running integration tests
let notion;
let config;
if (!SKIP) {
  ({ default: notion } = await import('../../projects/zissou-archive/lib/notion.js'));
  config = await import('../../projects/zissou-archive/config.js');
}

// Track pages created so we can clean up
const createdPageIds = [];

describe('Notion integration', { skip: SKIP ? 'NOTION_TOKEN not set' : false }, () => {

  // ─── Connection ───────────────────────────────────────────────────

  describe('connection', () => {
    it('connects to Notion API successfully', async () => {
      const user = await notion.getMe();
      assert.ok(user.id, 'should return a user/bot ID');
      assert.ok(user.type === 'bot' || user.type === 'person');
    });

    it('can access the Inventory database', async () => {
      const db = await notion.getDatabase(config.NOTION_INVENTORY_DB);
      assert.ok(db.id, 'should return database metadata');
      assert.ok(db.title, 'should have a title');
    });

    it('can access the Price Drop Log database', async () => {
      const db = await notion.getDatabase(config.NOTION_DROP_LOG_DB);
      assert.ok(db.id);
      assert.ok(db.title);
    });
  });

  // ─── Reading ──────────────────────────────────────────────────────

  describe('reading', () => {
    it('queries inventory by status filter', async () => {
      // Query for any status — just verifying the filter works
      const results = await notion.queryByStatus(config.NOTION_INVENTORY_DB, 'Draft');
      assert.ok(Array.isArray(results), 'should return an array');
      // Don't assert length — there may be 0 draft items
    });

    it('returns page properties in expected shape', async () => {
      // Get any page from the inventory
      const results = await notion.queryByStatus(config.NOTION_INVENTORY_DB, 'Draft');
      if (results.length === 0) {
        // Create a test page to read
        const testPage = await notion.createInventoryItem({
          title: '[TEST] Read Shape Check',
          status: 'Draft',
          notes: 'Auto-created by integration test — will be deleted',
        });
        createdPageIds.push(testPage.id);

        const page = await notion.getPage(testPage.id);
        assert.ok(page.id);
        assert.ok(page.properties);
      } else {
        const page = results[0];
        assert.ok(page.id);
        assert.ok(page.properties);
      }
    });
  });

  // ─── Writing ──────────────────────────────────────────────────────

  describe('writing', () => {
    let testPageId;

    it('creates an inventory item', async () => {
      const page = await notion.createInventoryItem({
        title: '[TEST] Zissou Integration Test Item',
        status: 'Draft',
        notes: 'Auto-created by integration test — will be deleted',
      });

      testPageId = page.id;
      createdPageIds.push(testPageId);

      assert.ok(testPageId, 'should return a page ID');
    });

    it('updates inventory item properties', async () => {
      assert.ok(testPageId, 'requires test page from previous step');

      await notion.updateProperties(testPageId, {
        'Title': { rich_text: [{ text: { content: '[TEST] Updated Title' } }] },
        'Suggested Price': { number: 55 },
        'Current Price': { number: 55 },
        'Floor Price': { number: 25 },
        'Condition': { select: { name: 'Very good' } },
        'Brand': { select: { name: 'Test Brand' } },
      });

      const page = await notion.getPage(testPageId);
      const price = notion.extractNumber(page, 'Suggested Price');
      assert.equal(price, 55);
    });

    it('transitions status from Draft to Ready to List', async () => {
      assert.ok(testPageId, 'requires test page');

      await notion.updateStatus(testPageId, 'Ready to List');

      const page = await notion.getPage(testPageId);
      const status = notion.extractStatus(page);
      assert.equal(status, 'Ready to List');
    });

    it('transitions status to Listed with Listed Date', async () => {
      assert.ok(testPageId, 'requires test page');

      const today = new Date().toISOString().slice(0, 10);
      await notion.updateProperties(testPageId, {
        'Status': { select: { name: 'Listed' } },
        'Listed Date': { date: { start: today } },
        'Drop Schedule': { select: { name: 'Active' } },
      });

      const page = await notion.getPage(testPageId);
      const status = notion.extractStatus(page);
      assert.equal(status, 'Listed');
    });

    it('creates a price drop log entry with relation', async () => {
      assert.ok(testPageId, 'requires test page');

      const logEntry = await notion.createDropLogEntry({
        itemPageId: testPageId,
        itemName: '[TEST] Zissou Integration Test Item',
        week: 2,
        previousPrice: 55,
        newPrice: 50,
        dropType: 'Scheduled',
        reason: 'Week 2 base drop (10%)',
      });

      createdPageIds.push(logEntry.id);

      assert.ok(logEntry.id, 'should return a log entry page ID');
    });
  });

  // ─── File download ────────────────────────────────────────────────

  describe('file handling', () => {
    it('extracts file URLs from a page with files property', async () => {
      // Create a page — we can't upload files via API, but we can test the extraction logic
      const page = await notion.createInventoryItem({
        title: '[TEST] File URL Extraction',
        status: 'Draft',
        notes: 'Testing file extraction — no actual files',
      });
      createdPageIds.push(page.id);

      const files = notion.extractFiles(page);
      // Should return empty array since we haven't uploaded photos
      assert.ok(Array.isArray(files));
      assert.equal(files.length, 0);
    });
  });

  // ─── Cleanup ──────────────────────────────────────────────────────

  after(async () => {
    // Archive all test pages we created
    for (const pageId of createdPageIds) {
      try {
        await notion.archivePage(pageId);
      } catch {
        // Best effort cleanup — don't fail tests on cleanup errors
      }
    }
  });
});
