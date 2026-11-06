// Streams objects to a newline-delimited JSON file and reads such a file back line by line.

import { createReadStream, createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';

export function createNdjsonWriter(path) {
  mkdirSync(dirname(path), { recursive: true });
  const stream = createWriteStream(path, { encoding: 'utf8' });
  let failure = null;
  stream.on('error', (err) => {
    failure = err;
  });
  return {
    write(object) {
      if (failure) return Promise.reject(failure);
      const ok = stream.write(`${JSON.stringify(object)}\n`);
      return ok ? Promise.resolve() : new Promise((resolve) => stream.once('drain', resolve));
    },
    close() {
      return new Promise((resolve, reject) => {
        if (failure) return reject(failure);
        stream.once('error', reject);
        stream.end(() => resolve());
      });
    },
  };
}

export async function readNdjson(path) {
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  const out = [];
  for await (const line of lines) {
    if (line.trim()) out.push(JSON.parse(line));
  }
  return out;
}
