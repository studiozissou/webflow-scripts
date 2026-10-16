// Validates Oost Client First section files against the site CSS through the generic validator, with Oost's schemes from its launch config; runnable as a CLI.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  main as genericMain,
  parseCssClasses,
  parseHtml,
  validateAll as genericValidateAll,
  validateFiles as genericValidateFiles,
  validateSection as genericValidateSection,
} from '../webflow/validate-section.js';

export const SCHEMES = JSON.parse(
  readFileSync(new URL('../../projects/oost/launch.config.json', import.meta.url), 'utf8'),
).schemes;

export { parseCssClasses, parseHtml };

export function validateSection(html, css, options = {}) {
  return genericValidateSection(html, css, { ...options, schemes: options.schemes ?? SCHEMES });
}

export function validateFiles(cssPath, files) {
  return genericValidateFiles(cssPath, files, { schemes: SCHEMES });
}

export function validateAll(cssPath, dir) {
  return genericValidateAll(cssPath, dir, { schemes: SCHEMES });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = genericMain(process.argv.slice(2), {
    schemes: SCHEMES,
    usage: 'usage: validate-section.js <client-first.css> <section.html|dir …>\n',
  });
}
