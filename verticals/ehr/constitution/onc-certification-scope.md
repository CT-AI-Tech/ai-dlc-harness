---
id: GR-EHR-CERT-001
title: Whether the product touches certified Health IT functionality must be settled before spec work starts
vertical: ehr
lifecycle_phase: constitution
binding_tier: binding
source: "ONC Health IT Certification Program, 45 CFR Part 170, as narrowed by the HTI-5 Final Rule"
citation_url: https://www.healthit.gov/hti5
version: "HTI-1 Final Rule baseline, as amended by HTI-4 (e-prescribing/prior-auth/API criteria) and HTI-5 (final rule 2026-10-26, effective 2026-12-28/2027-01-01) — HTI-5 removed 14 of 60 certification criteria and revised 7, see 'Current certified-criteria landscape' below"
effective_date: 2024-01-09
supersedes: null
related_ids: [GR-EHR-INFOBLOCK-001, GR-EHR-USCDI-001, GR-EHR-TEST-001]
applicability_tags: [ehr-platform-feature, ehr-interoperability-app, certified-health-it]
owner: regulatory-affairs
last_reviewed: 2026-11-24
review_due: 2027-05-24
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

**This determination is meant to be made by a qualified person** (regulatory affairs /
health IT compliance), the same way SaMD classification is in the medical-devices
vertical. Where no such reviewer is available, the "Self-assessment default" below is
the best-effort substitute: an agent or engineering-led team can apply it directly, but
the record it produces should say plainly that it is a self-assessment, not
counsel-reviewed, so a later reviewer knows to re-check it rather than trust it as-is.

## Current certified-criteria landscape (update this when a newer HTI rule finalizes)

The set of criteria that count as "certified health IT functionality" has been
shrinking, not growing — check against the *current* list, not an assumption carried
over from an earlier rule:

- **HTI-4** (finalized 2024) added FHIR-based criteria for electronic prior
  authorization, real-time prescription benefit checks, and e-prescribing — these
  remain certified criteria today.
- **HTI-5** (final rule 2026-10-26, effective 2026-12-28, with some provisions
  effective 2027-01-01) removed 14 of the program's 60 certification criteria and
  revised 7 more, leaving 39 unchanged. Notably **removed**: Clinical Decision Support
  and Family Health History (confirm the full removed/revised list against the
  official HTI-5 criteria table at https://www.healthit.gov/hti5 before relying on
  this, since secondary sources only reported partial lists at the time this guardrail
  was last reviewed). HTI-5 also removed model-card and risk-management requirements
  that had applied to predictive decision support interventions.
- **Retained unchanged**: all privacy and security certification criteria, the Quality
  Management System (QMS) standards, accessibility-centered design requirements, and
  the HTI-4 criteria listed above (prior auth, real-time Rx benefit, e-prescribing,
  modular API).
- **Practical effect**: a feature that would have been certification-scope under the
  pre-HTI-5 rule (e.g., a clinical-decision-support feature) may no longer touch a
  certified criterion at all — but a feature touching API access, data export, or
  USCDI data exposure almost certainly still does, since those criteria weren't among
  the ones removed. Don't assume either way; check the current table.

## Self-assessment default (use when no regulatory-affairs reviewer is available)

Absent a retained regulatory affairs reviewer, record a determination using this
decision path, and label it explicitly as self-assessed:

1. **Does the product itself hold ONC certification**, or is it built on/modifying a
   codebase that does? Check the product's own compliance documentation and the CHPL
   (Certified Health IT Product List, https://chpl.healthit.gov) for an active listing
   matching the product and the version actually being shipped — a certification tied
   to an old release doesn't carry over to an unreleased fork or branch automatically.
2. **If yes**, does the feature touch one of the criteria the product is certified
   against (check the product's own CHPL listing for its specific certified criteria,
   not the full §170.315 list)? If yes → certification-scope; name the specific
   criterion in the spec and treat re-validation as a plan-level requirement, not an
   implementation detail.
3. **If the product is not itself certified** (e.g., an interoperability app
   consuming a certified EHR's API), does the feature itself perform a function a
   certification criterion covers — clinical decision support, data export, API access
   control, e-prescribing? If yes, the feature could become certification-scope even
   though the product isn't certified; this is the case most likely to be missed by a
   self-assessment, so err toward flagging it rather than concluding "not applicable."
4. **If no to both**, record "not certification-scope as of \<date>, self-assessed,
   re-check if the feature's purpose changes or a newer HTI rule finalizes" — don't
   record a permanent "not applicable."

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
- Whether the record is **self-assessed** (no regulatory-affairs reviewer) or
  **reviewer-confirmed** — carry this label forward; it tells a later reviewer how
  much weight to put on the record.
