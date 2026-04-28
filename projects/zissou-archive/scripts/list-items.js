import '../config.js';
import { Client } from '@notionhq/client';
const n = new Client({ auth: process.env.NOTION_TOKEN });

const r = await n.databases.query({
  database_id: 'be751e1fc806485ba410bf137d362ad4',
});

for (const p of r.results) {
  const name = p.properties['Item Name']?.title?.[0]?.text?.content ?? 'Untitled';
  const status = p.properties['Status']?.select?.name ?? 'none';
  const photos = p.properties['Photos']?.files?.length ?? 0;
  const notes = p.properties['Notes']?.rich_text?.[0]?.text?.content ?? '';
  if (photos > 0 || name !== 'Untitled') {
    console.log(JSON.stringify({ name, status, photos, notes: notes.slice(0, 100), id: p.id }));
  }
}
