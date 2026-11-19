# AI-DLC Compliance Harness (Pilot)

A reusable **guardrail layer** that sits underneath AI-DLC repos — Speckit, BMAD,
Amazon Kiro, or none of those — so any agent, skill, or workflow building a US
healthcare solution can pull in the right regulatory/compliance guardrails for its
vertical, without loading the whole corpus into context every time.

**New here? Start with the [Adoption Guide](docs/ADOPTION-GUIDE.md)** — a detailed,
step-by-step walkthrough of using this harness in each framework, written so both a
newcomer and someone who already knows the harness can follow it.

> **Status:** pilot. Two verticals (`medical-devices`, `ehr`) are built out as working
> examples of the pattern. Everything here is **illustrative, not legal advice** —
> every guardrail file must be reviewed and signed off by a qualified compliance/
> legal/regulatory-affairs SME before it is treated as authoritative for a real
> engagement. See [`governance/CONTENT-OWNERS.md`](governance/CONTENT-OWNERS.md).

## Why this exists

Most AI-DLC setups (Speckit and otherwise) let an agent generate specs, plans, and code
fast — but nothing stops it from quietly generating a HIPAA or FDA violation. This harness
gives agents a **cheap way to look up only the guardrails relevant to the task in front of
them**, instead of either (a) ignoring compliance entirely or (b) stuffing every regulation
into every prompt.

## Design principles

1. **Index before content.** Agents query a flat, cheap registry first
   (`registry/guardrail-index.yaml`), and only load the full prose of a guardrail file
   if the index says it matches the current vertical/phase/task tags. See
   [`agent-interface/LOADING-PROTOCOL.md`](agent-interface/LOADING-PROTOCOL.md).
2. **Hierarchy mirrors the lifecycle, not just the subject.** Each vertical splits
   guardrails by *when* an agent needs them — `constitution/` (shapes requirements before
   code exists), `development/` (applies while generating code/tests), `review/` (checked
   at verification time) — because that's how Speckit's own pipeline consumes them.
3. **Binding vs. advisory is explicit.** Every guardrail's frontmatter marks it
   `binding` (hard regulatory/legal requirement) or `advisory` (best practice). Agents
   should treat these very differently — block on binding, flag-and-continue on advisory.
4. **Graph-ready, not graph-first.** We are *not* building a knowledge graph yet.
   `registry/relationships.yaml` is a flat, versioned edge-list (`traces_to`,
   `conflicts_with`, `supersedes`, `depends_on`) that can be loaded into a real graph DB
   later without changing how guardrails are authored. Build the graph only once you have
   actual cross-vertical/cross-control queries that need it — see the tradeoff discussion
   in [`governance/DECISIONS.md`](governance/DECISIONS.md).
5. **Cross-cutting rules live once.** HIPAA, data residency, de-identification, etc. live
   in `cross-cutting/` and are referenced (not copy-pasted) by every vertical that needs
   them, so a HIPAA update doesn't require touching five verticals.
6. **Versioned and owned.** Every guardrail carries a `source`, `version`,
   `effective_date`, and `owner`. Stale or superseded guardrails are flagged, not silently
   trusted.

## Layout

```
ai-dlc-harness/
  README.md                     <- you are here
  schema/                       <- frontmatter schemas guardrail files must conform to
  registry/                     <- the cheap, flat, machine-readable lookup layer
    guardrail-index.yaml
    relationships.yaml          <- graph-seed edge list (not a graph DB)
  verticals/
    _template/                  <- copy this to add a new vertical
    medical-devices/            <- PILOT vertical
      INDEX.md
      constitution/             <- loaded at spec/constitution time
      development/              <- loaded during task/code generation
      review/                   <- loaded at code-review/verification time
    ehr/                        <- EHR platform + interoperability guardrails
      INDEX.md                    (one vertical, two shapes via applicability_tags:
      constitution/                ehr-platform-feature vs. ehr-interoperability-app)
      development/
      review/
  cross-cutting/
    hipaa/
    general/
  governance/                   <- ownership, review cadence, decision log
  agent-interface/              <- how agents/skills are meant to consume all of this
  integrations/
    speckit/                    <- how this plugs into a Speckit AI-DLC repo
    bmad/                       <- how this plugs into BMAD-METHOD
    kiro/                       <- how this plugs into Amazon Kiro
    generic/                    <- manual-trigger adapter for everyone else
```

## Adding a new vertical

1. Copy `verticals/_template/` to `verticals/<name>/`.
2. Write guardrails into `constitution/`, `development/`, `review/` using the schema in
   `schema/guardrail.schema.json`.
3. Add one row per guardrail to `registry/guardrail-index.yaml`.
4. Add any cross-vertical edges to `registry/relationships.yaml`.
5. Get sign-off per `governance/CONTENT-OWNERS.md` before marking any guardrail `binding`.

## Consuming this from an agent or skill

Don't read this README into context at runtime. Start at
[`agent-interface/LOADING-PROTOCOL.md`](agent-interface/LOADING-PROTOCOL.md), which is
written for machine consumption.
