---
name: ai-dlc-compliance-check
description: Load only the AI-DLC harness guardrails relevant to the current vertical and lifecycle phase, for a project that isn't using Speckit, BMAD, or Kiro. Use when starting a project's governing principles, when planning or designing a feature, or before/after writing code for a regulated-industry project.
---

# AI-DLC Compliance Check (framework-agnostic)

This is the harness's loading protocol packaged as a standalone skill, for any coding
agent that doesn't have (or whose project doesn't use) a lifecycle framework with its
own hook/extension system. No hooks fire automatically here — **you invoke this
skill yourself**, at the point in your own workflow that matches one of the three
phases below. That's the whole difference from the Speckit/BMAD/Kiro adapters: same
algorithm, manual trigger instead of an automatic one.

If your project later adopts Speckit, BMAD, or Kiro, switch to that framework's
adapter under `../speckit/`, `../bmad/`, or `../kiro/` — this generic skill is the
floor every project can use, not a dead end.

## Step 1 — Load config, degrade gracefully if absent

Read `compliance-config.yml` at your project's root (or wherever your project keeps
config — there's no fixed convention here since there's no framework dictating one).
Same shape as every other adapter: `harness_path`, `vertical`, `block_on_binding`,
`enabled_phases`, `evidence_dir`. See `../compliance-config.yml` in this folder for
the template.

- Missing → ask the user for the harness path and vertical once, then offer to write
  the config file so you don't have to ask again next time.
- `harness_path` unresolvable → say so and stop; don't silently skip, since without
  automatic hooks there's no safety net catching a skipped check later.

## Step 2 — Determine the phase from what you're actually doing

There's no hook event to read it from, so state it plainly to yourself (or ask the
user if genuinely ambiguous):

| What you're doing | Phase |
|---|---|
| Writing or amending the project's governing principles / a new project's initial scope | `constitution` |
| Turning a feature idea into a technical design or architecture | `development` |
| Breaking a design into concrete implementation tasks | `development` (re-check) |
| About to write, or just finished writing, the actual code | `development` then `review` |
| Reviewing a diff/PR before merge | `review` |

## Step 3 — Query the index, not the guardrail content

Identical to every other adapter: load `<harness_path>/registry/guardrail-index.yaml`,
filter on `vertical == <configured vertical> OR "cross-cutting"` and
`lifecycle_phase == <resolved phase> OR "cross-cutting"`, intersect
`applicability_tags` against tags you derive from the actual task in front of you.
Surface the narrowed set if tags don't clearly discriminate further — never load every
guardrail file to decide relevance.

## Step 4 — Load only the matched guardrail files

Same as every other adapter — typically 1-4 files, never the whole vertical.

## Step 5 — Apply binding_tier

- **`binding`**: hard constraint. Stop and ask the user to resolve each blocking
  finding if `block_on_binding: true`.
- **`advisory`**: flagged note, never blocks.

## Step 6 — Record evidence

Append to `<evidence_dir>/<feature-or-project-slug>/guardrails-applied.md` (default
`evidence_dir`: `.ai-dlc-compliance/` at the project root — pick something that won't
collide with an existing tool's own convention).

## Step 7 — Report, then continue your actual work

Same report shape as the other adapters. Since nothing is enforcing that you ran this
check, say explicitly in your own output that you ran it and what you found — that's
the only audit trail a framework-less project gets beyond the evidence file itself.

## When to use this vs. nothing at all

If a team has zero appetite for even a manually-invoked skill, the harness still
degrades to pure documentation: point them at
`<harness_path>/verticals/<vertical>/INDEX.md` as a reviewed checklist. That's worse
than this skill (no agent automation at all) but still better than nothing, and it's
a real, intentional tier of the harness's design — see
`../../README.md` and `../../governance/DECISIONS.md`.
