---
id: GR-ENG-DEPRECATED-001
title: New code must not copy a deprecated or legacy pattern just because it's already in the codebase
vertical: cross-cutting
lifecycle_phase: development
binding_tier: advisory
category: engineering
source: "Internal engineering standard, informed by observed agent behavior across AI-DLC teams (e.g. Lauren Tan, \"All Code Is Slop (Except Mine)\", AI Engineer Code Summit, Nov 2026)"
version: "1.0"
effective_date: 2026-11-23
supersedes: null
related_ids: [GR-ENG-NUANCE-001]
applicability_tags: [code-generation, technical-debt, legacy-code, architecture]
owner: engineering-leadership
last_reviewed: 2026-11-23
review_due: 2027-11-23
summary: >
  An agent pattern-matches on what's already in the codebase — a deprecated API or
  legacy convention keeps getting copied into new code unless the agent is told
  which parts of the codebase are current and which are legacy.
---

## Requirement

Agents generate code that statistically resembles their input, and the codebase
is the largest input they have. A deprecated API still used in 40% of the
codebase, a legacy auth pattern mid-migration, or an old error-handling
convention nobody has fully removed will all look like the "established pattern"
to an agent with no other signal — and the agent will copy it into new code,
actively working against whatever migration is already underway, making the
eventual cleanup larger rather than smaller.

## Agent Guidance

- **MUST**: Before following an existing pattern in the codebase, check for any
  signal that it's deprecated or mid-migration (a deprecation comment, a
  MIGRATION.md or ADR describing the move away from it, a clearly-marked legacy
  directory, a newer parallel implementation) and use the current recommended
  pattern instead, even if more of the codebase still uses the old one.
- **MUST NOT**: Justify using a deprecated pattern with "that's what the rest of
  the codebase does" when a documented replacement exists — consistency with
  legacy code is not a reason to extend it.
- **Flag for human review if**: it's unclear whether an existing pattern is
  current or legacy (no documentation either way, and it appears inconsistently)
  — don't guess silently in either direction; surface the ambiguity.

## Evidence to capture

- Which pattern was considered, whether it was found to be deprecated/legacy, and
  which pattern was actually used.
