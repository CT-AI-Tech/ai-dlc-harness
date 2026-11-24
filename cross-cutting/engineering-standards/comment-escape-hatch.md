---
id: GR-ENG-COMMENT-001
title: Code comments must not justify a workaround instead of fixing or flagging it
vertical: cross-cutting
lifecycle_phase: development
binding_tier: advisory
category: engineering
source: "Internal engineering standard, informed by observed agent behavior across AI-DLC teams (e.g. Lauren Tan, \"All Code Is Slop (Except Mine)\", AI Engineer Code Summit, Nov 2026)"
version: "1.0"
effective_date: 2026-11-23
supersedes: null
related_ids: [GR-ENG-REPEATFIX-001]
applicability_tags: [code-generation, code-review, comments, agent-behavior]
owner: engineering-leadership
last_reviewed: 2026-11-23
review_due: 2027-11-23
summary: >
  A comment explaining why a shortcut was "necessary" is a known failure mode in
  AI-generated code — it rationalizes not doing the right thing instead of fixing the
  root cause, and it's unenforceable, so nothing stops the next agent from copying it.
---

## Requirement

When an agent hits friction — an architecture mismatch, a missing abstraction, a
constraint it doesn't know how to satisfy cleanly — the easiest escape is to apply a
workaround and write a comment justifying it ("this is a temporary fix because X").
That comment does two things, both bad: it lets the agent avoid raising the real
problem to a human, and it becomes a template the next agent copies, since it now
looks like an established, sanctioned pattern in the codebase. Comments are also
unenforceable — nothing fails if the "temporary" fix outlives the comment's promise
that it would be revisited.

## Agent Guidance

- **MUST**: When a comment would need to explain *why* a non-obvious workaround is
  acceptable, treat that as a signal to either fix the underlying cause, or stop and
  flag the constraint to a human — not write the justification into the code.
- **MUST NOT**: Write a comment that argues a shortcut is fine, pre-empts a future
  reviewer's objection, or declares a one-off exception as a permanent rule for all
  future code without a human actually deciding that.
- **MUST NOT**: Treat a past correction recorded only in a comment or rule file as a
  hard constraint that can never be revisited — comments and prose rules are guidance,
  not a contract; only an enforced check (lint rule, type, test) is a hard constraint.
- **Flag for human review if**: the only way to make a change work is a workaround that
  needs explaining — that's exactly the signal that the architecture or API needs to
  change, not that it needs a good comment.

## Evidence to capture

- Where a workaround-justifying comment was found or would have been written, and
  what root-cause fix or human flag replaced it instead.
