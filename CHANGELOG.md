# Changelog

## 1.1.0 (2026-10-28)

Token efficiency: the right model for each job, and fresh agents per phase.

- Five agent types in `agents/`, each with its own model, effort, context limit and turn cap:
  `curvv-planner` (Opus), `curvv-reviewer` (Opus), `curvv-docs` (Opus, medium),
  `curvv-builder` (Sonnet, Opus only for hard work), `curvv-scout` (Haiku). They replace
  `general-purpose`, which ran every agent on the lead's model.
- One fresh agent per phase. Plan, build, review and fix pass work through handoff files
  (`plan.md`, `report.md`, `review.md`) instead of one agent growing through every phase.
- Workflow mode: `workflows/curvv-round.js` runs one stage of a round, so the lead wakes once
  per stage.
- `references/agent-rules.md` is now a file every agent reads, with token discipline (quiet
  commands, narrow reads, batching), lock release by trap, a no-`git stash` rule, conflict
  marker checks, and a `project-rules.md` template the lead fills in per round.
- Mode by weight: S (builder only), M (builder then reviewer), L (team), 3-layer.
- `scripts/token-report.py`: token use for one day, by lead and agent type.

## 1.0.0 (2026-10-05)

First public release.

- Lead-agent mode: split work, run subagents in parallel, one git worktree and branch each.
- Plan, review, build, show, ship phases, with the user's yes before every commit and push.
- Three modes: one agent, team (Builder, Tester, Docs, Reviewer), and 3-layer (Senior plus Builders).
- Review rounds: reply to every review body and inline thread.
- Safe worktree cleanup for merged PRs.
- Rules block template for agent prompts in `references/agent-rules.md`.
