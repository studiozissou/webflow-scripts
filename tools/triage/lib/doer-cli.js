// `cli.js drafts targets [--in <threads.json>]`: prints the Slack DMs and threads the doer may draft a reply to (drafts.js draftTargets, last human message not Will's), with Will's user id passed in by cli.js from the control config only; refuses inside a build job.
import { UsageError, out, readInput, readJson, refuseInBuildJob } from './cli-io.js';
import { draftTargets } from './drafts.js';

export function run(args, { userId } = {}) {
  if (refuseInBuildJob('drafts')) return 2;
  const [, sub] = args.positional;
  if (sub !== 'targets') throw new UsageError(`unknown drafts subcommand: ${sub ?? '(none)'}`);
  if (!userId) throw new UsageError('drafts needs slack.digest.userId in .claude/triage/config.json');
  const input = readJson(readInput(args), 'input');
  const threads = Array.isArray(input) ? input : (input?.threads ?? []);
  out(draftTargets(threads, userId));
  return 0;
}
