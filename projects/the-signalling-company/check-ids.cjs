const fs = require('fs');
const SQL_PATH = '/Users/willmorley/Downloads/Backup-thesignalingcompany_may_26/sc3glny3745_tsc.sql';
const sql = fs.readFileSync(SQL_PATH, 'utf8');

const checkIds = ['2045', '2201', '2292', '2246', '1685', '1729', '2264', '2272', '2296', '2302',
  '2552', '2558', '2560', '2562', '2570', '2583', '2723', '2745', '2785', '2832',
  '2910', '2933', '2973', '3018', '3046', '3111'];

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
        if (ch === '\\') { field += ch; i++; if (i < valuesStr.length) { field += valuesStr[i]; i++; } continue; }
        if (ch === "'") {
          if (i + 1 < valuesStr.length && valuesStr[i + 1] === "'") { field += "''"; i += 2; continue; }
          inStr = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === "'") { inStr = true; i++; continue; }
      if (ch === ',') { fields.push(field.trim()); field = ''; i++; continue; }
      if (ch === ')') { fields.push(field.trim()); rows.push(fields); i++; break; }
      field += ch; i++;
    }
    while (i < valuesStr.length && (valuesStr[i] === ',' || valuesStr[i] === '\n' || valuesStr[i] === ' ')) i++;
  }
  return rows;
}

let pos = 0;
const allRows = [];
while (true) {
  const start = sql.indexOf('INSERT INTO `tsc_posts`', pos);
  if (start === -1) break;
  const end = sql.indexOf(';', start);
  const block = sql.substring(start, end);
  const valuesIdx = block.indexOf('VALUES');
  if (valuesIdx === -1) { pos = end; continue; }
  allRows.push(...parseValues(block.substring(valuesIdx + 6)));
  pos = end;
}

function unescape(str) {
  if (!str) return '';
  return str.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\\\/g, '\\');
}

for (const row of allRows) {
  if (checkIds.includes(row[0])) {
    console.log('ID:', row[0]);
    console.log('  type:', row[20]);
    console.log('  status:', row[7]);
    console.log('  date:', row[2]);
    console.log('  title:', unescape(row[5] || '').substring(0, 100));
    console.log('  slug:', unescape(row[11] || '').substring(0, 80));
    console.log('  parent:', row[17]);
    console.log('  content length:', (row[4] || '').length);
    console.log('');
  }
}
