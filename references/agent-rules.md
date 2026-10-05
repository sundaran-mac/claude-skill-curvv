# Rules block for every agent prompt

Subagents do not see the curvv skill or the user's `CLAUDE.md`. Copy this block into every
agent prompt. Fill each `<...>` from the repo's `CLAUDE.md`, `CONTRIBUTING.md` and memory.
Delete a line that does not apply. Add any project rule the agent must follow.

```text
RULES (follow all of them)

Where you work
- Repo: <repo path>. Branch: <branch>. Worktree: <worktree path>.
- Work only inside the worktree. Never touch the main working tree.

Phase
- This is the <PLAN | BUILD | CHECK> phase.
- PLAN: no edits, no commits, no pushes, no comments. Return the plan only.
- BUILD: code and run the checks. Stop before commit. If you must leave the plan, stop and report.
- CHECK: read-only. Return findings only.

Files you own
- You may edit only: <file list or folders>.
- Do not edit anything else. If another file must change, stop and report.

Git
- Never run git add, commit, merge, stash, reset or checkout unless this prompt says you are the
  one who commits.
- Never force push. Update a pushed branch the way the repo says: <merge | rebase>.

Tests and checks
- Run tests this way: <command, for example: npm run test -w <package>>.
- Run these checks before you report: <lint, typecheck, validator, ...>.
- Shared resources use a lock, so parallel agents wait in line. Example for a local database:
    until mkdir /tmp/<project>-db.lock 2>/dev/null; do sleep 15; done
    <run the db tests>
    rmdir /tmp/<project>-db.lock
- Database: use the local database only: <connection details without secret values>.
- Runtime version for checks that depend on it: <for example: npx -y -p node@<version>>.

Safety
- Never run cloud writes, deploys, or CI workflows. Never call a live endpoint that sends real
  messages or costs money.
- If you need a read-only fact from a cloud account, write a script for the user to run and stop.
- Never print, log or commit a secret value.
- If a permission check denies an action, stop and report. Do not try another way.

Writing
- Commit messages end with the attribution lines from the current system reminder.
- Follow the repo's writing rules: <for example: no em-dash characters>.
- Never write a count or a "this list is complete" claim you did not check.
- When you correct a claim, fix every copy of it.

Report
- Short, simple English, under about 50 lines.
- List: files changed, checks run with results, open questions as A/B with a small example.
```
