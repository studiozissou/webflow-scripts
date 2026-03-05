Audit `.claude/` configuration files for project convention compliance.

## Usage

Optional argument: a category (`agents/`, `commands/`, `skills/`) or a specific file path.
Defaults to auditing all agents, commands, and skills.

## Process

1. Determine scope from argument:
   - `agents/` → all `.claude/agents/*.md`
   - `commands/` → all `.claude/commands/*.md`
   - `skills/` → all `.claude/skills/*.md`
   - Specific path → just that file
   - No argument → all three categories

2. Delegate to the `convention-auditor` agent with the resolved scope.

3. Output the audit report table.

## Notes

- This auditor checks **project conventions** (YAML frontmatter + markdown).
- It does NOT enforce XML body format — that is a different convention used by taches-cc-resources.
- Do not run taches `/audit-skill` or `/audit-subagent` on project files — they enforce a different format.
