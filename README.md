# curvv

**A lead-agent skill for Claude Code.** Say "curvv" and Claude stops doing big work alone. It
becomes a lead: it splits the work, runs subagents in parallel (each in its own git worktree and
branch), reviews their plans, asks you at the right moments, and reports one status table.

## Why

Large tasks in one Claude session run one thing at a time. Five stories means five slow rounds,
and one confused branch can mix all of them.

curvv gives you:

- **Parallel work.** One agent per story, issue or PR, all started together.
- **Clean isolation.** Every agent gets its own `git worktree` and branch. Your main working tree
  is never touched.
- **Plan before code.** Every agent plans first. The lead reviews the plans. You approve once.
- **You stay in control.** Nothing is committed, pushed, merged or posted without your yes.
- **One report.** A single status table per round: what is merged, pushed, or waiting, and for
  whom.

## Install

Claude Code loads personal skills from `~/.claude/skills/`.

```sh
git clone https://github.com/sundaran-mac/claude-skill-curvv.git ~/.claude/skills/curvv
```

To use it in one project only, clone it into that repo's `.claude/skills/curvv` instead.

Update later with:

```sh
git -C ~/.claude/skills/curvv pull
```

### Requirements

- [Claude Code](https://docs.claude.com/en/docs/claude-code) with the `Agent` tool.
- `git` 2.5 or newer (for `git worktree`).
- [`gh`](https://cli.github.com/), the GitHub CLI, logged in (for PRs and review threads).

## Use

Start a prompt with the trigger word, then the job:

```text
curvv: finish issues #41, #42 and #45
curvv: fix all the review comments on my open PRs
curvv: check my PRs and fix what is red
curvv: clean up merged worktrees
```

## How it works

```text
            you
             |
      Curvv (the lead)          reads repo rules, plans the split, asks you
      /      |       \
  agent A  agent B  agent C     one worktree + branch each, all in parallel
     |        |        |
   PR #1    PR #2    PR #3      shipped only after your yes
```

Every agent goes through the same phases:

| Phase | What happens |
|---|---|
| 1. Plan | The agent reads the task and writes a plan. No edits. |
| 2. Review | The lead checks every plan, then shows you all of them with any questions. |
| 3. Build | Each agent codes its approved plan and runs the checks. It stops before commit. |
| 4. Show | You see files, test results, commit message and PR text per PR. |
| 5. Ship | After your yes: commit, push, open the PR or post the review replies. |

### Three modes

The lead picks a mode for each unit of work and shows it in the plan. You can change it.

| Mode | When | Agents |
|---|---|---|
| **One agent** | Small work, one file, text fixes | 1 |
| **Team** | Medium work, or one app only | Builder, Tester, Docs, Reviewer on one worktree |
| **3-layer** | Large work across server and client with a shared contract | Senior (plan), Builders, Senior (check) |

In 3-layer mode the shared contract (API types, schema) is fixed first. Server and client are
then built against it in parallel, and a Senior checks the join before the PR. This cuts review
rounds.

## Safety rules

curvv is built to be safe on a real repo:

- No commit, push, merge or PR comment without your explicit yes. One yes covers one change.
- No force push. Pushed branches are updated, never rewritten.
- Two agents never edit the same file. Every prompt names who owns which files.
- Shared resources (a local database, a port) use a lock, so agents wait in line.
- No cloud writes, deploys or CI runs from agents. If a cloud fact is needed, you get a script
  to run yourself.
- Worktree cleanup removes only worktrees whose PR is merged, with a clean tree and nothing
  unpushed. Remote branches are never deleted.

## Fit it to your project

curvv reads your repo's `CLAUDE.md`, `CONTRIBUTING.md` and Claude's memory at the start of every
run. Put your project rules there: branch naming, merge or rebase, test commands, writing style.
The lead fills them into the rules block in
[`references/agent-rules.md`](references/agent-rules.md) and pastes it into every agent prompt.

## Cost

Parallel agents use more tokens than one session. A 3-layer run of 3 large stories is about
12 agents. The lead shows the agent count in the plan, so you can cut it before anything starts.
Small tasks are done by the lead alone.

## Files

| File | What it is |
|---|---|
| [`SKILL.md`](SKILL.md) | The skill Claude loads |
| [`references/agent-rules.md`](references/agent-rules.md) | The rules block for every agent prompt |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |

## License

[MIT](LICENSE)
