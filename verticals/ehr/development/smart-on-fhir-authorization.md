---
id: GR-EHR-SMART-001
title: Third-party apps consuming EHR data must use SMART App Launch v2.x with minimum-necessary scopes
vertical: ehr
lifecycle_phase: development
binding_tier: binding
source: "HL7 FHIR SMART Application Launch Framework (ONC HTI-1 required baseline: v2.0.0; current published/SVAP-advanced version: v2.2.0)"
citation_url: https://hl7.org/fhir/smart-app-launch/
version: "2.0.0 baseline (HTI-1); 2.2.0 is the current HL7-published version (approved 2024-04-30) and should be preferred for new integrations — confirm which version the target EHR actually implements before assuming either"
effective_date: 2023-01-01
supersedes: null
related_ids: [GR-EHR-CERT-001, GR-EHR-USCDI-001, GR-HIPAA-PRIV-001]
applicability_tags: [ehr-interoperability-app, smart-on-fhir, third-party-app]
owner: security-engineering
last_reviewed: 2026-11-24
review_due: 2027-05-24
summary: >
  Any application authenticating against a certified EHR's FHIR API must implement a
  current SMART App Launch v2.x release (not the deprecated v1.0.0) and request only
  the minimum SMART/FHIR scopes the feature actually needs — this shapes the
  integration architecture and cannot be retrofitted after the data model is built.
---

## Requirement

ONC's HTI-1 rule requires certified EHRs to support SMART App Launch v2.0.0 for
third-party application authorization; v1.0.0 support was phased out (its adoption
window closed January 1, 2026 per ONC's standards timeline). HL7 has since published
newer point releases in the v2.x line — **v2.2.0** (approved April 30, 2024) is the
current published version and is additive/clarifying over v2.0.0 (refined scope
semantics, organization-identity and other extensions), not a breaking change — but
not every certified EHR has adopted past the v2.0.0 baseline yet. Confirm which
specific v2.x release the target EHR actually implements rather than assuming the
newest; build against v2.0.0's documented behavior as the floor every certified EHR
must support, and treat anything v2.2.0 adds as an enhancement to use only after
confirming the target supports it.

Scopes requested at authorization time define exactly what FHIR resources and
operations the app can perform — this is the EHR-specific instance of the
minimum-necessary principle (see `GR-HIPAA-PRIV-001`), enforced at the protocol level
rather than just in application code.

## Agent Guidance

- **MUST**: When generating or modifying an integration that authenticates against an
  EHR's FHIR API, implement SMART App Launch v2.0.0 or later (confirm the target's
  supported version first) — never scaffold against the deprecated v1.0.0 flow, even if
  a sample/tutorial referenced during development uses it.
- **MUST**: Scope requests to the specific FHIR resource types and operations the
  feature needs (e.g., `patient/Observation.rs` for a read-only vitals view), not a
  broad `patient/*.*` grant "to avoid asking twice."
- **MUST NOT**: Hard-code or cache scopes broader than what the current feature set
  uses "for future features" — scope expansion is a deliberate, reviewed change, not a
  default.
- **Flag for human review if**: a requested scope would grant access to data classes
  unrelated to the feature's stated purpose, or the integration targets an EHR/version
  combination that only supports the deprecated v1.0.0 flow.

## Evidence to capture

- SMART App Launch version implemented, and confirmation it is v2.0.0 or a later v2.x
  release (never v1.0.0), matched against the version the target EHR actually supports.
- The exact scope list requested, mapped to the feature(s) that need each one.
