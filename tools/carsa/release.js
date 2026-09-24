// Copies a tagged Carsa release (projects/carsa at git tag carsa-vX.Y.Z) into an immutable webflow/releases/vX.Y.Z/ folder in a carsa-website-support checkout.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RELEASE_FILES = ['init.js', 'global.js', 'check-finance.js', 'vdp.js', 'battery-animation.js', 'at-price-total.js'];

const VERSION_RE = /^v\d+\.\d+\.\d+$/;
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function tagFor(version) {
  return `carsa-${version}`;
}

export function gitReader(tag, file) {
  return execFileSync('git', ['show', `${tag}:projects/carsa/${file}`], { cwd: REPO_ROOT, encoding: 'utf8' });
}

export function buildRelease({ version, carsaRepo, readFromTag = gitReader }) {
  if (!VERSION_RE.test(version || '')) throw new Error(`Invalid version "${version}": use vMAJOR.MINOR.PATCH`);
  if (!existsSync(join(carsaRepo, 'sst.config.ts'))) throw new Error(`carsa-website-support checkout not found at ${carsaRepo}`);

  const dir = join(carsaRepo, 'webflow', 'releases', version);
  if (existsSync(dir)) throw new Error(`${dir} already exists; releases are immutable, bump the version`);

  const tag = tagFor(version);
  const contents = RELEASE_FILES.map((file) => {
    try {
      return { file, body: readFromTag(tag, file) };
    } catch (err) {
      throw new Error(`Could not read ${file} from ${tag}: ${err.message}`);
    }
  });

  mkdirSync(dir, { recursive: true });
  const files = contents.map(({ file, body }) => {
    writeFileSync(join(dir, file), body);
    return { file, bytes: Buffer.byteLength(body), sha256: createHash('sha256').update(body).digest('hex') };
  });
  return { tag, dir, files };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [version, carsaRepo = `${process.env.HOME}/carsa-website-support`] = process.argv.slice(2);
  try {
    const { tag, dir, files } = buildRelease({ version, carsaRepo });
    process.stdout.write(`${tag} -> ${dir}\n`);
    for (const f of files) process.stdout.write(`  ${f.file}  ${f.bytes} B  sha256 ${f.sha256}\n`);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
}
