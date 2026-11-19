# Loading protocol (for agents and skills, not humans)

This is the only file an agent/skill needs to understand how to consume the harness.
Read this once per session; don't re-read guardrail content you've already loaded for
the same vertical+phase in this session.

## Step 1 — Determine context (cheap, no files loaded yet)

From the current task, determine:

- `vertical`: which folder under `verticals/` applies (e.g., `medical-devices`).
  If unknown or ambiguous, ask rather than guessing — loading the wrong vertical's
  guardrails is worse than asking.
- `lifecycle_phase`: `constitution` (writing/updating a spec or Speckit constitution),
  `development` (generating code/tests for a task), or `review` (reviewing/verifying a
  change).
- `tags`: a handful of free-text tags describing the task (e.g., `connected-device`,
  `phi`, `research`). Err toward more tags, not fewer — this only affects which rows
  match in step 2, not what gets loaded.

## Step 2 — Query the index, not the content

Load `registry/guardrail-index.yaml` (small, flat, cheap — this is the entire point of
the index) and filter:

1. `vertical == <vertical>` OR `vertical == "cross-cutting"`
2. `lifecycle_phase == <lifecycle_phase>` OR `lifecycle_phase == "cross-cutting"`
3. Any overlap between the entry's `applicability_tags` and the task's `tags`

If step 3 yields zero matches but step 1+2 yields a small set (a few, under ~10), load
them anyway and let the `summary` field decide — summaries are written to be judged
without opening the file.

## Step 3 — Load only the matched guardrail files

Open only the `path` values that survived step 2. This is the only point where full
guardrail prose enters context. For a typical task this should be 1-4 files, not the
whole vertical.

## Step 4 — Apply binding_tier

- `binding`: treat as a hard constraint. If the task conflicts with a binding guardrail,
  stop and surface the conflict — do not route around it.
- `advisory`: follow it, but if it doesn't fit, note the deviation and continue; it's a
  flag, not a blocker.

## Step 5 — Relationships (only if a relational question comes up)

Most tasks never need this step. Only consult `registry/relationships.yaml` when the
task genuinely requires reasoning across guardrails — e.g., "does satisfying guardrail A
create a conflict with guardrail B" (see the `conflicts_with` edge type). This is a flat
file today; if your task regularly needs multi-hop traversal (A depends on B depends on
C depends on D), that's the signal to actually build the graph DB — see
`governance/DECISIONS.md`.

## Step 6 — Record evidence

Each guardrail file has an "Evidence to capture" section. When a guardrail materially
shaped a decision (blocked something, changed an approach), note what evidence was
captured and where — this is what makes the audit trail real instead of aspirational.

## What NOT to do

- Don't load every guardrail file "just in case." The index exists so you don't have to.
- Don't load `README.md`, `governance/*`, or `schema/*` at task time — those are for
  humans maintaining the harness, not for runtime guardrail lookup.
- Don't treat an `advisory` guardrail as `binding` or vice versa — the distinction is
  deliberate and encoded for a reason.
