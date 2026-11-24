---
id: GR-GEN-DEID-001
title: Research/analytics use of patient data needs de-identification method and consent basis recorded
vertical: cross-cutting
lifecycle_phase: cross-cutting
binding_tier: binding
source: "HIPAA Privacy Rule De-Identification Standard, 45 CFR 164.514; Common Rule (45 CFR 46) for human-subjects research"
citation_url: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.514
version: "current CFR"
effective_date: 2003-04-14
supersedes: null
related_ids: [GR-HIPAA-PRIV-001]
applicability_tags: [research, analytics, deidentification, secondary-use]
owner: privacy-office
last_reviewed: 2026-11-24
review_due: 2027-05-24
summary: >
  Before building any analytics/research pipeline that consumes patient data, the
  de-identification method (Safe Harbor vs. Expert Determination) and the consent/
  authorization basis for that use must be recorded — an agent cannot choose this on
  its own.
---

## Requirement

Using PHI for research or analytics beyond direct treatment/payment/operations
generally requires either de-identification (Safe Harbor's 18-identifier removal, or
Expert Determination) or a valid authorization/consent/IRB waiver basis. Which applies
is a legal/privacy-office and, for human-subjects research, an IRB determination — not
an engineering choice. No 2026 update has changed this standard (45 CFR 164.514); the
governing HHS guidance remains at
https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/.

## Safe Harbor's 18 identifier categories (45 CFR 164.514(b)(2))

All 18 must be removed — for the individual *and* their relatives, employers, and
household members — for Safe Harbor to apply. Missing even one disqualifies it:

1. Names
2. All geographic subdivisions smaller than a state (street address, city, county,
   precinct, zip code — except the first 3 digits of a zip if the area has >20,000
   people, per the published HHS table)
3. All elements of dates (except year) directly related to an individual — birth date,
   admission/discharge dates, death date — and all ages over 89 (and dates indicative
   of such age) must be aggregated into a single "90 or older" category
4. Telephone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers and serial numbers, including license plate numbers
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers (including finger/voice prints)
17. Full-face photographs and comparable images
18. Any other unique identifying number, characteristic, or code (other than the
    re-identification code a recipient is permitted to assign under 164.514(c))

Safe Harbor additionally requires the covered entity to have **no actual knowledge**
that the remaining information could be used, alone or combined with other reasonably
available information, to identify the individual — removing the 18 fields is
necessary but the "no actual knowledge" condition is a separate, real requirement.

## Self-assessment default (use when no privacy-office/statistician reviewer is available)

1. Can every one of the 18 categories above be removed from the dataset *and* the
   remaining use case still achieve its purpose? If yes, and the team genuinely has no
   actual knowledge the data remains identifiable (not just "we didn't check") → Safe
   Harbor self-assessment, documented against the checklist above with each category
   marked removed/not-applicable.
2. If the use case needs a field from the 18 (e.g., dates finer than year, small-
   geography data, or a device identifier needed for the research question), Safe
   Harbor cannot apply — this **requires Expert Determination** (a qualified
   statistician's documented re-identification-risk analysis) or a valid consent/IRB
   basis. An agent or engineering team cannot self-certify Expert Determination; it
   must be escalated, and this is one case where "do your best without an expert" does
   not extend to performing the statistical determination itself.
3. If neither de-identification method fits the use case, confirm a valid
   authorization/consent/IRB-approved-waiver basis exists for the specific secondary
   use (not just the original treatment consent) before the pipeline is built.
4. Record which path applied, label it self-assessed if no privacy-office/statistician
   reviewer was involved, and re-review before the dataset's use case changes (a
   dataset de-identified for one analysis is not automatically cleared for a different
   downstream use).

## Agent Guidance

- **MUST**: Before generating a data pipeline, spec, or export for research/analytics
  use of patient data, check for a recorded de-identification method and consent/
  authorization basis for that specific use.
- **MUST NOT**: Implement its own de-identification logic (e.g., just dropping a "name"
  column) as if that satisfies Safe Harbor — Safe Harbor requires removing all 18
  specified identifier categories, and Expert Determination requires a qualified
  statistician's assessment, neither of which an agent can certify on its own.
- **Flag for human review if**: no recorded de-identification method/consent basis
  exists for a research or analytics feature touching patient data, or the feature
  seems to re-identify previously de-identified data (e.g., joining a de-identified
  dataset back to an identified one).

## Evidence to capture

- Recorded de-identification method (Safe Harbor / Expert Determination) and who
  certified it — including whether it is **self-assessed** (no privacy-office/
  statistician reviewer) or **reviewer-confirmed**.
- Consent/authorization/IRB basis for the specific secondary use.
