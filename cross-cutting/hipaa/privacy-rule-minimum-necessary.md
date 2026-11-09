---
id: GR-HIPAA-PRIV-001
title: Only request/expose the minimum necessary PHI for the stated purpose
vertical: cross-cutting
lifecycle_phase: cross-cutting
binding_tier: binding
source: "HIPAA Privacy Rule, 45 CFR 164.502(b) - Minimum Necessary Standard"
citation_url: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.502
version: "current CFR"
effective_date: 2003-04-14
supersedes: null
related_ids: [GR-HIPAA-SEC-001, GR-GEN-DEID-001]
applicability_tags: [phi, patient-data, api-design, data-export]
owner: privacy-office
last_reviewed: 2026-01-15
review_due: 2027-01-15
summary: >
  API responses, exports, UI views, and logs touching PHI must expose only the fields
  needed for the specific use case — "return the whole patient record because it's
  convenient" is a minimum-necessary violation, not a design shortcut.
---

## Requirement

The Minimum Necessary Standard requires covered entities to limit PHI use, disclosure,
and requests to the minimum necessary to accomplish the intended purpose — this applies
per use case/role, not as a one-time blanket policy.

## Agent Guidance

- **MUST**: When designing an API response, export, report, or UI view that includes
  PHI, scope the fields to what that specific feature/role needs, not the full patient
  record "for convenience" or to save a future round-trip.
- **MUST NOT**: Add broad/wildcard field selection (`SELECT *`, full-object serialization)
  to an endpoint that only needs a subset of PHI fields.
- **Flag for human review if**: a feature request asks for patient data access broader
  than the described use case (e.g., a billing feature requesting full clinical notes).

## Evidence to capture

- Field-level scope of PHI exposed by the new/changed endpoint, view, or export, and
  the use case it maps to.
