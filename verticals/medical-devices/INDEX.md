# Vertical: Medical Devices (pilot)

One line per guardrail. Load a guardrail's full file only if its tags/phase match the
current task — see [`../../agent-interface/LOADING-PROTOCOL.md`](../../agent-interface/LOADING-PROTOCOL.md).

## constitution/ (load when writing specs / the Speckit constitution)

- `samd-classification.md` [GR-MD-CLASS-001] (binding) — SaMD classification must be
  recorded before feature specs are written.
- `cybersecurity-premarket.md` [GR-MD-CYBER-001] (binding) — connected devices need an
  SBOM/threat-model/update-mechanism plan in the spec itself.

## development/ (load while generating code/tests)

- `software-lifecycle-iec62304.md` [GR-MD-SDLC-001] (binding) — generated code/tests
  must match the IEC 62304 safety class (A/B/C).
- `risk-management-iso14971.md` [GR-MD-RISK-001] (binding) — new failure modes from
  generated code must feed back into the risk file.

## review/ (load at code-review / verification time)

- `design-controls-traceability.md` [GR-MD-TRACE-001] (binding) — merged code must
  trace to a design-controlled requirement and verification evidence.

## Also likely relevant (cross-cutting)

Most medical-device features touching patient data also need:
[`../../cross-cutting/hipaa/`](../../cross-cutting/hipaa/) and, for research/analytics
use cases, [`../../cross-cutting/general/deidentification-and-consent.md`](../../cross-cutting/general/deidentification-and-consent.md).
