/**
 * scan-items.js — Zissou Archive scan flow
 *
 * Queries Notion for Draft inventory items, sends photos to Claude Vision
 * for analysis, and writes the structured response back to Notion.
 *
 * Usage: node projects/zissou-archive/scan-items.js
 * Requires: NOTION_TOKEN, ANTHROPIC_API_KEY in env
 */

import { NOTION_INVENTORY_DB, SCAN_MODEL } from './config.js'; // loads .env
import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import notion from './lib/notion.js';
import { buildScanMessage, parseScanResponse, mapToNotionProperties } from './lib/scanner.js';
import { humanize } from './lib/humanizer.js';

const DEBUG = process.env.DEBUG === '1';

const SKILL_PATH = new URL('../../.claude/skills/vinted-listing/SKILL.md', import.meta.url);
const SCHEMA_PATH = new URL('../../.claude/skills/vinted-listing/references/schema.json', import.meta.url);

const skillPrompt = readFileSync(SKILL_PATH, 'utf-8');
const schema = readFileSync(SCHEMA_PATH, 'utf-8');

const systemPrompt = `${skillPrompt}\n\n## Output Schema\n\nReturn structured JSON matching this schema:\n\n\`\`\`json\n${schema}\n\`\`\``;

const anthropic = new Anthropic();

async function main() {
  const drafts = await notion.queryScannable(NOTION_INVENTORY_DB);
  DEBUG && process.stdout.write(`[scan-items] Found ${drafts.length} scannable items (Draft or no status)\n`);

  if (drafts.length === 0) {
    DEBUG && process.stdout.write('[scan-items] No scannable items found\n');
    return;
  }

  let scanned = 0;
  let skipped = 0;
  let errors = 0;

  for (const page of drafts) {
    const pageId = page.id;
    const name = page.properties['Item Name']?.title?.[0]?.text?.content ?? 'Untitled';

    try {
      const photos = notion.extractFiles(page);
      if (photos.length === 0) {
        DEBUG && process.stdout.write(`[scan-items] Skipping "${name}" — no photos\n`);
        skipped++;
        continue;
      }

      const notes = page.properties['Notes']?.rich_text?.[0]?.text?.content ?? '';

      const userMessage = buildScanMessage(photos, notes);

      const response = await anthropic.messages.create({
        model: SCAN_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [userMessage],
      });

      const data = parseScanResponse(response);

      // Humanizer pass — remove AI writing patterns from title and description
      DEBUG && process.stdout.write(`[scan-items] Running humanizer pass for "${name}"...\n`);
      const humanized = await humanize(anthropic, data.title, data.full_text);
      data.title = humanized.title;
      data.full_text = humanized.full_text;

      const properties = mapToNotionProperties(data);

      // Determine target status
      const targetStatus = data.needsInfo ? 'Needs Info' : 'Ready to List';
      properties['Status'] = { select: { name: targetStatus } };

      await notion.updateProperties(pageId, properties);

      DEBUG && process.stdout.write(`[scan-items] Scanned "${name}" -> ${targetStatus}\n`);
      scanned++;
    } catch (err) {
      process.stderr.write(`[scan-items] Error processing "${name}": ${err.message}\n`);
      errors++;
    }
  }

  DEBUG && process.stdout.write(
    `[scan-items] Done: ${scanned} scanned, ${skipped} skipped, ${errors} errors\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[scan-items] Fatal: ${err.message}\n`);
  process.exit(1);
});
