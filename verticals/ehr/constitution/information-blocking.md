---
id: GR-EHR-INFOBLOCK-001
title: Any feature that could restrict, delay, or discourage EHI access/exchange/use must be checked against the information blocking exceptions
vertical: ehr
lifecycle_phase: constitution
binding_tier: binding
source: "ONC Information Blocking Rule, 45 CFR Part 171"
citation_url: https://www.healthit.gov/topic/information-blocking
version: "current CFR (8 exceptions unchanged by the 2026-10-26 HTI-5 final rule); a 2025-12-29 proposed rule to narrow several exceptions remains pending, not yet finalized as of this review"
effective_date: 2021-04-05
supersedes: null
related_ids: [GR-EHR-CERT-001, GR-HIPAA-PRIV-001]
applicability_tags: [ehr-platform-feature, health-information-network, api-access-restriction]
owner: regulatory-affairs
last_reviewed: 2026-11-24
review_due: 2027-05-24
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

**Enforcement is active, not theoretical**: starting February 2026, ASTP/ONC began
issuing letters of nonconformity to certified health IT developers over information-
blocking-adjacent practices, and HHS OIG can impose civil monetary penalties on health
IT developers/HINs/HIEs found to have committed information blocking. Providers face
Medicare payment-program penalties for information blocking findings. This is a live
compliance risk for a shipping feature, not a documentation exercise.

**Watch for change**: a December 2025 proposed rule would narrow several of the
exceptions below (aimed at exceptions perceived as susceptible to misuse); the HTI-5
final rule (October 2026) explicitly did *not* act on this proposal, so the 8
exceptions as currently defined in 45 CFR Part 171 remain in force. Re-check
https://www.healthit.gov/topic/information-blocking before relying on an exception
this guardrail describes, in case that proposal has since finalized.

## The eight exceptions (45 CFR Part 171, Subparts B and C)

Two categories — confirm the specific regulatory text for the exact conditions of each,
since every exception has its own conditions that must *all* be met, not just a
matching label:

- **Not fulfilling requests to access, exchange, or use EHI** (Subpart B): Preventing
  Harm, Privacy, Security, Infeasibility, Health IT Performance.
- **Procedures for fulfilling requests** (Subpart C): Content and Manner, Fees,
  Licensing.

(Some secondary sources count differently when they split a sub-condition into its own
bullet — treat 45 CFR Part 171 itself, not a secondary summary, as authoritative on the
count and conditions.)

## Self-assessment default (use when no regulatory-affairs/legal reviewer is available)

1. Does the feature restrict, delay, rate-limit, paywall, or otherwise gate EHI access,
   exchange, or use, for anyone able to request it? If no → not information-blocking-
   scope, record why (e.g., "feature doesn't touch EHI access at all").
2. If yes, does the restriction satisfy **every** condition of exactly one named
   exception above — not just its general theme? Read the specific condition text (each
   exception has sub-requirements, e.g. Infeasibility requires specific documented
   infeasibility factors, not just "it would be hard"). A restriction that is close to
   an exception's spirit but misses a condition is not covered.
3. If no exception's conditions are fully met, the practice is information blocking as
   currently defined — this is a stop-ship finding for a self-assessment, not something
   to launch and revisit later; escalate for a real legal/regulatory read before
   shipping the restriction.
4. Record the exception name, which conditions were checked, and the self-assessment
   label regardless of outcome.

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
  was finalized, or is **self-assessed** (no reviewer available) — carry this label
  forward.
