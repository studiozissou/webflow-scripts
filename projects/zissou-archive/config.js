import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

export const NOTION_INVENTORY_DB = 'be751e1fc806485ba410bf137d362ad4';
export const NOTION_DROP_LOG_DB = 'c94323f733a24a5498ece05fa0a58cc2';

export const DROP_SCHEDULE = {
  1: { base: 0, aggressive: 0 },
  2: { base: 10, aggressive: 15 },
  3: { base: 15, aggressive: 25 },
  4: { base: 25, aggressive: 35 },
  5: { base: 30, aggressive: 30 },
};

export const DROP_DAY = 5; // Friday
export const DROP_HOUR = 8; // 8am UTC

export const SCAN_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';
