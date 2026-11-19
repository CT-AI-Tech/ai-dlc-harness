---
name: ai-dlc-compliance-check
description: Load only the AI-DLC harness guardrails relevant to the current vertical and BMAD workflow phase, and surface binding/advisory findings. Invoked as an activation_steps_prepend/append entry from BMAD workflow overrides — use when invoked by name.
---

# AI-DLC Compliance Check (BMAD)

Invoked as a `skill:ai-dlc-compliance-check phase=<constitution|development|review>`
entry in a BMAD workflow's `activation_steps_prepend`/`activation_steps_append` or
`on_complete` (set via `_bmad/custom/<workflow>.toml` team overrides — see
`../../custom/` in this adapter for the ready-made override files). Loads guardrails
from the AI-DLC compliance harness — never the whole harness, only the handful of
entries matching this project's vertical and the current phase.

This mirrors `speckit.ai-dlc-compliance.check` in the Speckit adapter; read that one
first if you want the fuller inline commentary — this file only calls out what's
different for BMAD.

## Step 1 — Load config, degrade gracefully if absent

Read `_bmad/custom/ai-dlc-compliance/compliance-config.yml` (same shape as the
Speckit adapter's `compliance-config.yml`: `harness_path`, `vertical`,
`block_on_binding`, `enabled_phases`, `evidence_dir`).

- Missing → skip silently with a one-line note
  (`[ai-dlc-compliance] no compliance-config.yml found, skipping guardrail check`).
  Never fail the calling workflow.
- `harness_path` unresolvable → warn once, skip, never fail the calling workflow.

## Step 2 — Determine the phase from the invocation argument

Unlike Speckit's extension system (which names the firing hook event
automatically), BMAD's `activation_steps_prepend`/`append`/`on_complete` entries are
plain instruction strings resolved at the point they're written — so the phase is
passed explicitly as an argument on the `skill:` directive itself:

| Override file (in `_bmad/custom/`) | `phase=` argument | Harness phase |
|---|---|---|
| `bmad-product-brief.toml` | `constitution` | `constitution` |
| `bmad-architecture.toml` | `development` | `development` |
| `bmad-create-epics-and-stories.toml` | `development` | `development` (re-checked against concrete epics/stories) |
| `bmad-code-review.toml` | `review` | `review` |

If the resolved phase's `enabled_phases.<phase>` in the config is `false`, skip silently.

## Step 3 — Query the index, not the guardrail content

Identical to the Speckit adapter: load `<harness_path>/registry/guardrail-index.yaml`,
filter on `vertical == <configured vertical> OR "cross-cutting"` and
`lifecycle_phase == <resolved phase> OR "cross-cutting"`, then intersect
`applicability_tags` against tags derived from the artifact in front of you (the
product brief draft, the architecture spine, the epics/stories list, or the diff under
review). Surface the whole narrowed set if tags don't clearly discriminate further.

## Step 4 — Load only the matched guardrail files

Same as Speckit: open only the matched `path` values — typically 1-4 files.

## Step 5 — Apply binding_tier

- **`binding`**: hard constraint. If `block_on_binding: true`, stop and ask the user
  to resolve each blocking finding before the BMAD workflow's own output is treated as
  final — this is a `activation_steps_prepend` step, so it runs *before* the workflow's
  own greet/work begins, meaning a block here stops the workflow from starting its
  real work at all (stronger than a post-hoc warning).
- **`advisory`**: flagged note, never blocks.

## Step 6 — Record evidence

Same evidence shape as Speckit, written to
`<evidence_dir>/<feature-or-project-slug>/guardrails-applied.md` (default
`evidence_dir` for this adapter: `_bmad-output/compliance`, matching BMAD's own
`output_folder` convention rather than Speckit's `.specify/compliance`).

## Step 7 — Report

Same report shape as the Speckit adapter's Step 7. Since this often runs as an
`activation_steps_prepend` entry, print the report *before* the BMAD agent's own
greeting, so a blocking finding is the first thing the user sees — not buried after
the workflow has already started talking.

## Graceful degradation

Identical to the Speckit adapter: missing config, unresolvable `harness_path`, or an
unparsable `guardrail-index.yaml` all skip with a warning and never fail the calling
BMAD workflow for the adapter's own infrastructure problems.
