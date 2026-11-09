---
id: GR-EHR-INFOBLOCK-001
title: Any feature that could restrict, delay, or discourage EHI access/exchange/use must be checked against the information blocking exceptions
vertical: ehr
lifecycle_phase: constitution
binding_tier: binding
source: "ONC Information Blocking Rule, 45 CFR Part 171"
citation_url: https://www.healthit.gov/topic/information-blocking
version: "current CFR, as amended by the December 2024 Information Blocking Enhancements rule"
effective_date: 2021-04-05
supersedes: null
related_ids: [GR-EHR-CERT-001, GR-HIPAA-PRIV-001]
applicability_tags: [ehr-platform-feature, health-information-network, api-access-restriction]
owner: regulatory-affairs
last_reviewed: 2026-11-02
review_due: 2027-11-02
summary: >
  A practice that is likely to interfere with access, exchange, or use of electronic
  health information (EHI) is information blocking unless it fits one of eight
  regulatory exceptions — this must be evaluated at spec time for any feature that
  gates, throttles, paywalls, or otherwise restricts EHI, not discovered after launch.
---

## Requirement

45 CFR Part 171 defines information blocking as a practice by a health care provider,
health IT developer of certified health IT, or health information network/exchange
that is likely to interfere with access, exchange, or use of EHI — unless it meets one
of eight exceptions: preventing harm, privacy, security, infeasibility, health IT
performance, content and manner, fees, and licensing.

For an EHR platform vendor (Greenway-shape), this applies directly: any feature that
limits what data a third party can access via API, delays data availability, or
restricts export is a candidate information-blocking practice unless an exception
clearly applies and is documented *before* the feature ships.

For an interoperability/supporting application (DaVita-shape) that itself functions as
a health information network, the same analysis applies to its own data-sharing
practices with other parties.

## Agent Guidance

- **MUST**: When a spec describes any feature that restricts, delays, paywalls,
  rate-limits, or otherwise gates access to EHI (API throttling, selective field
  exposure, approval workflows for data requests), include an explicit information-
  blocking exception analysis as a spec requirement — which of the eight exceptions
  applies, and why — not a detail to "figure out at launch."
- **MUST NOT**: Approve or generate a spec for an EHI-restricting feature with no
  stated exception rationale, or with a rationale that is really a business reason
  (e.g., "to protect our competitive advantage") rather than one of the eight
  regulatory exceptions.
- **Flag for human review if**: the restriction's stated rationale is ambiguous,
  commercially motivated, or does not map cleanly to a named exception — this needs
  a regulatory affairs / legal read, not an agent's best guess.

## Evidence to capture

- Which exception (if any) the restricting feature relies on, and the documented
  rationale.
- Whether the restriction was reviewed by regulatory affairs/legal before the spec
  was finalized.
