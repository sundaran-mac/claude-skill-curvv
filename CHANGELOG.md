# Changelog

## 1.0.0 (2026-10-05)

First public release.

- Lead-agent mode: split work, run subagents in parallel, one git worktree and branch each.
- Plan, review, build, show, ship phases, with the user's yes before every commit and push.
- Three modes: one agent, team (Builder, Tester, Docs, Reviewer), and 3-layer (Senior plus Builders).
- Review rounds: reply to every review body and inline thread.
- Safe worktree cleanup for merged PRs.
- Rules block template for agent prompts in `references/agent-rules.md`.
