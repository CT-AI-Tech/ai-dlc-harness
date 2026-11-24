---
id: GR-EHR-TEST-001
title: Merged EHR-facing API code must have conformance test evidence, not just unit test coverage
vertical: ehr
lifecycle_phase: review
binding_tier: binding
source: "ONC Health IT Certification Program conformance testing (Inferno test tool); 45 CFR Part 170 Subpart C"
citation_url: https://inferno.healthit.gov/
version: "current ONC-approved test procedures"
effective_date: 2020-05-01
supersedes: null
related_ids: [GR-EHR-CERT-001, GR-EHR-USCDI-001, GR-EHR-SMART-001]
applicability_tags: [ehr-platform-feature, ehr-interoperability-app, certified-health-it]
owner: quality-engineering
last_reviewed: 2026-11-24
review_due: 2027-05-24
summary: >
  At code-review time, any change to a certified API endpoint or a US Core profile
  mapping must show conformance test evidence (e.g., an Inferno test run), not just
  unit-test coverage — passing unit tests proves the code does what the developer
  intended, not that it's standards-conformant.
---

## Requirement

ONC's certification program uses standardized conformance test tools (notably
Inferno, ONC's open-source FHIR conformance testing tool) to verify that a certified
API actually implements US Core profiles, SMART App Launch, and USCDI data exposure
correctly — independent of whether the implementing team's own unit tests pass.
Certified health IT modules must maintain this conformance continuously, not just at
initial certification.

**The set of criteria requiring this evidence changed with HTI-5** (final rule
2026-10-26, effective 2026-12-28/2027-01-01): 14 of the program's 60 certification
criteria were removed and 7 revised (see `GR-EHR-CERT-001`'s "Current certified-criteria
landscape" for what's affected). A change to a capability whose certification criterion
was removed by HTI-5 may no longer need conformance-test evidence under this
guardrail — but API access, data export, USCDI/US Core data mapping, and SMART App
Launch were all retained, so this guardrail's core scope is unchanged for most
EHR-facing integration work. Check the current criteria table before concluding a
capability is now exempt.

## Agent Guidance

- **MUST**: At review/verification time, check that a change to an EHR-facing API
  endpoint or data mapping includes conformance test evidence (an Inferno run or
  equivalent ONC-recognized test), referenced in the PR/change record — not just that
  unit tests pass.
- **MUST NOT**: Approve a certified-API change based on unit test coverage alone,
  since unit tests typically validate the team's own expectations, not standards
  conformance against US Core/USCDI/SMART specifications.
- **Flag for human review if**: a change touches a certified capability (API access,
  data export, clinical decision support intervention) and no conformance test run is
  referenced, or a prior-passing conformance test now fails after the change.

## Evidence to capture

- Conformance test tool run (e.g., Inferno) and its result, linked to the specific
  change.
- Confirmation the change doesn't regress a previously-passing certification criterion.
