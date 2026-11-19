# Vertical: EHR (Electronic Health Records)

One line per guardrail. Load a guardrail's full file only if its tags/phase match the
current task — see [`../../agent-interface/LOADING-PROTOCOL.md`](../../agent-interface/LOADING-PROTOCOL.md).

This vertical covers **two product shapes** under one folder, distinguished by
`applicability_tags` rather than separate verticals (they share most of their
regulatory ground):

- **`ehr-platform-feature`** — building features *inside* an existing certified EHR
  (e.g., a Greenway-shape customer: contributing to the EHR product itself).
- **`ehr-interoperability-app`** — building a *supporting application that connects to*
  an EHR (e.g., a DaVita-shape customer: a care-coordination app consuming an EHR's API).

## constitution/ (load when writing specs / the Speckit constitution)

- `onc-certification-scope.md` [GR-EHR-CERT-001] (binding) — whether the product
  touches certified health IT must be determined before feature specs are written.
  Applies to both shapes.
- `information-blocking.md` [GR-EHR-INFOBLOCK-001] (binding) — any feature that
  restricts/delays/gates EHI access must be checked against the 8 information-blocking
  exceptions. Primarily platform-shape.

## development/ (load while generating code/tests)

- `smart-on-fhir-authorization.md` [GR-EHR-SMART-001] (binding) — third-party apps
  consuming EHR data must use SMART App Launch v2.0.0 with minimum-necessary scopes.
  Primarily interoperability-shape.
- `uscdi-data-mapping.md` [GR-EHR-USCDI-001] (binding) — data exchanged with an EHR
  must map to standard USCDI data classes, not ad hoc fields. Applies to both shapes.

## review/ (load at code-review / verification time)

- `interoperability-conformance-testing.md` [GR-EHR-TEST-001] (binding) — merged
  EHR-facing API code needs conformance test evidence (e.g., Inferno), not just unit
  test coverage. Applies to both shapes.

## Also likely relevant (cross-cutting)

Almost every EHR feature touches patient data, so
[`../../cross-cutting/hipaa/`](../../cross-cutting/hipaa/) applies routinely alongside
this vertical's guardrails — the index's vertical+phase filter surfaces both together.
