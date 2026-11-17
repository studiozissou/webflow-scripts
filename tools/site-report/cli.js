// Small helpers that let each site-report module run as a command and set its exit code.
import { pathToFileURL } from 'node:url';

export const say = (text) => process.stdout.write(`${text}\n`);
export const warn = (text) => process.stderr.write(`${text}\n`);

export function runIfMain(metaUrl, main) {
  if (!process.argv[1] || metaUrl !== pathToFileURL(process.argv[1]).href) return;
  Promise.resolve()
    .then(() => main(process.argv.slice(2)))
    .then(
      (code) => {
        process.exitCode = code;
      },
      (error) => {
        warn(error.message);
        process.exitCode = 2;
      },
    );
}
