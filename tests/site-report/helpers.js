// Shared paths and fixture loaders for the site-report tests.
import { existsSync, mkdtempSync, cpSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TOOLS = join(ROOT, 'tools', 'site-report');
export const FIXTURES = join(ROOT, 'tests', 'site-report', 'fixtures');
export const VENV_PYTHON = join(homedir(), '.venvs', 'site-report', 'bin', 'python');
export const PRIVATE_NAME = ['car', 'sa'].join('');
export const PRIVATE_REPORTS = join(ROOT, 'projects', PRIVATE_NAME, '.claude', 'reports');

export const tempDir = (prefix = 'site-report-') => mkdtempSync(join(tmpdir(), prefix));

export function copyFixture(name) {
  const projects = tempDir();
  cpSync(join(FIXTURES, name), join(projects, name), { recursive: true });
  return projects;
}

export const hasFile = (path) => existsSync(path);
