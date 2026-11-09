---
id: GR-MD-CLASS-001
title: Software as a Medical Device (SaMD) classification must be settled before spec work starts
vertical: medical-devices
lifecycle_phase: constitution
binding_tier: binding
source: "FDA: Software as a Medical Device (SaMD) - Policy and IMDRF risk framework"
citation_url: https://www.fda.gov/medical-devices/digital-health-center-excellence/software-medical-device-samd
version: IMDRF N12 (2014), as referenced by current FDA SaMD policy
effective_date: 2014-09-18
supersedes: null
related_ids: [GR-MD-CYBER-001, GR-MD-SDLC-001, GR-MD-RISK-001]
applicability_tags: [software-as-medical-device, clinical-decision-support, diagnostic, treat-or-diagnose]
owner: regulatory-affairs
last_reviewed: 2026-01-15
review_due: 2027-01-15
summary: >
  Before any feature spec is written, the product's SaMD risk category (per IMDRF:
  state of healthcare situation x significance of information) must be determined and
  recorded, since it dictates which downstream guardrails (62304 software safety class,
  design controls rigor) apply.
---

## Requirement

Any software that treats, diagnoses, drives clinical management, or informs clinical
decisions for a disease/condition is potentially SaMD, and FDA/IMDRF classify it along
two axes:

- **State of the healthcare situation**: critical, serious, or non-serious.
- **Significance of the information provided**: treat/diagnose, drive clinical
  management, or inform clinical management.

The combination determines the SaMD category (I–IV) and, downstream, the rigor required
for software lifecycle (IEC 62304 safety class), risk management (ISO 14971), and design
controls (21 CFR 820.30).

**This classification cannot be decided by an agent.** It is a regulatory determination
that a qualified person (regulatory affairs / clinical) must make and record before
feature specs are written, because every other guardrail in this vertical depends on it.

## Agent Guidance

- **MUST**: Before generating a spec/constitution document for a new healthcare
  feature, check whether a recorded SaMD classification exists for the product/feature
  (expected location: `docs/regulatory/samd-classification.md` in the target repo, or
  equivalent project record).
- **MUST NOT**: Infer or assign a SaMD classification itself, even provisionally, and
  must not proceed to generate implementation-level specs for a feature that looks like
  it could be SaMD (clinical scoring, diagnostic suggestion, dosing calculation, alerting
  on vital signs, etc.) without that record.
- **Flag for human review if**: the feature description contains signals of clinical
  decision support, diagnosis, treatment guidance, or patient-specific alerting and no
  classification record is found. Stop and surface this to the user/regulatory owner
  rather than guessing.

## Evidence to capture

- Link or path to the recorded SaMD classification decision.
- Date of classification and the name/role of who made it (must be a qualified person,
  not the agent).
