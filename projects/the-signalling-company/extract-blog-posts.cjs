/**
 * Extract blog posts from WordPress SQL dump.
 * Handles semicolons inside quoted strings correctly.
 */
const fs = require('fs');
const path = require('path');

const SQL_PATH = '/Users/willmorley/Downloads/Backup-thesignalingcompany_may_26/sc3glny3745_tsc.sql';
const OUTPUT_DIR = path.join(__dirname, 'assets', 'blog', 'extracted');

function unescape(str) {
  if (!str) return '';
  return str
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

function cleanWordPressHTML(html) {
  return html
    // Strip WordPress block comments
    .replace(/<!--\s*\/?wp:[^>]*-->/g, '')
    .replace(/<!--\s*elementor[^>]*-->/g, '')
    // Remove inline styles, WP classes, VC shortcodes
    .replace(/\s*style="[^"]*"/g, '')
    .replace(/\s*class="wp-[^"]*"/g, '')
    .replace(/\s*class="has-[^"]*"/g, '')
    .replace(/\[\/?vc_[^\]]*\]/g, '')
    // Remove images pointing to dead WordPress URLs
    .replace(/<img[^>]*src="[^"]*glny3745\.odns\.fr[^"]*"[^>]*\/?>/g, '')
    // Remove links wrapping dead WordPress URLs (preserve link text)
    .replace(/<a[^>]*href="[^"]*glny3745\.odns\.fr[^"]*"[^>]*>(.*?)<\/a>/g, '$1')
    // Remove width/height attrs from remaining images
    .replace(/\s*width="\d+"/g, '')
    .replace(/\s*height="\d+"/g, '')
    // Clean up empty containers
    .replace(/<figure>\s*<\/figure>/g, '')
    .replace(/<figure>\s*<a[^>]*>\s*<\/a>\s*<\/figure>/g, '')
    .replace(/<div>\s*<\/div>/g, '')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Find the end of a SQL statement, respecting quoted strings.
 */
function findStatementEnd(sql, start) {
  let i = start;
  let inStr = false;
  while (i < sql.length) {
    const ch = sql[i];
    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === "'") {
        if (i + 1 < sql.length && sql[i + 1] === "'") { i += 2; continue; }
        inStr = false;
      }
      i++;
      continue;
    }
    if (ch === "'") { inStr = true; i++; continue; }
    if (ch === ';') return i;
    i++;
  }
  return sql.length;
}

/**
 * Parse SQL VALUES into rows of fields.
 */
function parseValues(valuesStr) {
  const rows = [];
  let i = 0;
  while (i < valuesStr.length && valuesStr[i] !== '(') i++;
  while (i < valuesStr.length) {
    if (valuesStr[i] !== '(') { i++; continue; }
    i++;
    const fields = [];
    let field = '';
    let inStr = false;
    while (i < valuesStr.length) {
      const ch = valuesStr[i];
      if (inStr) {
        if (ch === '\\') {
          field += ch; i++;
          if (i < valuesStr.length) { field += valuesStr[i]; i++; }
          continue;
        }
        if (ch === "'") {
          if (i + 1 < valuesStr.length && valuesStr[i + 1] === "'") {
            field += "''"; i += 2; continue;
          }
          inStr = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === "'") { inStr = true; i++; continue; }
      if (ch === ',') { fields.push(field.trim()); field = ''; i++; continue; }
      if (ch === ')') { fields.push(field.trim()); rows.push(fields); i++; break; }
      field += ch; i++;
    }
    while (i < valuesStr.length && (valuesStr[i] === ',' || valuesStr[i] === '\n' || valuesStr[i] === '\r' || valuesStr[i] === ' ')) i++;
  }
  return rows;
}

const sql = fs.readFileSync(SQL_PATH, 'utf8');

// Find all tsc_posts INSERT blocks with string-aware statement end
let pos = 0;
const allRows = [];
let blockCount = 0;
while (true) {
  const start = sql.indexOf('INSERT INTO `tsc_posts`', pos);
  if (start === -1) break;
  const end = findStatementEnd(sql, start);
  const block = sql.substring(start, end);
  blockCount++;

  const valuesIdx = block.indexOf('VALUES');
  if (valuesIdx === -1) { pos = end + 1; continue; }

  const rows = parseValues(block.substring(valuesIdx + 6));
  allRows.push(...rows);
  pos = end + 1;
}

console.log(`Found ${blockCount} INSERT blocks, ${allRows.length} total rows`);

// Show post types
const types = {};
for (const row of allRows) {
  const t = row[20] || 'UNKNOWN';
  types[t] = (types[t] || 0) + 1;
}
console.log('\nPost types:');
for (const [type, count] of Object.entries(types).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count}`);
}

// Show ALL blog posts (post_type = 'post')
const blogPosts = allRows.filter(r => r[20] === 'post');
console.log(`\n=== BLOG POSTS (${blogPosts.length}) ===`);
for (const row of blogPosts) {
  const id = row[0];
  const date = row[2];
  const title = unescape(row[5]);
  const status = row[7];
  const slug = unescape(row[11]);
  const contentLen = (row[4] || '').length;
  console.log(`\nID: ${id} | ${date} | [${status}] ${title}`);
  console.log(`  slug: ${slug}`);
  console.log(`  content: ${contentLen} chars`);
}

// Also check revisions of blog posts
const revisions = allRows.filter(r => r[20] === 'revision');
console.log(`\n=== REVISIONS (${revisions.length}) ===`);
for (const row of revisions) {
  const title = unescape(row[5]);
  const parent = row[17];
  const contentLen = (row[4] || '').length;
  console.log(`ID: ${row[0]} | parent: ${parent} | ${title.substring(0, 80)} | ${contentLen} chars`);
}

// Save blog posts
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const row of blogPosts) {
  const id = row[0];
  const title = unescape(row[5]);
  const content = unescape(row[4]);
  const date = row[2];
  const slug = unescape(row[11]);
  const status = row[7];
  const cleaned = cleanWordPressHTML(content);

  const filename = `${id}-${slug}.html`;
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), cleaned);

  const meta = { id, title, slug, date, status, contentLength: cleaned.length };
  console.log(`\nSaved: ${filename} (${cleaned.length} chars)`);
}

// Save metadata
const metadata = blogPosts.map(row => ({
  id: row[0],
  title: unescape(row[5]),
  slug: unescape(row[11]),
  date: row[2],
  status: row[7],
  author: row[1],
  contentLength: (row[4] || '').length,
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));
