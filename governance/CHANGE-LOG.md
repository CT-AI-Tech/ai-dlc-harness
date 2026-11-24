# Change log

Record every change to a `binding` guardrail's requirement content (not typo fixes) here,
in addition to normal version control history — this is the audit trail of *why* a
guardrail changed, for when a regulator or auditor asks.

| Date | Guardrail id | Change | Reviewed by | Reason |
|---|---|---|---|---|
| 2026-01-15 | GR-MD-CLASS-001, GR-MD-CYBER-001, GR-MD-SDLC-001, GR-MD-RISK-001, GR-MD-TRACE-001, GR-HIPAA-SEC-001, GR-HIPAA-PRIV-001, GR-GEN-DEID-001 | Initial pilot content created | *unreviewed — pilot* | Demonstrate harness structure and loading pattern for medical-devices vertical |
| 2026-11-02 | GR-EHR-CERT-001, GR-EHR-INFOBLOCK-001, GR-EHR-SMART-001, GR-EHR-USCDI-001, GR-EHR-TEST-001 | New `ehr` vertical created, covering both EHR-platform (e.g. Greenway-shape) and EHR-interoperability (e.g. DaVita-shape) product profiles via `applicability_tags` on a shared vertical | *unreviewed — pilot* | Lead feedback: cover EHR-related development explicitly, for both customer shapes |
| 2026-11-23 | GR-ENG-COMMENT-001, GR-ENG-NUANCE-001, GR-ENG-ARCHBOUNDARY-001, GR-ENG-REPEATFIX-001, GR-ENG-TESTHONESTY-001, GR-ENG-SECRETS-001, GR-ENG-DEPRECATED-001 | New `cross-cutting/engineering-standards/` added — the harness's first `category: engineering` content (coding standards / agent-behavior patterns, not regulatory requirements). Schema gained an optional `category` field; the Dev persona view groups on it. | *unreviewed — pilot* | Make the harness concrete at the code-review layer, not only the compliance layer — informed by industry patterns for scaling AI coding agents (lint-rule-over-prose, verification honesty, architecture enforcement) |
| 2026-11-24 | GR-EHR-CERT-001, GR-EHR-INFOBLOCK-001, GR-EHR-SMART-001, GR-EHR-USCDI-001, GR-EHR-TEST-001, GR-HIPAA-SEC-001, GR-HIPAA-PRIV-001, GR-GEN-DEID-001 | Research-refreshed all `ehr`-vertical and `ehr`-relevant cross-cutting guardrails against current public sources: HTI-5 final rule (2026-10-26, narrows certified criteria 60→39 unchanged, 14 removed, 7 revised), USCDI v7 (2026-07-23), SMART App Launch v2.2.0 vs. the v2.0.0 HTI-1 baseline, the pending (not finalized) information-blocking exceptions NPRM, active ASTP/ONC information-blocking enforcement since Feb 2026, the HIPAA Security Rule overhaul's delay to a projected July 2027, and the HIPAA Privacy Rule "Coordinated Care" final rule (Nov 2026). Added a "Self-assessment default" decision path to the 3 guardrails that say a human must decide (`GR-EHR-CERT-001`, `GR-EHR-INFOBLOCK-001`, `GR-GEN-DEID-001`), and the full 18-identifier Safe Harbor list to `GR-GEN-DEID-001`. | *unreviewed — AI research pass, no regulatory-affairs/legal/privacy-office reviewer; see note below* | Project owner explicitly accepted proceeding without engaging a paid regulatory/legal/privacy reviewer for this pilot and asked for best-effort, resourced content instead, so pre-flight guardrails have actionable self-assessment guidance rather than an indefinite block |

**Note on the 2026-11-24 entry**: this content was produced by an AI agent doing web
research against public sources (ONC/healthit.gov, HHS, law-firm client alerts, trade
press), cross-checked across multiple sources where they disagreed, with discrepancies
called out in the guardrail text itself rather than silently resolved. It was **not**
reviewed by a human regulatory-affairs professional, health IT compliance specialist,
or attorney. Every "Self-assessment default" section says so explicitly and instructs
whoever uses it to label the resulting record as self-assessed. This is a deliberate,
informed choice for this pilot, not an oversight — but it means every guardrail touched
here should be the first thing a real reviewer re-checks if/when one is engaged, and
the `review_due` dates were deliberately shortened (to ~6 months, not the usual year)
given how fast this regulatory area is moving in 2026.
