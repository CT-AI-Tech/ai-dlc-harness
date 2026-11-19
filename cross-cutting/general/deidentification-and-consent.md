---
id: GR-GEN-DEID-001
title: Research/analytics use of patient data needs de-identification method and consent basis recorded
vertical: cross-cutting
lifecycle_phase: cross-cutting
binding_tier: binding
source: "HIPAA Privacy Rule De-Identification Standard, 45 CFR 164.514; Common Rule (45 CFR 46) for human-subjects research"
citation_url: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.514
version: "current CFR"
effective_date: 2003-04-14
supersedes: null
related_ids: [GR-HIPAA-PRIV-001]
applicability_tags: [research, analytics, deidentification, secondary-use]
owner: privacy-office
last_reviewed: 2026-01-15
review_due: 2027-01-15
summary: >
  Before building any analytics/research pipeline that consumes patient data, the
  de-identification method (Safe Harbor vs. Expert Determination) and the consent/
  authorization basis for that use must be recorded — an agent cannot choose this on
  its own.
---

## Requirement

Using PHI for research or analytics beyond direct treatment/payment/operations
generally requires either de-identification (Safe Harbor's 18-identifier removal, or
Expert Determination) or a valid authorization/consent/IRB waiver basis. Which applies
is a legal/privacy-office and, for human-subjects research, an IRB determination — not
an engineering choice.

## Agent Guidance

- **MUST**: Before generating a data pipeline, spec, or export for research/analytics
  use of patient data, check for a recorded de-identification method and consent/
  authorization basis for that specific use.
- **MUST NOT**: Implement its own de-identification logic (e.g., just dropping a "name"
  column) as if that satisfies Safe Harbor — Safe Harbor requires removing all 18
  specified identifier categories, and Expert Determination requires a qualified
  statistician's assessment, neither of which an agent can certify on its own.
- **Flag for human review if**: no recorded de-identification method/consent basis
  exists for a research or analytics feature touching patient data, or the feature
  seems to re-identify previously de-identified data (e.g., joining a de-identified
  dataset back to an identified one).

## Evidence to capture

- Recorded de-identification method (Safe Harbor / Expert Determination) and who
  certified it.
- Consent/authorization/IRB basis for the specific secondary use.
