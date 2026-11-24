---
id: GR-HIPAA-SEC-001
title: PHI at rest and in transit requires the HIPAA Security Rule technical safeguards
vertical: cross-cutting
lifecycle_phase: cross-cutting
binding_tier: binding
source: "HIPAA Security Rule, 45 CFR 164.312"
citation_url: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312
version: "current CFR (164.312 as in force today); a substantial HHS NPRM overhaul (Dec 2024) proposing mandatory encryption, MFA, and other prescriptive technical controls is NOT yet final — repeatedly delayed, most recently to a projected July 2027 final action. Build to the current rule; treat the proposal as a preview of likely future requirements, not yet a current one."
effective_date: 2003-04-21
supersedes: null
related_ids: [GR-MD-CYBER-001, GR-HIPAA-PRIV-001]
applicability_tags: [phi, patient-data, connected-device, cloud-connected, data-storage]
owner: security-engineering
last_reviewed: 2026-11-24
review_due: 2027-05-24
summary: >
  Any system that stores, processes, or transmits PHI must implement access control,
  audit controls, integrity controls, and transmission security per 45 CFR 164.312 —
  these are architecture decisions, not an afterthought feature.
---

## Requirement

The HIPAA Security Rule's technical safeguards (45 CFR 164.312) require, for systems
handling electronic PHI (ePHI):

- **Access control**: unique user identification, emergency access procedure,
  automatic logoff, encryption/decryption of ePHI.
- **Audit controls**: hardware/software/procedural mechanisms to record and examine
  activity in systems containing ePHI.
- **Integrity controls**: mechanisms to confirm ePHI has not been improperly altered
  or destroyed.
- **Transmission security**: guard against unauthorized access to ePHI transmitted
  over a network (encryption in transit).

**Watch for change**: HHS's proposed Security Rule overhaul (NPRM, December 2024)
would make several currently-"addressable" safeguards mandatory — notably encryption
of ePHI at rest and in transit with no exceptions, multi-factor authentication, and
more prescriptive risk-analysis/asset-inventory requirements. It is not final; HHS has
pushed the projected final-rule date back repeatedly, most recently to July 2027. A
system built today to only the current rule's "addressable" (i.e., can be justified as
inapplicable, not simply skipped) implementation specs should still document that
justification, since "addressable" does not mean "optional" — and teams building
long-lived EHR systems should treat encryption-at-rest and MFA as practical
requirements now, both because they're good practice and because the proposed rule
would make them mandatory regardless.

## Agent Guidance

- **MUST**: When generating or modifying code that stores, reads, or transmits data
  tagged/identified as PHI, ensure: unique per-user auth (no shared service accounts for
  user-attributable actions), audit logging of access to PHI records, and encryption in
  transit (TLS) and at rest.
- **MUST NOT**: Generate a data access path to PHI that bypasses the existing audit
  logging layer, or log PHI values themselves into general application logs.
- **Flag for human review if**: a new integration point (new API, new export, new
  third-party connector) would transmit PHI outside the current encrypted/audited path.

## Evidence to capture

- Where audit logging is implemented for the new/changed PHI access path.
- Encryption mechanism used in transit and at rest for the data touched.
