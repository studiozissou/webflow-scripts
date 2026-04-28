import { DROP_SCHEDULE as _DROP_SCHEDULE } from '../config.js';

const DEBUG = typeof process !== 'undefined' && process.env.DEBUG === '1';

export const DROP_SCHEDULE = _DROP_SCHEDULE;

/**
 * Calculate the price drop for an inventory item based on how long it has been listed.
 *
 * Drop is always calculated from suggestedPrice, never currentPrice.
 *
 * @param {object} item - { suggestedPrice, currentPrice, floorPrice, listedDate, dropSchedule }
 * @param {object} [options] - { mode: 'base' | 'aggressive' }
 * @returns {object} { newPrice, dropPercent, week, atFloor, skipped?, reason? }
 */
export function calculateDrop(item, options = {}) {
  const { suggestedPrice, floorPrice, listedDate, dropSchedule } = item;
  const mode = options.mode || 'base';

  if (dropSchedule === 'Paused') {
    return { skipped: true, reason: 'paused' };
  }

  if (!listedDate) {
    return { skipped: true, reason: 'no listed date' };
  }

  const listedMs = new Date(listedDate).getTime();
  if (isNaN(listedMs)) {
    return { skipped: true, reason: 'invalid listed date' };
  }
  const nowMs = Date.now();
  const daysListed = Math.floor((nowMs - listedMs) / (1000 * 60 * 60 * 24));
  const week = Math.min(Math.floor(daysListed / 7) + 1, 5);

  const dropPercent = DROP_SCHEDULE[week][mode];
  let newPrice = Math.round(suggestedPrice * (1 - dropPercent / 100));

  let atFloor = false;

  if (newPrice <= floorPrice) {
    newPrice = floorPrice;
    atFloor = true;
  }

  DEBUG && process.stdout.write(
    `[price-drops] week=${week} drop=${dropPercent}% suggested=${suggestedPrice} new=${newPrice} floor=${floorPrice} atFloor=${atFloor}\n`,
  );

  return { newPrice, dropPercent, week, atFloor };
}

/**
 * Build a Notion page creation payload for the drop log.
 *
 * @param {object} params - { itemPageId, itemName, week, previousPrice, newPrice, dropType, reason }
 * @returns {object} { title, properties }
 */
export function buildDropLogEntry(params) {
  const { itemPageId, itemName, week, previousPrice, newPrice, dropType, reason } = params;
  const today = new Date().toISOString().slice(0, 10);

  return {
    title: `${itemName} — Week ${week} Drop`,
    properties: {
      'Inventory Item': {
        relation: [{ id: itemPageId }],
      },
      'Previous Price': {
        number: previousPrice,
      },
      'New Price': {
        number: newPrice,
      },
      'Drop Type': {
        select: { name: dropType },
      },
      'Reason': {
        rich_text: [{ text: { content: reason } }],
      },
      'Date': {
        date: { start: today },
      },
    },
  };
}
