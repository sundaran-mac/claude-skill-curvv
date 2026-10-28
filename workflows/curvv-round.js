export const meta = {
  name: 'curvv-round',
  description: 'Curvv round: plan, build+review, or ship many units in parallel with fresh curvv-* agents',
  whenToUse: 'Curvv or looper rounds with two or more independent stories or PRs. One stage per call: plan, build, or ship.',
  phases: [
    { title: 'Plan', detail: 'one curvv-planner per item, writes plan.md' },
    { title: 'Build', detail: 'curvv-builder (team roles for L) per item, then fresh curvv-reviewer, one fix round' },
    { title: 'Ship', detail: 'one curvv-builder per approved item: update branch, commit, push, PR or replies' },
  ],
}

// Called by curvv SKILL.md section 2b. args:
// {
//   stage: 'plan' | 'build' | 'ship',
//   permissions: 'commit, push, open PR, PR replies' (what the user allowed; anything else stops before),
//   attribution: '<commit trailer lines>\n---\n<PR body footer lines>',
//   items: [{
//     id: '<unit-id>' or 'pr-<n>', kind: 'story' | 'review-fix' | 'ci-fix' | 'conflict' | 'review-other',
//     mode: 'S' | 'M' | 'L', worktree, branch, base ('origin/main' or the parent branch for a stack),
//     handoff: '<repo>-wt/_handoff/<id>' (absolute), parentHandoff (stacked only),
//     pr (number, when one exists), hardBuild (true: concurrency, races, auth, crypto, security, privacy, backfill),
//     brief (short: what to do, the user's answers are in plan.md under "Answers"),
//     roles (L only, from the plan: [{ role: 'builder-server', owns: '<server app>/**, <db package>/**' }, ...]),
//   }]
// }
// Returns one short row per item. The detail stays in the handoff files.

const A = args || {}
const items = (A.items || []).filter(Boolean)
if (!items.length) return { error: 'no items' }
if (!['plan', 'build', 'ship'].includes(A.stage)) return { error: 'stage must be plan, build or ship' }

const common = (it) => [
  `Item: ${it.id} (${it.kind}, weight ${it.mode}).`,
  `Worktree: ${it.worktree}. Branch: ${it.branch}. Base: ${it.base || 'origin/main'}.${it.pr ? ` PR: #${it.pr}.` : ''}`,
  `Handoff folder: ${it.handoff}.${it.parentHandoff ? ` Stacked on a parent: read ${it.parentHandoff}/plan.md and report.md (agent-rules, "Handoff files").` : ''}`,
  `Brief: ${it.brief || 'see plan.md'}`,
].join('\n')

const permsLine = `Allowed for this run: ${A.permissions || 'nothing (stop before commit, push, PR and replies; report the exact commands)'}. Never merge.`
const attribution = A.attribution ? `Attribution lines (end every commit message and PR body with the right part):\n${A.attribution}` : ''

const PLAN = {
  type: 'object',
  properties: {
    planPath: { type: 'string' },
    mode: { type: 'string', enum: ['S', 'M', 'L', '3-layer'] },
    roles: { type: 'array', items: { type: 'object', properties: { role: { type: 'string' }, owns: { type: 'string' } }, required: ['role', 'owns'] } },
    questions: { type: 'array', items: { type: 'object', properties: { q: { type: 'string' }, recommended: { type: 'string' }, box: { type: 'string', enum: ['A', 'B', 'C'] } }, required: ['q', 'recommended', 'box'] } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['planPath', 'mode', 'questions', 'risks'],
}
const BUILD = {
  type: 'object',
  properties: {
    green: { type: 'boolean' },
    leftPlan: { type: 'boolean' },
    reportPath: { type: 'string' },
    checks: { type: 'string' },
    asks: { type: 'array', items: { type: 'string' } },
  },
  required: ['green', 'leftPlan', 'reportPath', 'checks', 'asks'],
}
const REVIEW = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['APPROVE', 'REQUEST_CHANGES'] },
    blockers: { type: 'array', items: { type: 'string' } },
    small: { type: 'array', items: { type: 'string' } },
    reviewPath: { type: 'string' },
    reviewedSha: { type: 'string' },
  },
  required: ['verdict', 'blockers', 'small', 'reviewPath', 'reviewedSha'],
}
const SHIP = {
  type: 'object',
  properties: {
    sha: { type: 'string' },
    pr: { type: 'string' },
    done: { type: 'array', items: { type: 'string' } },
    stoppedBefore: { type: 'array', items: { type: 'string' } },
    asks: { type: 'array', items: { type: 'string' } },
  },
  required: ['sha', 'done', 'stoppedBefore', 'asks'],
}

const builderModel = (it) => (it.hardBuild ? 'opus' : 'sonnet')

