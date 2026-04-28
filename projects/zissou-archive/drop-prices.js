/**
 * drop-prices.js — Zissou Archive scheduled price drops
 *
 * Queries Notion for Listed items with Active drop schedule,
 * calculates the drop, updates the price, and logs the change.
 *
 * Usage: node projects/zissou-archive/drop-prices.js
 * Requires: NOTION_TOKEN in env
 */

import { NOTION_INVENTORY_DB } from './config.js'; // loads .env
import notion from './lib/notion.js';
import { calculateDrop } from './lib/price-drops.js';

const DEBUG = process.env.DEBUG === '1';

async function main() {
  // Query for Listed items
  const listed = await notion.queryByStatus(NOTION_INVENTORY_DB, 'Listed');
  DEBUG && process.stdout.write(`[drop-prices] Found ${listed.length} Listed items\n`);

  let dropped = 0;
  let skipped = 0;
  let errors = 0;

  for (const page of listed) {
    const pageId = page.id;
    const name = page.properties['Item Name']?.title?.[0]?.text?.content ?? 'Untitled';

    try {
      const dropSchedule = page.properties['Drop Schedule']?.select?.name;
      if (dropSchedule !== 'Active') {
        DEBUG && process.stdout.write(`[drop-prices] Skipping "${name}" — schedule: ${dropSchedule}\n`);
        skipped++;
        continue;
      }

      const suggestedPrice = notion.extractNumber(page, 'Suggested Price');
      const currentPrice = notion.extractNumber(page, 'Current Price');
      const floorPrice = notion.extractNumber(page, 'Floor Price');

      if (suggestedPrice == null || currentPrice == null || floorPrice == null) {
        DEBUG && process.stdout.write(`[drop-prices] Skipping "${name}" — missing price data\n`);
        skipped++;
        continue;
      }

      const listedDate = page.properties['Listed Date']?.date?.start ?? null;

      const result = calculateDrop(
        { suggestedPrice, currentPrice, floorPrice, listedDate, dropSchedule },
      );

      if (result.skipped) {
        DEBUG && process.stdout.write(`[drop-prices] Skipping "${name}" — ${result.reason}\n`);
        skipped++;
        continue;
      }

      // Only update if price actually changed
      if (result.newPrice === currentPrice) {
        DEBUG && process.stdout.write(`[drop-prices] No change for "${name}" (week ${result.week})\n`);
        skipped++;
        continue;
      }

      // Update price (and status/schedule if at floor)
      const priceUpdate = {
        'Current Price': { number: result.newPrice },
      };
      if (result.atFloor) {
        priceUpdate['Status'] = { select: { name: 'At Floor' } };
        priceUpdate['Drop Schedule'] = { select: { name: 'Paused' } };
      }
      await notion.updateProperties(pageId, priceUpdate);

      // Log the drop
      const dropType = result.atFloor ? 'Floor Hit' : 'Scheduled';
      const reason = result.atFloor
        ? `Price capped at floor (€${result.newPrice})`
        : `Week ${result.week} base drop (${result.dropPercent}%)`;

      await notion.createDropLogEntry({
        itemPageId: pageId,
        itemName: name,
        week: result.week,
        previousPrice: currentPrice,
        newPrice: result.newPrice,
        dropType,
        reason,
      });

      DEBUG && process.stdout.write(
        `[drop-prices] "${name}": €${currentPrice} -> €${result.newPrice} (week ${result.week}, ${result.dropPercent}%)\n`,
      );
      dropped++;
    } catch (err) {
      process.stderr.write(`[drop-prices] Error processing "${name}": ${err.message}\n`);
      errors++;
    }
  }

  DEBUG && process.stdout.write(
    `[drop-prices] Done: ${dropped} dropped, ${skipped} skipped, ${errors} errors\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[drop-prices] Fatal: ${err.message}\n`);
  process.exit(1);
});
