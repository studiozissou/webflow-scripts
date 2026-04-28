import '../config.js';
import { Client } from '@notionhq/client';
const n = new Client({ auth: process.env.NOTION_TOKEN });

const today = new Date().toISOString().slice(0, 10);
const r = await n.databases.query({
  database_id: 'be751e1fc806485ba410bf137d362ad4',
  filter: {
    and: [
      { property: 'Scan Date', date: { equals: today } },
      { or: [
        { property: 'Status', select: { equals: 'Ready to List' } },
        { property: 'Status', select: { equals: 'Needs Info' } },
      ]},
    ],
  },
});

for (const p of r.results) {
  const name = p.properties['Item Name']?.title?.[0]?.text?.content ?? 'Untitled';
  const title = p.properties['Title']?.rich_text?.[0]?.text?.content ?? '';
  const desc = p.properties['Full Description']?.rich_text?.[0]?.text?.content ?? '';
  const price = p.properties['Suggested Price']?.number ?? '?';
  const floor = p.properties['Floor Price']?.number ?? '?';
  const condition = p.properties['Condition']?.select?.name ?? '?';
  const rating = p.properties['Condition Rating']?.number ?? '?';
  const brand = p.properties['Brand']?.select?.name ?? '?';
  const size = p.properties['Size']?.select?.name ?? '?';
  const status = p.properties['Status']?.select?.name ?? '?';
  const audit = p.properties['Price Audit']?.rich_text?.[0]?.text?.content ?? '';
  const purchase = p.properties['Purchase Price']?.number;
  const questions = p.properties['Questions']?.rich_text?.[0]?.text?.content ?? '';

  console.log(JSON.stringify({
    name, title, price, floor, condition, rating, brand, size, status,
    audit: audit.slice(0, 500), purchase, questions,
    desc: desc.slice(0, 800),
  }));
  console.log('---');
}