const planStage = (it) =>
  agent(
    `${common(it)}\n\nWrite the plan for this item to ${it.handoff}/plan.md, following your agent file. ` +
      `Suggest the mode (S, M, L or 3-layer) and, for L, the roles with the files each one owns.`,
    { label: `plan:${it.id}`, phase: 'Plan', agentType: 'curvv-planner', model: 'opus', effort: 'high', schema: PLAN },
  ).then((r) => r && { id: it.id, ...r })

const buildRole = (it, role, owns, extra) =>
  agent(
    `${common(it)}\nYour role: ${role}. You own only: ${owns}.\n${permsLine}\n` +
      `Build from ${it.handoff}/plan.md. Stop before commit (shipping is a later stage). ` +
      `Write ${it.handoff}/report${role === 'builder' ? '' : '-' + role}.md.${extra ? '\n' + extra : ''}`,
    { label: `${role}:${it.id}`, phase: 'Build', agentType: role === 'docs' ? 'curvv-docs' : 'curvv-builder', model: role === 'docs' ? 'opus' : builderModel(it), effort: 'medium', schema: BUILD },
  ).then((r) => r && { ...r, role })

const review = (it, since) =>
  agent(
    `${common(it)}\nReview the working-tree diff against ${it.base || 'origin/main'}` +
      `${since ? `, only the changes since ${since} plus whether each earlier finding in ${it.handoff}/review.md is fixed` : ''}. ` +
      `Read ${it.handoff}/plan.md and the report files first. Write ${it.handoff}/review.md.`,
    { label: `review:${it.id}`, phase: 'Build', agentType: 'curvv-reviewer', model: 'opus', effort: 'high', schema: REVIEW },
  )

async function buildStage(it) {
  // A teammate's PR: read-only review, nothing is built.
  if (it.kind === 'review-other') {
    const r = await review(it)
    return r && { id: it.id, review: r }
  }
  const roles =
    it.mode === 'L' && Array.isArray(it.roles) && it.roles.length
      ? it.roles
      : [{ role: 'builder', owns: 'every file the plan gives to the builder (code, tests, small docs edits)' }]
  const built = (await parallel(roles.map((r) => () => buildRole(it, r.role, r.owns)))).filter(Boolean)
  const row = { id: it.id, built: built.map(({ role, green, reportPath, checks, asks, leftPlan }) => ({ role, green, reportPath, checks, asks, leftPlan })) }
  if (built.length < roles.length) return { ...row, stopped: 'an agent failed to return' }
  if (built.some((b) => b.leftPlan)) return { ...row, stopped: 'left the plan; the lead must decide' }
  if (it.mode === 'S') return row // the lead checks an S diff itself

  let rv = await review(it)
  row.review = rv
  if (rv && rv.blockers.length) {
    // One fix round with a fresh builder, then one re-review of the delta.
    const fix = await buildRole(
      it,
      'builder',
      'the files named in the blockers',
      `Fix every blocker in ${it.handoff}/review.md (and the small points that are in your files). ` +
        `Write what you changed per finding at the end of ${it.handoff}/report.md.`,
    )
    row.fix = fix && { green: fix.green, checks: fix.checks, asks: fix.asks }
    rv = await review(it, rv.reviewedSha)
    row.review = rv
  }
  return row
}

const shipStage = (it) =>
  it.kind === 'review-other'
    ? Promise.resolve({ id: it.id, sha: '', done: [], stoppedBefore: ['posting the review: the lead posts it after the user's yes'], asks: [] })
    : agent(
    `${common(it)}\n${permsLine}\n${attribution}\n\n` +
      `Ship this approved change. Follow agent-rules: fetch, update from origin/main (or the parent branch for a stack) the way the project rules say if it moved, ` +
      `stop and report if the new commits touch your files, re-run the affected checks in quiet form, check for conflict markers, ` +
      `then do only the allowed steps: commit, plain git push, open the PR (base ${it.base && it.base !== 'origin/main' ? it.base.replace('origin/', '') : 'main'}), ` +
      `or post the replies drafted in ${it.handoff}/report.md. For a stack, run git log --oneline --no-merges origin/<base>..HEAD and confirm the count.`,
    { label: `ship:${it.id}`, phase: 'Ship', agentType: 'curvv-builder', model: builderModel(it), effort: 'medium', schema: SHIP },
  ).then((r) => r && { id: it.id, ...r })

const stage = { plan: planStage, build: buildStage, ship: shipStage }[A.stage]
phase(A.stage === 'plan' ? 'Plan' : A.stage === 'build' ? 'Build' : 'Ship')
log(`${A.stage}: ${items.length} item(s): ${items.map((i) => i.id).join(', ')}`)
const results = await pipeline(items, (it) => stage(it))
const missing = items.filter((_, i) => !results[i]).map((i) => i.id)
if (missing.length) log(`No result for: ${missing.join(', ')}`)
return { stage: A.stage, results: results.filter(Boolean), missing }
