---
id: GR-ENG-TESTHONESTY-001
title: A test-passing claim must be backed by an observed test execution, never by code review alone
vertical: cross-cutting
lifecycle_phase: review
binding_tier: binding
category: engineering
source: "Internal engineering standard — same principle this harness's own test-results.json schema (Step 6b) enforces; informed by observed agent behavior across AI-DLC teams"
version: "1.0"
effective_date: 2026-11-23
supersedes: null
related_ids: [GR-ENG-REPEATFIX-001]
applicability_tags: [testing, verification, code-review, agent-behavior]
owner: engineering-leadership
last_reviewed: 2026-11-23
review_due: 2027-11-23
summary: >
  "I read the code and it looks correct" is not the same claim as "a test ran and
  confirmed it" — an agent must never report the former as if it were the latter,
  since a verification signal that overclaims is worse than no signal at all.
---

## Requirement

A reviewer (human or agent) reading an implementation and judging it "looks
correct" is a real and useful signal, but it is a categorically different claim
from "an automated or manual test actually ran against this and passed." The two
get conflated constantly under pressure to report progress, and the conflation is
dangerous precisely because it's invisible in the output — both show up as
"passed" unless the distinction is made explicit. A status report that doesn't
distinguish them trains everyone downstream to stop trusting "passed" at all,
which defeats the entire point of recording verification status.

## Agent Guidance

- **MUST**: Report `passed`/`failed` only when a real test execution (an automated
  suite, an explicit manual verification someone reported to you) was directly
  observed to confirm or refute the behavior.
- **MUST NOT**: Infer a `passed` status from reading the implementation and judging
  it correct — use an explicitly weaker status (e.g. this harness's
  `not_verified`) and say so plainly, rather than rounding up to "passed."
- **MUST NOT**: Carry forward a `passed` status from a previous run without
  re-confirming it still holds, if the relevant code has changed since.
- **Flag for human review if**: a scenario or requirement has no test coverage at
  all and the only available signal is code reading — that gap is itself worth
  surfacing, not quietly filled in with an optimistic status.

## Evidence to capture

- For each verification claim: what was actually observed (a test run's output, a
  manual confirmation, or only a code read), and the honestly-corresponding status.
