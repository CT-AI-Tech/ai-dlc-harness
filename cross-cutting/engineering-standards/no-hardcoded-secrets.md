---
id: GR-ENG-SECRETS-001
title: Generated code must never contain hardcoded secrets, keys, or credentials
vertical: cross-cutting
lifecycle_phase: development
binding_tier: binding
category: engineering
source: "OWASP Top 10 (A05:2021 — Security Misconfiguration; A07:2021 — Identification and Authentication Failures); CWE-798 (Use of Hard-coded Credentials)"
citation_url: https://owasp.org/Top10/
version: "OWASP Top 10:2021"
effective_date: 2021-09-24
supersedes: null
related_ids: []
applicability_tags: [security, secrets-management, code-generation, credentials]
owner: security-engineering
last_reviewed: 2026-11-23
review_due: 2027-11-23
summary: >
  API keys, passwords, tokens, and connection strings must never be written
  directly into source code, test fixtures, or committed config files — always a
  real secrets-management mechanism, even in "temporary" or demo code.
---

## Requirement

A hardcoded secret is one of the most common and most costly classes of security
incident, precisely because it's easy to introduce (paste a key to "just get it
working") and easy to miss in review (it looks like ordinary string data). This
risk is elevated with agent-generated code: an agent asked to "connect to this
API" will often paste a working credential directly into the code or a committed
config file to make the task succeed quickly, with no sense that this is
categorically different from a hardcoded magic number.

## Agent Guidance

- **MUST**: Load all secrets (API keys, passwords, tokens, connection strings,
  private keys) from the project's existing secrets mechanism (environment
  variables sourced from a vault/secret manager, a gitignored local `.env` for
  development only) — never embed a literal secret value in source code, test
  files, or any file that will be committed.
- **MUST NOT**: Write a real secret value into a code comment, a commit message,
  a log statement, or a test fixture "just for this test" — test code needs mock/
  placeholder values, not real credentials, same principle as this harness's own
  "test credentials only, never production ones" rule for its own tooling.
- **MUST NOT**: Disable or weaken a secret-scanning pre-commit hook or CI check to
  get a commit through — if a real secret was flagged, remove it and rotate it;
  if a false positive was flagged, fix the pattern, don't disable the scanner.
- **Flag for human review if**: a task seems to require embedding a real
  credential to proceed (e.g. no secrets-management mechanism exists yet in this
  project) — that's a gap to fix, not a one-off exception to take.

## Evidence to capture

- Confirmation that no hardcoded secret was introduced (or, if one was found and
  removed, that it was rotated, not just deleted).
