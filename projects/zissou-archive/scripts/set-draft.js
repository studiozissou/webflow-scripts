// Set the Boglioli item back to Draft for re-scanning
import '../config.js';
import { Client } from '@notionhq/client';
const n = new Client({ auth: process.env.NOTION_TOKEN });

const boglioli = '34ee1848-bb51-8086-8782-c827a1e68a7b';

await n.pages.update({
  page_id: boglioli,
  properties: {
    'Status': { select: { name: 'Draft' } },
  },
});

console.log('Boglioli set to Draft');
