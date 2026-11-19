# Design decisions (and when to revisit them)

## Hierarchy + flat index now, not a knowledge graph

**Decision**: Start with `registry/guardrail-index.yaml` (flat lookup) and
`registry/relationships.yaml` (flat edge list) instead of a graph database.

**Why**: The dominant access pattern — "what guardrails apply to this
vertical/phase/task" — is a filter over a handful of fields, which a flat index answers
at near-zero cost. A graph database adds ontology design, infrastructure, and ongoing
sync burden that only pays off once queries genuinely need multi-hop traversal (e.g.,
"every guardrail that transitively depends on a regulation that just changed").

**Revisit when**: the `relationships.yaml` edge list grows large enough that agents
regularly need multi-hop answers it can't give cheaply as a flat scan, or when more
than ~3 verticals exist and cross-vertical conflict queries become routine. At that
point, `relationships.yaml`'s rows become the seed for a real graph DB's edges — no
guardrail content needs to change, only how `relationships.yaml` is consumed.

## Lifecycle-phase folders (constitution/development/review), not just topic folders

**Decision**: Each vertical splits guardrails by *when* an agent needs them, mirroring
Speckit's own spec → plan → tasks → review pipeline, rather than purely by regulatory
topic.

**Why**: A guardrail about SBOMs matters when writing the spec (architecture
implications) in a very different way than a guardrail about test traceability matters
at code review. Organizing by lifecycle phase means an agent at task-generation time
never has to load or filter out constitution-phase guardrails it can't act on yet.

**Revisit when**: a vertical's guardrails don't cleanly map to one phase (common for
cross-cutting rules — hence `cross-cutting/` exists as an escape hatch already).

## Binding vs. advisory as a first-class field

**Decision**: Every guardrail declares `binding_tier: binding | advisory` in
frontmatter, and the loading protocol tells agents to treat them differently (block vs.
flag-and-continue).

**Why**: Without this distinction, agents either over-block (treating every best
practice as a hard stop, which erodes trust and gets the harness disabled) or
under-block (treating hard regulatory requirements as suggestions). Collapsing the two
tiers was the single biggest failure mode considered during design.

## Content governance is separate from retrieval mechanics

**Decision**: `governance/CONTENT-OWNERS.md` puts a named role, not an engineer, on the
hook for each guardrail's accuracy, and pilot content is explicitly marked
unreviewed/illustrative.

**Why**: The retrieval/indexing layer is an engineering problem; the guardrail content
itself is a legal/regulatory-risk artifact. Conflating "this loads efficiently" with
"this is correct and current" would let an efficient-but-wrong guardrail ship with
false confidence.
