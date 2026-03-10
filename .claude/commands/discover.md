Explore and map the codebase for a given client or the whole monorepo.

## Usage
Specify: `discover <client-slug>` or `discover all`

## For a single client
1. List all files in `projects/<client>/`
2. Read `orchestrator.js` and map: what modules are loaded, what Barba namespaces exist, what third-party libs are used
3. List all GSAP timelines and ScrollTrigger instances
4. List all Barba transitions and hooks
5. Identify shared utilities used from `shared/`
6. Note any TODOs, FIXMEs, or console.logs in the code

## For all clients — parallelisation gate

Reference the `parallelisation` skill. Present the gate:

| # | Stream | Agent type | Est. tokens | Est. wall time |
|---|--------|-----------|-------------|----------------|
| 1 | Client: ready-hit-play-prod | Explore | ~15k | ~15s |
| 2 | Client: studio-zissou | Explore | ~15k | ~15s |
| 3 | Client: carsa | Explore | ~15k | ~15s |

Sequential: ~45s / ~45k tokens. Parallel: ~20s / ~50k tokens (~3x faster, +1.1x cost).
All streams are read-only — low risk.

**Recommendation: Parallel** (independent directories, read-only, no contention).

If user approves parallel, spawn one Explore subagent per client directory. Each maps:
- Modules and file list
- GSAP/Barba instances
- Shared utility usage
- TODOs and FIXMEs

Merge results into a monorepo overview table after all subagents return.

## Output
Produce a codebase map as markdown. Save to `.claude/research/codebase-map-<YYYY-MM-DD>.md` if the user requests it.

| Client | Modules | Transitions | Dependencies | Last modified |
