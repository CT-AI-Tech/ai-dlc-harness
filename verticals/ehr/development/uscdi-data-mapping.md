---
id: GR-EHR-USCDI-001
title: Health data exchanged with an EHR must map to standard USCDI data classes, not ad hoc fields
vertical: ehr
lifecycle_phase: development
binding_tier: binding
source: "United States Core Data for Interoperability (USCDI) v3 baseline, per ONC HTI-1; US Core 6.1.0 FHIR profiles"
citation_url: https://www.healthit.gov/isa/united-states-core-data-interoperability-uscdi
version: "USCDI v3 (certification baseline, effective 2026-01-01, required); v6 voluntary from 2026-08-29; v7 is the current latest final version (released 2026-07-23, adds Adverse Events and Healthcare Information Attributes data classes); v8 draft expected January 2027"
effective_date: 2026-01-01
supersedes: null
related_ids: [GR-EHR-CERT-001, GR-EHR-SMART-001]
applicability_tags: [ehr-platform-feature, ehr-interoperability-app, fhir-data-exchange]
owner: quality-engineering
last_reviewed: 2026-11-24
review_due: 2027-05-24
summary: >
  Any data field read from or written to a certified EHR's API must map to a defined
  USCDI data class/element and its corresponding US Core FHIR profile — inventing a
  custom field for something USCDI already defines breaks interoperability and
  certification conformance.
---

## Requirement

USCDI defines the standardized set of health data classes and elements required for
nationwide interoperable exchange. ONC's HTI-1 rule set USCDI v3 (paired with US Core
6.1.0 FHIR profiles) as the certification baseline effective January 1, 2026 — this
remains the version every certified EHR must support. USCDI v6 (with US Core 9.0.0)
was approved under the 2026 Standards Version Advancement Process (SVAP) for voluntary
adoption starting August 29, 2026. ONC released **USCDI v7** on July 23, 2026, adding
two new data classes (Adverse Events, Healthcare Information Attributes); it is the
current latest final version but is newer still than what most certified EHRs have
adopted. A USCDI v8 draft is expected for comment in January 2027 (ONDEC was accepting
candidate data-element recommendations through September 28, 2026). FHIR R4 (v4.0.1)
is the underlying base standard (§ 170.215(a)(1)) across all these versions.

**Practical implication**: don't assume a target EHR supports anything past the v3
baseline. Confirm the actual supported version before depending on a v6/v7-only data
class or element — most production EHR integrations today should still be built,
primarily, against the v3-defined classes, with v6/v7 elements used only where the
specific target is confirmed to support them.

Building a custom data field or API response shape for something USCDI already
defines (e.g., a bespoke "allergy note" field instead of the standard AllergyIntolerance
data class) breaks conformance and interoperability with every other system in the
exchange network — this is a design-time decision, not a later data-migration task.

## Agent Guidance

- **MUST**: Before adding a new data field to an EHR-facing data model or API
  contract, check whether it maps to an existing USCDI data class/element and its
  US Core FHIR profile. Use the standard mapping, not a custom shape.
- **MUST**: Confirm which USCDI version the target EHR/environment actually supports
  (v3 baseline is universally required; v6 and v7 are voluntary/newer and not all EHRs
  will support them yet) before depending on a v6- or v7-only data class.
- **MUST NOT**: Introduce a proprietary data representation for a concept USCDI
  already standardizes, even if it's "simpler for this one feature."
- **Flag for human review if**: a needed data element has no clear USCDI/US Core
  mapping — this may be a genuinely novel data need requiring a standards body
  conversation, not just an engineering workaround.

## Evidence to capture

- USCDI data class/element and US Core profile each new EHR-facing field maps to.
- Which USCDI version (v3 baseline vs. v6/v7 voluntary) the integration targets, and why.
