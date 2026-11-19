---
id: GR-MD-RISK-001
title: New failure modes introduced by generated code must feed back into the risk file
vertical: medical-devices
lifecycle_phase: development
binding_tier: binding
source: "ISO 14971:2019 - Application of risk management to medical devices"
citation_url: null
version: "2019"
effective_date: 2019-12-01
supersedes: null
related_ids: [GR-MD-CLASS-001, GR-MD-SDLC-001, GR-MD-CYBER-001]
applicability_tags: [software-as-medical-device, embedded-device-software, connected-device]
owner: quality-engineering
last_reviewed: 2026-01-15
review_due: 2027-01-15
summary: >
  Risk management under ISO 14971 is a living file, not a one-time exercise — if
  generated code introduces a new failure mode (new dependency, new network call, new
  concurrency path) the risk analysis must be updated, not just the code.
---

## Requirement

ISO 14971 requires a documented risk management process covering the full product
lifecycle: hazard identification, risk estimation, risk control, and verification that
controls are effective — updated whenever the design changes in a way that could
introduce a new hazard or change an existing risk estimate.

## Agent Guidance

- **MUST**: When generating code that adds a new external dependency, new network call,
  new concurrency/timing behavior, or new failure path (e.g., a new retry loop, a new
  fallback path, a new third-party API call), note this as a candidate risk-file update
  and surface it rather than silently merging it.
- **MUST NOT**: Treat risk management as a one-time, pre-development checklist item.
  Every task that changes behavior in a safety-relevant component is a potential risk-file
  trigger.
- **Flag for human review if**: a generated change removes or weakens an existing risk
  control (e.g., removes a bounds check, changes a timeout, changes an alarm threshold)
  — these require risk owner sign-off before merge, not just test coverage.

## Evidence to capture

- List of new failure modes/dependencies introduced by the change.
- Confirmation the risk file owner was notified, for anything touching an existing
  risk control.
