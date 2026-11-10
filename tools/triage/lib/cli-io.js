// Shared I/O for the triage CLI and its command modules (snapshot-cli.js): UsageError (exit 2 with usage), JSON in from --in or stdin, JSON out on stdout, --now parsing, and the refusal every job-starting or world-writing command gives inside a build job. Kept apart from cli.js so command modules do not import cli.js back.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export class UsageError extends Error {}

export function readInput(args) {
  return readFileSync(args.in ? resolve(args.in) : 0, 'utf8');
}

export function readJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new UsageError(`${label} is not valid JSON: ${err.message}`);
  }
}

export function out(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

// --now as given, or the current time; an unparseable value is a usage error.
export function parseNow(args) {
  const now = args.now ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(now))) throw new UsageError(`--now is not a valid date: ${now}`);
  return now;
}

// True (after saying why) when running inside a triage build job; the caller exits 2.
export function refuseInBuildJob(command, env = process.env) {
  if (!env.TRIAGE_BUILD_JOB) return false;
  process.stderr.write(`${command}: not available inside a build job\n`);
  return true;
}
