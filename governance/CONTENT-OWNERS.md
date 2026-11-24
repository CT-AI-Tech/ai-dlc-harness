# Content ownership

Every guardrail file's `owner` field names a role, not a person, and that role is
accountable for the content's accuracy — not whoever happened to write the markdown.

**None of the guardrail content in this repo is authoritative until the named owner
role has reviewed and signed off.** The pilot content under `verticals/medical-devices/`
and `cross-cutting/` is illustrative — written to demonstrate the structure and loading
pattern, sourced from real regulations, but **not yet reviewed by regulatory/legal/
privacy SMEs**. Treat `last_reviewed` dates in frontmatter as placeholders until that
review happens.

Three guardrails (`GR-EHR-CERT-001`, `GR-EHR-INFOBLOCK-001`, `GR-GEN-DEID-001`) say a
qualified human must make the underlying determination, and now also include a
"Self-assessment default" section — a researched, best-effort decision path for
projects proceeding **without** a retained regulatory-affairs/legal/privacy reviewer
(a deliberate pilot accommodation, not a claim that self-assessment is equivalent to
expert review). Every record produced this way must be labeled self-assessed, per the
guardrail's own "Evidence to capture" section, so a reviewer engaged later knows to
re-check it rather than trust it as final. See `governance/CHANGE-LOG.md`'s 2026-11-24
entry for what was and wasn't verified by a human in this pass.

`cross-cutting/engineering-standards/` (`category: engineering` in frontmatter) is a
different kind of content from everything else in this repo — coding standards and
agent-behavior patterns, not regulatory requirements. It needs sign-off from
engineering leadership (and security-engineering for the secrets guardrail), not a
regulatory/legal/privacy review — but the same rule applies: illustrative until the
named owner has actually reviewed it, and every project adopting this harness should
expect to edit these to match its own stack and conventions rather than taking them
as universal truths (e.g. the specific APIs named as "high-nuance" are illustrative;
every codebase has its own).

## Roles referenced in this pilot

| Role | Accountable for | Example guardrails |
|---|---|---|
| `regulatory-affairs` | SaMD classification, FDA submission strategy | GR-MD-CLASS-001 |
| `quality-engineering` | ISO 14971, IEC 62304, 21 CFR 820.30 design controls | GR-MD-SDLC-001, GR-MD-RISK-001, GR-MD-TRACE-001 |
| `security-engineering` | Cybersecurity premarket guidance, HIPAA Security Rule | GR-MD-CYBER-001, GR-HIPAA-SEC-001 |
| `privacy-office` | HIPAA Privacy Rule, de-identification, consent/IRB basis | GR-HIPAA-PRIV-001, GR-GEN-DEID-001 |
| `engineering-leadership` | Coding standards, architecture enforcement, agent-behavior patterns (`category: engineering`) | GR-ENG-COMMENT-001, GR-ENG-NUANCE-001, GR-ENG-ARCHBOUNDARY-001, GR-ENG-REPEATFIX-001, GR-ENG-TESTHONESTY-001, GR-ENG-DEPRECATED-001 |
| `security-engineering` *(shared)* | Also covers secrets/credentials handling | GR-ENG-SECRETS-001 |

## Required before a guardrail can be marked `binding` in production use

1. Reviewed by the named owner role (a real person/team, not the engineer who authored
   the markdown).
2. `source` and `citation_url` verified current.
3. `last_reviewed` and `review_due` set to real dates (recommended cadence: annually,
   or immediately on known regulatory change).
4. Logged in `governance/CHANGE-LOG.md`.

## Review cadence

- **Binding guardrails**: review at least annually, and immediately when the owner
  becomes aware of a relevant regulatory change (new FDA guidance, HIPAA update, etc.).
- **Advisory guardrails**: review opportunistically; staleness is lower-risk but should
  still be tracked.

A guardrail whose `review_due` has passed should still be usable (don't block agents on
it), but should be surfaced to the owner, and any agent-facing summary of "what
guardrails applied" should note that it's past due for review.
