# Agent rules for curvv runs

Every curvv agent reads this file first. The `curvv-*` agent files tell it to.

Two more inputs complete the rules:

1. **The project rules file**, `<repo>-wt/_handoff/project-rules.md`. The lead writes it once per
   round from the template at the end of this file, filled in from the repo's `CLAUDE.md`,
   `CONTRIBUTING.md` and memory. Agents that skip the repo `CLAUDE.md` (builder, scout) get the
   project's rules only from here, so the lead must not leave a blank that matters.
2. **The lead's prompt**: the worktree, branch and base, the handoff paths, the role and owned
   files, the permissions allowed for this run, and the attribution lines.

## General rules

Where you work
- Work ONLY in your worktree. Never edit or run git in the main repo folder.
- First: `git -C <wt> fetch -q origin`, then `git -C <wt> merge --ff-only origin/<branch>` if the
  branch is already pushed (a reviewer may have pushed). Then update from the base the way the
  project rules say (merge by default, never rebase a pushed branch). Resolve conflicts by keeping
  BOTH sides' intent; read both sides first.
- After updating: run the project's install and build steps.
- Never run `git stash`. The stash list is shared by every worktree of the repo, so one agent can
  pop another agent's work.

Files and git
- Edit only the files the plan gives to your role. If another file must change, stop and report.
- Unless the lead's prompt names you as the one who commits: never run `git add`, `commit`,
  `merge`, `reset` or `checkout`.
- Never force push. Plain `git push`. `git fetch` right before you push; if the base moved, update
  again and re-run the affected checks first.
- After any merge, run `git diff --name-only --diff-filter=U` and grep for `<<<<<<<` before you
  commit. Cutting git output short can hide a conflict marker.
- Use quoted heredocs (`<<'EOF'`), so the shell never runs backticked text inside them.

Permissions
- The lead's prompt says which of commit / push / open PR / PR replies are allowed for this run.
  For anything not named as allowed: do the work, then STOP before it and report the exact command
  you would run. Never merge; the lead merges.
- If a permission check denies an action, stop and report. Do not try another way.
- If a ruling only the user or a reviewer can make is needed, stop and report. Do not guess.

Safety
- Never run cloud writes, deploys, or CI workflows. Never call a live endpoint that sends real
  messages or costs money.
- If you need a read-only fact from a cloud account, write a script for the user to run and stop.
- Never print, log or commit a secret value.

Shared resources
- A local database, a port or a device emulator is shared by every agent. Take its lock first and
  wait in one command:
  `until mkdir /tmp/<project>-<resource>.lock 2>/dev/null; do sleep 15; done`
- Release it with a trap in the same command, so a failure still frees it:
  `trap 'rmdir /tmp/<project>-<resource>.lock' EXIT`
- Never run database migrations against a shared database outside the lock.

Plan before code
- Write your plan for yourself, then do an adversarial pass on it: what does it oblige that it
  does not say; which sentence is a count, a "complete list", or a claim about another system;
  does it contradict a sibling file; if a rule is stated, what is exempt. Then build. Keep to
  the plan.

Writing
- Commit messages and PR bodies end with the attribution lines the lead gives you.
- Never write a count or a "this list is complete" claim you did not check.
- When you correct a claim, find every copy of it (grep) and fix them all.
- Review replies: answer EVERY point in the review body and EVERY unresolved inline thread, each
  with the commit sha and evidence, or why it was not changed.

Screens
- For anything a person sees, passing tests is not "done". Run it (emulator, simulator or
  browser), compare it to the design by measuring, and report a check table. If you cannot run
  it, stop and report; never say a screen matches without the table.

## Handoff files

- Every agent starts with a fresh context. Nothing from the lead's chat or another agent's chat
  reaches you, except through the lead's prompt and the handoff files.
- The handoff folder is `<repo>-wt/_handoff/<unit-id or pr-N>/`, outside every worktree. It holds
  `plan.md` (planner), `report.md` (builder), `review.md` (reviewer) and `docs-report.md` (docs).
  Read what the lead names. Write your own file there, never into the worktree's git tree.
- Stacked branch: the lead names the parent's handoff folder. Read the parent's `plan.md` and
  `report.md`, and `git -C <wt> diff --stat origin/main...origin/<parent-branch>`.
- Your final message is short (the line limit in your agent file). The detail lives in your
  handoff file.

## Token discipline

Each tool call re-sends your whole context. A long, noisy context costs more on every later call,
and it hides the facts you need. So:

- **Find code with an index first** if the project rules name one (a code graph or symbol search
  tool). Query it; never rebuild a shared index, the lead does that. Use grep for exact-string
  sweeps.
- **Read once, read narrow**: `Read` with offset and limit, or one `sed -n` over several ranges.
  Do not re-read a file that has not changed. Read several small files in one command.
- **Quiet commands**:
  - installs with their quiet flags (for npm: `--no-audit --no-fund --loglevel=error`);
  - builds to a log file, printing only the tail on failure:
    `<build> > /tmp/build-$$.log 2>&1 || tail -60 /tmp/build-$$.log`;
  - tests with a compact reporter; on a failure, re-run only the failing file;
  - `git fetch -q`; for `gh`, use `--json <fields> --jq` (never a bare `gh pr view`), and
    `gh run view <id> --log-failed`;
  - lint and typecheck print only errors; pipe a long success output through `tail -5`.
- **Batch**: run independent read-only commands in one call or in parallel calls. Wait for a lock
  in one command (the `until mkdir` loop), never with many short checks.

## Final report

Short, simple English, within your agent file's line limit: what changed, commit sha, checks run
with pass counts, replies posted, and anything left for a human.

## Template: project-rules.md (the lead fills this in)

```text
PROJECT RULES (from CLAUDE.md, CONTRIBUTING.md and memory; follow all of them)

Repo
- Main repo: <absolute path>. Worktrees: <absolute path>-wt/. Handoff: <absolute path>-wt/_handoff/.
- Branch naming: <rule>. Update a pushed branch by: <merge | rebase>.
- Install and build after an update: <commands>.

Checks (all green before commit)
- Tests: <command per package, for example: npm run test -w <package>>.
- Lint, typecheck, validators: <commands>.
- Runtime version for checks that depend on it: <for example: npx -y -p node@<version>>.

Shared resources
- Database: local only, <host:port/db>, credentials from <where, never the value>. Lock: /tmp/<project>-db.lock.
- Other locks: <emulator, port, ...>.

Code index (optional)
- <tool and query command, or "none">.

Writing
- <for example: no em-dash characters; simple English>.

Never
- <project-specific don'ts: statuses only a bot writes, paid endpoints, cloud accounts, ...>.
```
