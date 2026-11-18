// Shared helpers for the cdn-build, cdn-verify and cdn-scan-site tools: fetch timeout, fetch error text, bounded concurrency and the run-as-script guard.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FETCH_TIMEOUT_MS = 15_000;

export function fetchProblem(err) {
  return err?.name === 'TimeoutError' ? 'timed out' : `fetch failed: ${err?.message ?? err}`;
}

export async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function runCli(metaUrl, main) {
  if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(metaUrl)) {
    main(process.argv.slice(2)).catch((err) => {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    });
  }
}
