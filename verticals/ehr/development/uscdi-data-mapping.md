---
id: GR-EHR-USCDI-001
title: Health data exchanged with an EHR must map to standard USCDI data classes, not ad hoc fields
vertical: ehr
lifecycle_phase: development
binding_tier: binding
source: "United States Core Data for Interoperability (USCDI) v3 baseline, per ONC HTI-1; US Core 6.1.0 FHIR profiles"
citation_url: https://www.healthit.gov/isa/united-states-core-data-interoperability-uscdi
version: "USCDI v3 (certification baseline, effective 2026-01-01); USCDI v6 approved for voluntary use from 2026-08-29"
effective_date: 2026-01-01
supersedes: null
related_ids: [GR-EHR-CERT-001, GR-EHR-SMART-001]
applicability_tags: [ehr-platform-feature, ehr-interoperability-app, fhir-data-exchange]
owner: quality-engineering
last_reviewed: 2026-11-02
review_due: 2027-11-02
summary: >
  Any data field read from or written to a certified EHR's API must map to a defined
  USCDI data class/element and its corresponding US Core FHIR profile — inventing a
  custom field for something USCDI already defines breaks interoperability and
  certification conformance.
---

## Requirement

USCDI defines the standardized set of health data classes and elements required for
nationwide interoperable exchange. ONC's HTI-1 rule set USCDI v3 (paired with US Core
6.1.0 FHIR profiles) as the certification baseline effective January 1, 2026; USCDI v6
(with US Core 9.0.0) was approved under the 2026 Standards Version Advancement Process
(SVAP) for voluntary adoption starting August 29, 2026, with updated ONC test tooling
expected by December 2026. FHIR R4 (v4.0.1) is the underlying base standard
(§ 170.215(a)(1)).

Building a custom data field or API response shape for something USCDI already
defines (e.g., a bespoke "allergy note" field instead of the standard AllergyIntolerance
data class) breaks conformance and interoperability with every other system in the
exchange network — this is a design-time decision, not a later data-migration task.

## Agent Guidance

- **MUST**: Before adding a new data field to an EHR-facing data model or API
  contract, check whether it maps to an existing USCDI data class/element and its
  US Core FHIR profile. Use the standard mapping, not a custom shape.
- **MUST**: Confirm which USCDI version the target EHR/environment actually supports
  (v3 baseline is universally required; v6 is voluntary and not all EHRs will support
  it yet) before depending on v6-only data classes.
- **MUST NOT**: Introduce a proprietary data representation for a concept USCDI
  already standardizes, even if it's "simpler for this one feature."
- **Flag for human review if**: a needed data element has no clear USCDI/US Core
  mapping — this may be a genuinely novel data need requiring a standards body
  conversation, not just an engineering workaround.

## Evidence to capture

- USCDI data class/element and US Core profile each new EHR-facing field maps to.
- Which USCDI version (v3 baseline vs. v6 voluntary) the integration targets, and why.
