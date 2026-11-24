---
id: GR-HIPAA-PRIV-001
title: Only request/expose the minimum necessary PHI for the stated purpose
vertical: cross-cutting
lifecycle_phase: cross-cutting
binding_tier: binding
source: "HIPAA Privacy Rule, 45 CFR 164.502(b) - Minimum Necessary Standard; also see the 2026 Privacy Rule final rule on coordinated care/patient access (below)"
citation_url: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.502
version: "current CFR, as amended by 'HIPAA Privacy Rule: Changes to Support Coordinated Care and Individual Engagement and Reduce Regulatory Burdens' (finalized Nov 2026)"
effective_date: 2003-04-14
supersedes: null
related_ids: [GR-HIPAA-SEC-001, GR-GEN-DEID-001]
applicability_tags: [phi, patient-data, api-design, data-export]
owner: privacy-office
last_reviewed: 2026-11-24
review_due: 2027-05-24
summary: >
  API responses, exports, UI views, and logs touching PHI must expose only the fields
  needed for the specific use case — "return the whole patient record because it's
  convenient" is a minimum-necessary violation, not a design shortcut.
---

## Requirement

The Minimum Necessary Standard requires covered entities to limit PHI use, disclosure,
and requests to the minimum necessary to accomplish the intended purpose — this applies
per use case/role, not as a one-time blanket policy.

**Relevant 2026 update**: HHS finalized a separate Privacy Rule change in November 2026
("Changes to Support Coordinated Care and Individual Engagement and Reduce Regulatory
Burdens," completing a proposal first issued in January 2021) focused on the *patient
right of access* side of the Privacy Rule, not minimum necessary directly — it shortens
the access-request response deadline, limits permissible fees, updates Notice of
Privacy Practices content, restricts unreasonable identity-verification barriers to
access, and encourages API-based direct patient access to ePHI. This cuts the other
direction from minimum-necessary (it's about giving patients *more* access to their
*own* data, not scoping third-party/internal use) — a feature built for patient-facing
access should be checked against this rule's new deadlines/fee limits, while
minimum-necessary scoping below still governs every other (non-patient-self) access
path. Confirm the rule's effective date and exact provisions at
https://www.hhs.gov/hipaa/for-professionals/privacy/2026-privacy-final-rule/index.html
before relying on specifics, since this guardrail was last reviewed shortly after the
rule's release.

## Agent Guidance

- **MUST**: When designing an API response, export, report, or UI view that includes
  PHI, scope the fields to what that specific feature/role needs, not the full patient
  record "for convenience" or to save a future round-trip.
- **MUST NOT**: Add broad/wildcard field selection (`SELECT *`, full-object serialization)
  to an endpoint that only needs a subset of PHI fields.
- **Flag for human review if**: a feature request asks for patient data access broader
  than the described use case (e.g., a billing feature requesting full clinical notes),
  or the feature is a *patient's own* access request (patient portal, data export to
  the patient) — minimum-necessary does not limit a patient's access to their own
  record, and the 2026 Privacy Rule update adds specific response-time/fee limits that
  apply there instead; don't apply minimum-necessary scoping logic to a patient
  requesting their own data.

## Evidence to capture

- Field-level scope of PHI exposed by the new/changed endpoint, view, or export, and
  the use case it maps to.
