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
- **The right model for each job.** Opus plans and reviews, Sonnet builds, Haiku reads logs.
- **Plan before code.** Every agent plans first. The lead reviews the plans. You approve once.
- **You stay in control.** Nothing is committed, pushed, merged or posted without your yes.
- **One report.** A single status table per round: what is merged, pushed, or waiting, and for
  whom.

## Install

Claude Code loads personal skills from `~/.claude/skills/`.

```sh
git clone https://github.com/sundaran-mac/claude-skill-curvv.git ~/.claude/skills/curvv
mkdir -p ~/.claude/agents
cp ~/.claude/skills/curvv/agents/*.md ~/.claude/agents/
```

The second step matters. Claude Code loads agent types only from `~/.claude/agents/` (or a
project's `.claude/agents/`), not from a skill folder. Without the `curvv-*` agents, every
subagent runs on the lead's model and the model split does nothing.

To use workflow mode (below), also let the Workflow tool read the script's folder. In
`~/.claude/settings.json`, add the absolute path to `permissions.additionalDirectories`:

```json
{ "permissions": { "additionalDirectories": ["/Users/<you>/.claude/skills/curvv/workflows"] } }
```

Update later with:

```sh
git -C ~/.claude/skills/curvv pull
cp ~/.claude/skills/curvv/agents/*.md ~/.claude/agents/
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

Every unit goes through the same phases, and each phase is a **new** agent:

| Phase | Agent | What happens |
|---|---|---|
| 1. Plan | `curvv-planner` | Reads the task and writes `plan.md`. No edits. |
| 2. Review the plan | the lead | Checks every plan, then shows you all of them with any questions. |
| 3. Build | `curvv-builder` | Codes the approved plan, runs the checks, stops before commit. |
| 4. Review the code | `curvv-reviewer` | Read-only adversarial review. A new builder fixes the findings. |
| 5. Show | the lead | You see files, test results, commit message and PR text per PR. |
| 6. Ship | `curvv-builder` | After your yes: commit, push, open the PR or post the review replies. |

Agents pass work to each other through **handoff files** (`plan.md`, `report.md`, `review.md`)
in `<repo>-wt/_handoff/<unit>/`, not through chat. A fresh agent with a short brief costs far
fewer tokens than one long agent that carries every earlier phase in its context.

### The agents and their models

| Agent | Model, effort | Used for |
|---|---|---|
| `curvv-planner` | Opus, high | Plans, and the Senior plan in 3-layer mode |
| `curvv-reviewer` | Opus, high | Code review, the Senior check, reviewing a teammate's PR |
| `curvv-docs` | Opus, medium | Docs, specs, README, fixing every copy of a changed claim |
| `curvv-builder` | Sonnet, medium | Build, tests, review fixes, CI fixes, merge conflicts |
| `curvv-scout` | Haiku, low | Reading a CI log, PR state, threads, where code lives |

Judgment work (planning, review) gets Opus. Building from a reviewed plan gets Sonnet, and the
Opus reviewer checks it. The lead passes `model: "opus"` to a builder only for hard work:
concurrency, auth, crypto, security, privacy, or a migration with a backfill. To change a
model, edit the `model:` line in that agent's file.

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

### Workflow mode

For a round of 2 or more units, the lead can run each stage (`plan`, `build`, `ship`) as one
call to Claude Code's Workflow tool, with `workflows/curvv-round.js`. The agents run inside the
script, and the lead wakes once per stage instead of once per agent message. You still approve
between stages. The lead uses it only when you have opted in to workflows.

## Safety rules

curvv is built to be safe on a real repo:

- No commit, push, merge or PR comment without your explicit yes. One yes covers one change.
- No force push. Pushed branches are updated, never rewritten.
- Two agents never edit the same file. Every prompt names who owns which files.
- Shared resources (a local database, a port, an emulator) use a lock, so agents wait in line.
- Agents never run `git stash`: the stash list is shared by every worktree.
- No cloud writes, deploys or CI runs from agents. If a cloud fact is needed, you get a script
  to run yourself.
- Worktree cleanup removes only worktrees whose PR is merged, with a clean tree and nothing
  unpushed. Remote branches are never deleted.

## Fit it to your project

curvv reads your repo's `CLAUDE.md`, `CONTRIBUTING.md` and Claude's memory. Put your project
rules there: branch naming, merge or rebase, test commands, writing style. At the start of a
round the lead writes them into `<repo>-wt/_handoff/project-rules.md`, using the template at the
end of [`references/agent-rules.md`](references/agent-rules.md). Every agent reads the general
rules and that file first. The builder and scout skip `CLAUDE.md` to save tokens, so this file is
how they learn your rules.

## Cost

Parallel agents use more tokens than one session. A 3-layer run of 3 large stories is about
12 agents. The lead shows the agent count in the plan, so you can cut it before anything starts.
Small tasks are done by the lead alone.

What keeps the cost down:

- the model split above (only planning and review run on Opus by default);
- one fresh agent per phase, with handoff files, so no context grows for hundreds of calls;
- short workflow args (a one-line brief that points at a file);
- quiet commands and narrow reads in every agent (see "Token discipline" in the rules);
- a `curvv-scout` reads long logs and diffs, so the lead's context stays small.

To compare days, run this from the repo folder:

```sh
python3 -I ~/.claude/skills/curvv/scripts/token-report.py 2026-10-27
```

It prints API calls, context tokens re-read, and the split by lead and agent type.

## Files

| File | What it is |
|---|---|
| [`SKILL.md`](SKILL.md) | The skill Claude loads |
| [`references/agent-rules.md`](references/agent-rules.md) | The rules every agent reads, plus the project-rules template |
| [`agents/`](agents) | The five agent types; copy them to `~/.claude/agents/` |
| [`workflows/curvv-round.js`](workflows/curvv-round.js) | The workflow script for one stage of a round |
| [`scripts/token-report.py`](scripts/token-report.py) | Token use for one day, from the session logs |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |

## License

[MIT](LICENSE)
