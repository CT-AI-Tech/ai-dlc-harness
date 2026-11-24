---
id: GR-ENG-REPEATFIX-001
title: A correction given more than once should become an enforced check, not another line of guidance
vertical: cross-cutting
lifecycle_phase: review
binding_tier: advisory
category: engineering
source: "Internal engineering standard, informed by observed agent behavior across AI-DLC teams (e.g. Lauren Tan, \"All Code Is Slop (Except Mine)\", AI Engineer Code Summit, Nov 2026)"
version: "1.0"
effective_date: 2026-11-23
supersedes: null
related_ids: [GR-ENG-COMMENT-001, GR-ENG-ARCHBOUNDARY-001]
applicability_tags: [code-review, process, lint-rules, agent-behavior]
owner: engineering-leadership
last_reviewed: 2026-11-23
review_due: 2027-11-23
summary: >
  Every repeated correction is a signal that something should move from prose
  (a rule, a comment, a reviewer note) into an enforceable check — a lint rule, a
  type, a test — because prose is reproduced inconsistently and code is checked
  every time.
---

## Requirement

The highest-leverage moment in a review cycle is not fixing the mistake in front
of you — it's noticing that this is the *second* (or third) time the same category
of mistake has been corrected for this project. The first time, a note in review
feedback or a line added to project guidance is a reasonable response. The second
time, that's evidence the guidance alone isn't working, and the fix belongs in
something deterministic: a lint rule, a type constraint, a test, or an
architectural change that makes the mistake impossible rather than merely
discouraged.

## Agent Guidance

- **MUST**: When reviewing a change (or reflecting on a feature's development
  history), check whether a finding you're about to report as a one-off has
  already been reported for this project before.
- **MUST**: If a correction is recurring, report it with a recommendation to
  convert it into an enforceable check (name the specific mechanism if one is
  obvious — a lint rule, a type, a test) rather than only restating the
  guidance again.
- **MUST NOT**: Treat "we already told the agent about this in a rule file"
  as sufficient once it has recurred — prose guidance that keeps needing
  repeating has already demonstrated it's not working.

## Evidence to capture

- The recurring correction, how many times it has appeared, and the recommended
  deterministic check (or, once implemented, a reference to it) that would
  prevent it from needing to be corrected again.
