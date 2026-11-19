---
id: GR-EHR-CERT-001
title: Whether the product touches certified Health IT functionality must be settled before spec work starts
vertical: ehr
lifecycle_phase: constitution
binding_tier: binding
source: "ONC Health IT Certification Program, 45 CFR Part 170"
citation_url: https://www.healthit.gov/topic/certification-ehrs/certification-health-it
version: "HTI-1 Final Rule baseline (effective dates phased through 2026)"
effective_date: 2024-01-09
supersedes: null
related_ids: [GR-EHR-INFOBLOCK-001, GR-EHR-USCDI-001, GR-EHR-TEST-001]
applicability_tags: [ehr-platform-feature, ehr-interoperability-app, certified-health-it]
owner: regulatory-affairs
last_reviewed: 2026-11-02
review_due: 2027-11-02
summary: >
  Before any feature spec is written, determine whether the product (or the specific
  feature) is or touches "certified health IT" under 45 CFR Part 170 — this gates
  whether ONC certification criteria, testing, and attestation obligations apply, and
  every other EHR guardrail in this vertical depends on that answer.
---

## Requirement

The ONC Health IT Certification Program (45 CFR Part 170) certifies "health IT modules"
against specific certification criteria (e.g., API access, clinical decision support,
data export). Two shapes of product in this vertical hit this question differently:

- **Platform shape** (e.g., contributing features to a certified EHR like Greenway):
  a new or changed feature may itself need to pass certification testing, or may
  change the EHR's certified status if it touches certified functionality (API
  behavior, USCDI data classes exposed, clinical decision support interventions).
- **Interoperability shape** (e.g., a supporting application that connects to an EHR,
  like a DaVita-style care-coordination app): the application itself is not usually
  "certified health IT," but it consumes a certified EHR's API and must not be built
  as if it were unregulated — and if the application itself starts performing
  functions a certification criterion covers (e.g., clinical decision support,
  data export), it can become in-scope.

**This determination cannot be made by an agent.** Like SaMD classification in the
medical-devices vertical, it is a regulatory determination a qualified person
(regulatory affairs / health IT compliance) must make and record before feature specs
are written.

## Agent Guidance

- **MUST**: Before generating a spec/constitution document for a new EHR-related
  feature, check whether a recorded certification-scope determination exists for the
  product/feature (expected location: `docs/regulatory/onc-certification-scope.md` in
  the target repo, or equivalent project record).
- **MUST NOT**: Infer or assign certification scope itself, even provisionally, and
  must not proceed to generate implementation-level specs for a feature that touches
  API access, data export, clinical decision support, or USCDI data exposure without
  that record.
- **Flag for human review if**: the feature description contains signals of API
  behavior changes, new data exposed via API, clinical decision support, or e-prescribing,
  and no certification-scope record is found. Stop and surface this to the user/
  regulatory owner rather than guessing.

## Evidence to capture

- Link or path to the recorded certification-scope determination.
- Which shape the product/feature is (platform vs. interoperability), and whether
  certified functionality is touched.
