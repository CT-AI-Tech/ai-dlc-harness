---
id: GR-MD-TRACE-001
title: Merged code must be traceable back to a design-controlled requirement
vertical: medical-devices
lifecycle_phase: review
binding_tier: binding
source: "21 CFR 820.30 - Design controls"
citation_url: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-820/subpart-C/section-820.30
version: "current CFR"
effective_date: 1997-06-01
supersedes: null
related_ids: [GR-MD-SDLC-001, GR-MD-CLASS-001]
applicability_tags: [software-as-medical-device, design-controls, verification]
owner: quality-engineering
last_reviewed: 2026-01-15
review_due: 2027-01-15
summary: >
  At code-review time, every change touching a design-controlled component must trace
  to a recorded design input (requirement) and have corresponding verification evidence
  — untraceable changes are a design-control gap, not just a code-quality issue.
---

## Requirement

21 CFR 820.30 requires manufacturers to establish and maintain procedures for design
controls, including traceability between design inputs (requirements), design outputs
(implementation), and verification/validation activity. For software, this typically
means every merged change to a controlled component must map to a requirement and be
covered by a verification test.

## Agent Guidance

- **MUST**: At review/verification time, check that the change under review references
  a requirement/spec item id and that a corresponding test exists. Treat a missing link
  as a blocking finding, not a style note.
- **MUST NOT**: Approve a design-controlled component's change based on test coverage
  alone, without a requirement trace — coverage demonstrates the code was exercised, not
  that it was traced to an approved requirement.
- **Flag for human review if**: the change modifies behavior with no corresponding
  requirement update (possible scope creep / undocumented requirement change) or the
  requirement it claims to satisfy doesn't match the actual behavior implemented.

## Evidence to capture

- Requirement/spec id the change traces to.
- Verification test(s) covering the change.
- Any discrepancy between claimed and actual requirement coverage, surfaced explicitly.
