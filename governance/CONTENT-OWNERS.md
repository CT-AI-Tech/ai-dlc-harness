# Content ownership

Every guardrail file's `owner` field names a role, not a person, and that role is
accountable for the content's accuracy — not whoever happened to write the markdown.

**None of the guardrail content in this repo is authoritative until the named owner
role has reviewed and signed off.** The pilot content under `verticals/medical-devices/`
and `cross-cutting/` is illustrative — written to demonstrate the structure and loading
pattern, sourced from real regulations, but **not yet reviewed by regulatory/legal/
privacy SMEs**. Treat `last_reviewed` dates in frontmatter as placeholders until that
review happens.

## Roles referenced in this pilot

| Role | Accountable for | Example guardrails |
|---|---|---|
| `regulatory-affairs` | SaMD classification, FDA submission strategy | GR-MD-CLASS-001 |
| `quality-engineering` | ISO 14971, IEC 62304, 21 CFR 820.30 design controls | GR-MD-SDLC-001, GR-MD-RISK-001, GR-MD-TRACE-001 |
| `security-engineering` | Cybersecurity premarket guidance, HIPAA Security Rule | GR-MD-CYBER-001, GR-HIPAA-SEC-001 |
| `privacy-office` | HIPAA Privacy Rule, de-identification, consent/IRB basis | GR-HIPAA-PRIV-001, GR-GEN-DEID-001 |

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
