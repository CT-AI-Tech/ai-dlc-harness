---
id: GR-ENG-ARCHBOUNDARY-001
title: Declared architecture/module boundaries must be enforced by tooling, not left to convention
vertical: cross-cutting
lifecycle_phase: development
binding_tier: binding
category: engineering
source: "Internal engineering standard, informed by observed agent behavior across AI-DLC teams (e.g. Lauren Tan, \"All Code Is Slop (Except Mine)\", AI Engineer Code Summit, Nov 2026)"
version: "1.0"
effective_date: 2026-11-23
supersedes: null
related_ids: [GR-ENG-NUANCE-001, GR-ENG-REPEATFIX-001]
applicability_tags: [architecture, code-generation, module-boundaries, static-analysis]
owner: engineering-leadership
last_reviewed: 2026-11-23
review_due: 2027-11-23
summary: >
  A layer/module boundary that exists only as a naming convention or a sentence in
  a doc gets crossed by agents the moment it's inconvenient — the boundary must be
  checkable by a dependency-graph rule or import lint, not something a reviewer has
  to notice by eye every time.
---

## Requirement

Projects often establish real architectural boundaries — a UI layer that must not
import backend-only code, a main/renderer process split in a desktop app, a
domain layer that must not depend on infrastructure — but express them only as
directory naming conventions or a line in a README. An agent generating code has
no way to "see" that boundary unless something actually fails when it's crossed;
a convention it was never told about, or was told about once in prose, is not a
constraint it reliably respects, especially under time/token pressure to make a
feature "just work."

## Agent Guidance

- **MUST**: If the project has a dependency-graph linter, an import-boundary rule
  (e.g. restricted imports, a module-boundary plugin), or an equivalent
  enforcement mechanism already configured, treat its failures as blocking —
  never route around a boundary violation by disabling the check or adding an
  exception without a human decision.
- **MUST NOT**: Add a cross-boundary import (e.g., UI importing a
  backend-internal module, one bounded context reaching into another's internals)
  even if it's the fastest way to make a feature work, when the project has
  declared that boundary — explicitly or via clear structural convention (e.g.
  two top-level directories whose names signal a hard split).
- **Flag for human review if**: a declared architectural boundary exists only as
  convention or documentation, with no enforcement tooling behind it —
  recommend adding one (most ecosystems have an import-boundary or
  dependency-graph lint plugin) rather than relying on every future agent and
  reviewer to notice violations by eye.

## Evidence to capture

- Which boundary was checked, whether enforcement tooling exists for it, and
  (if a violation was attempted) how it was resolved.
