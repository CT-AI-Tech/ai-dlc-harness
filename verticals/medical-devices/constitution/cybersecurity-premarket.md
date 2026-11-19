---
id: GR-MD-CYBER-001
title: Network-connected devices need a cybersecurity plan captured in the spec, not bolted on later
vertical: medical-devices
lifecycle_phase: constitution
binding_tier: binding
source: "FDA: Cybersecurity in Medical Devices - Quality System Considerations and Content of Premarket Submissions"
citation_url: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cybersecurity-medical-devices-quality-system-considerations-and-content-premarket-submissions
version: 2023-09
effective_date: 2023-09-27
supersedes: null
related_ids: [GR-MD-CLASS-001, GR-MD-RISK-001, GR-HIPAA-SEC-001]
applicability_tags: [connected-device, network-interface, software-as-medical-device, cloud-connected]
owner: security-engineering
last_reviewed: 2026-01-15
review_due: 2027-01-15
summary: >
  Any device/software with network connectivity, wireless interfaces, or removable
  media must plan for an SBOM, threat model, and vulnerability management process as
  part of the initial spec — this cannot be retrofitted at review time without
  reworking the architecture.
---

## Requirement

FDA's premarket cybersecurity guidance (codified via the 2022 Omnibus Appropriations
Act, Section 3305) expects, for any cyber device:

- A **Software Bill of Materials (SBOM)** covering all commercial, open-source, and
  off-the-shelf components.
- A documented **threat model** for the device's intended use environment.
- A **vulnerability management and disclosure process**, including a plan for
  post-market patching.
- Evidence the device can be updated/patched without compromising safety/effectiveness.

Because these shape architecture decisions (update mechanisms, component selection,
network boundary design), they belong in the constitution/spec phase, not discovered at
code review.

## Agent Guidance

- **MUST**: When a spec describes any network interface, wireless radio, cloud
  connectivity, or removable media, include a cybersecurity section covering: SBOM
  generation approach, threat model scope, and update/patch mechanism — as explicit
  spec requirements, not implementation details to "figure out later."
- **MUST**: Flag any dependency choice that has no active maintenance/patch history as
  a risk to resolve before the spec is finalized.
- **MUST NOT**: Approve or generate a spec for a connected device that defers all
  security design to a later phase ("we'll add auth later").
- **Flag for human review if**: the product will connect to hospital networks, EHR
  systems, or other medical devices — this raises interoperability and shared-risk
  considerations (see IEC 80001-1) that need a security architect, not just the agent.

## Evidence to capture

- SBOM generation tooling/process referenced in the spec.
- Threat model document or section, and its review date.
- Update/patch mechanism description and who owns it post-market.
