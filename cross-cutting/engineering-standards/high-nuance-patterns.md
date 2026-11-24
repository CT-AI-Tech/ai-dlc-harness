---
id: GR-ENG-NUANCE-001
title: Patterns that require deep framework-specific nuance must be avoided or wrapped, not used ad hoc
vertical: cross-cutting
lifecycle_phase: development
binding_tier: advisory
category: engineering
source: "Internal engineering standard, informed by observed agent behavior across AI-DLC teams (e.g. Lauren Tan, \"All Code Is Slop (Except Mine)\", AI Engineer Code Summit, Nov 2026)"
version: "1.0"
effective_date: 2026-11-23
supersedes: null
related_ids: [GR-ENG-ARCHBOUNDARY-001]
applicability_tags: [code-generation, architecture, framework-usage]
owner: engineering-leadership
last_reviewed: 2026-11-23
review_due: 2027-11-23
summary: >
  Some framework APIs are easy to call but hard to use correctly (manual effect/
  lifecycle hooks, raw timers, manual resource management) — agents reach for them
  readily but misuse them reliably. Ban or wrap them, don't rely on ad hoc use.
---

## Requirement

Every framework has a handful of APIs that are easy to call but require deep,
accumulated judgment to use *correctly* — manual effect/lifecycle hooks, raw
timer-based polling (`setTimeout`/`setInterval`/busy-wait loops), manual
resource/lifecycle management in a garbage-collected or reference-counted
environment, and similar. An agent (like a junior engineer) will readily use these
APIs because they appear to solve the immediate problem, but without the project's
accumulated tribal knowledge of their failure modes, it reliably misuses them —
and once one instance exists in the codebase, it becomes the template every later
agent copies.

## Agent Guidance

- **MUST**: Before using an API or pattern known to require significant nuance to
  use correctly, check whether the project already bans it (a lint rule, a
  documented restriction, an internal wrapper that exists specifically to replace
  it) and use the project's sanctioned alternative instead.
- **MUST NOT**: Introduce a new instance of a known-high-nuance pattern into
  product/application code as a quick fix for an architecture mismatch (e.g.
  reaching for a raw timer because an event-driven alternative would require more
  restructuring) — that's the exact failure mode this guardrail exists to catch.
- **Flag for human review if**: solving the task cleanly seems to require a
  high-nuance pattern the project hasn't addressed yet (no ban, no wrapper) —
  recommend the project add one (a lint rule, an internal abstraction) rather than
  using the risky pattern directly and hoping it's used correctly this time.

## Evidence to capture

- Which high-nuance pattern was considered, whether a project-sanctioned
  alternative existed, and what was used instead.
