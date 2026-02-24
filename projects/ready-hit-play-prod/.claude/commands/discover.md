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

## For all clients
Run the above for each project directory and produce a monorepo overview table:
| Client | Modules | Transitions | Dependencies | Last modified |

## Output
Produce a codebase map as markdown. Save to `.claude/research/codebase-map-<YYYY-MM-DD>.md` if the user requests it.
