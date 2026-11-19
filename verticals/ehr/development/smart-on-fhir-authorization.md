---
id: GR-EHR-SMART-001
title: Third-party apps consuming EHR data must use SMART App Launch v2.0.0 with minimum-necessary scopes
vertical: ehr
lifecycle_phase: development
binding_tier: binding
source: "HL7 FHIR SMART Application Launch Framework, v2.0.0 (ONC HTI-1 required standard)"
citation_url: https://hl7.org/fhir/smart-app-launch/
version: "2.0.0"
effective_date: 2023-01-01
supersedes: null
related_ids: [GR-EHR-CERT-001, GR-EHR-USCDI-001, GR-HIPAA-PRIV-001]
applicability_tags: [ehr-interoperability-app, smart-on-fhir, third-party-app]
owner: security-engineering
last_reviewed: 2026-11-02
review_due: 2027-11-02
summary: >
  Any application authenticating against a certified EHR's FHIR API must implement
  SMART App Launch v2.0.0 (not the deprecated v1.0.0) and request only the minimum
  SMART/FHIR scopes the feature actually needs — this shapes the integration
  architecture and cannot be retrofitted after the data model is built.
---

## Requirement

ONC's HTI-1 rule requires certified EHRs to support SMART App Launch v2.0.0 for
third-party application authorization; v1.0.0 support is being phased out
(its adoption window closes January 1, 2026 per ONC's standards timeline). v2.0.0 adds
granular scopes, refined launch context, and asymmetric client authentication that
v1.0.0 lacked.

Scopes requested at authorization time define exactly what FHIR resources and
operations the app can perform — this is the EHR-specific instance of the
minimum-necessary principle (see `GR-HIPAA-PRIV-001`), enforced at the protocol level
rather than just in application code.

## Agent Guidance

- **MUST**: When generating or modifying an integration that authenticates against an
  EHR's FHIR API, implement SMART App Launch v2.0.0 — never scaffold against the
  deprecated v1.0.0 flow, even if a sample/tutorial referenced during development uses it.
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

- SMART App Launch version implemented, and confirmation it is v2.0.0.
- The exact scope list requested, mapped to the feature(s) that need each one.
