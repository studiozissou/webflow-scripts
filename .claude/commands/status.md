Show the current project status across all clients.

## Output the following

### Git status
Run `git status` and `git log --oneline -10` and summarise what's changed and what's been committed recently.

### Queue status
Read `.claude/queue.json` and show:
- Pending tasks (grouped by client)
- In-progress tasks
- Done tasks from the last 7 days

### Specs status
List all files in `.claude/specs/` with their status (Draft / Review / Approved).

### ADR log
List all files in `.claude/adrs/` with their title and status.

### Recent logs
Show the last 10 lines of `.claude/logs/sessions.log` if it exists.

Format everything as a clean markdown summary. Use tables where appropriate.
