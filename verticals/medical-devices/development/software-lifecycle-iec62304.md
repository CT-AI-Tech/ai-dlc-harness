---
id: GR-MD-SDLC-001
title: Code and test generation must match the IEC 62304 software safety class
vertical: medical-devices
lifecycle_phase: development
binding_tier: binding
source: "IEC 62304:2006+AMD1:2015 - Medical device software - Software life cycle processes"
citation_url: null
version: "2015 (Amendment 1)"
effective_date: 2015-06-01
supersedes: null
related_ids: [GR-MD-CLASS-001, GR-MD-RISK-001, GR-MD-TRACE-001]
applicability_tags: [software-as-medical-device, embedded-device-software, connected-device]
owner: quality-engineering
last_reviewed: 2026-01-15
review_due: 2027-01-15
summary: >
  IEC 62304 software safety class (A/B/C, driven by the SaMD/hazard classification)
  determines how much rigor code generation, unit testing, and documentation need —
  Class C code cannot be generated/merged with Class A levels of test coverage and
  traceability.
---

## Requirement

IEC 62304 defines three software safety classes based on the severity of harm the
software could contribute to:

- **Class A**: no injury or damage to health possible.
- **Class B**: non-serious injury possible.
- **Class C**: death or serious injury possible.

Required rigor scales with class: software architecture documentation, unit-level
verification, integration testing, and traceability from requirement → design → code →
test all become mandatory and more detailed as class increases from A to C.

## Agent Guidance

- **MUST**: Before generating implementation code for a task, confirm the safety class
  assigned to the component (should be recorded alongside the SaMD classification from
  `GR-MD-CLASS-001`). Generate tests and documentation at the rigor level that class
  requires, not a default/minimal level.
- **MUST**: For Class B/C components, generate traceable links between the requirement/
  spec item, the design element, the implementing code, and the verifying test — do not
  generate code that has no corresponding test and traceability entry.
- **MUST NOT**: Silently assume Class A (lowest rigor) when the safety class is unknown.
- **Flag for human review if**: the safety class is missing, or a task appears to touch
  a Class C component (e.g., dosing logic, alarm generation, closed-loop control) without
  the corresponding verification rigor already in place.

## Evidence to capture

- The safety class (A/B/C) the generated code was built against.
- Traceability links produced (requirement/design/code/test) for Class B/C work.
