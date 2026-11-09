# AI-DLC Compliance Harness — Adoption Guide

**Who this is for**: anyone — from someone who has never seen this harness before to
someone who helped build it — who needs to understand exactly how a team starts using
it, in any of four situations: a Speckit project, a BMAD project, a Kiro project, or a
project using none of those. Every command, file, and output shown below was actually
run or actually written during this harness's own pilot build — nothing here is
hypothetical.

---

## Part 0 — Core concepts, in one pass

Skip this if you've read the main [README](../README.md) and
[LOADING-PROTOCOL.md](../agent-interface/LOADING-PROTOCOL.md) already; nothing here
is new, it's just gathered in one place before the framework-specific walkthroughs.

### The problem this solves

Teams building AI-DLC-generated software for regulated US healthcare customers (device
makers, EHR vendors, clinical-data companies) have no structured way to make sure an
agent's generated specs and code actually comply with HIPAA, FDA, ONC, and similar
rules. Today that knowledge lives in people's heads, gets rebuilt per engagement, and
nothing stops an agent from generating a violation quietly.

### The three pillars

1. **Hierarchy** — guardrails are organized by *when* an agent needs them:
   `constitution/` (shapes requirements before code exists), `development/` (applies
   while code/tests are generated), `review/` (checked at verification time). This
   mirrors how every framework below actually structures its own lifecycle.
2. **Index** — one flat, cheap file, `registry/guardrail-index.yaml`, that an agent
   queries *before* opening any guardrail's full text. Filtering by
   `vertical` + `lifecycle_phase` + `applicability_tags` typically narrows 13
   guardrails (as of this writing) down to 1-4 relevant ones — confirmed in this
   session's live Speckit run (8 guardrails in the index at the time, 4 loaded for one
   feature's constitution-phase check).
3. **Graph-ready** — `registry/relationships.yaml` captures guardrail-to-guardrail
   relationships (`traces_to`, `depends_on`, `conflicts_with`, `supersedes`) as a flat,
   versioned edge list today. It's deliberately *not* a graph database yet — see
   [governance/DECISIONS.md](../governance/DECISIONS.md) for when that becomes worth
   building.

### Binding vs. advisory

Every guardrail's frontmatter carries `binding_tier: binding | advisory`.

- **`binding`** — a hard regulatory/legal requirement. An agent treats this as a
  blocker: stop, surface it, don't guess past it.
- **`advisory`** — a best practice. An agent flags it and keeps working.

Collapsing this distinction was the single biggest failure mode the harness's design
was built against: treat every guardrail as binding and agents either over-block
(eroding trust, getting the harness disabled) or, if you go the other way and treat
everything as advisory, under-block (real compliance risk).

### The one thing every adoption path shares: a human sets the vertical

Nothing in this harness auto-detects whether a project is `medical-devices`,
`ehr`, or something else. That's deliberate — like a regulatory classification, it's
a human decision with real consequences if wrong, not something an agent should infer
from a feature description. Every adapter below reads this from one config field:

```yaml
vertical: "medical-devices"   # must match a folder name under verticals/
```

### The algorithm every adapter implements identically

Every integration below — Speckit, BMAD, Kiro, or no framework at all — runs the exact
same seven steps (this is `agent-interface/LOADING-PROTOCOL.md`, restated briefly):

1. Load `compliance-config.yml` (or skip gracefully if it's missing — never fail the
   calling workflow over the harness's own setup).
2. Determine the lifecycle phase (`constitution` / `development` / `review`) — from a
   hook event name where the framework provides one, or stated explicitly where it
   doesn't.
3. Query `registry/guardrail-index.yaml`, filtered by vertical + phase, intersected
   with task tags.
4. Load **only** the matched guardrail `.md` files — never the whole harness.
5. Apply `binding_tier`: block on unresolved binding findings (if configured to),
   flag-and-continue on advisory.
6. Record evidence — which guardrails were checked, and the outcome — to an
   evidence file.
7. Report to the user, then continue (or stop, per step 5).

What differs per framework is **only** how step 1's config is found and how steps 2-7
get triggered. That's the whole story of what follows.

---

## Part 1 — Using it in Speckit

### What Speckit is

GitHub's `spec-kit` — a CLI (`specify`) and a set of agent skills that take a project
through `constitution → specify → clarify → plan → tasks → analyze → implement`, each
step producing a real file (`memory/constitution.md`, `specs/<feature>/spec.md`,
`plan.md`, `tasks.md`).

### Its extension mechanism

Speckit ships a formal extension system: `.specify/extensions.yml` registers
`before_*`/`after_*` hooks at every lifecycle command, `optional: false` for a
mandatory hook (the same pattern Speckit's own core `git` extension uses for
non-negotiable setup steps).

### Step by step

```bash
# 1. Scaffold a new Speckit project
specify init my-project --integration claude

# 2. Install the compliance harness extension
cd my-project
specify extension add /path/to/ai-dlc-harness/integrations/speckit/extension/ai-dlc-compliance --dev
```

Step 2's output, verbatim from this session:

```
✓ Extension installed successfully!

AI-DLC Healthcare Compliance Guardrails (v0.1.0)
Provided commands:
  • speckit-ai-dlc-compliance-check - ...
Config scaffolded:
  • .specify/extensions/ai-dlc-compliance/compliance-config.yml
```

```bash
# 3. The one manual decision
# edit .specify/extensions/ai-dlc-compliance/compliance-config.yml:
#   harness_path: "../ai-dlc-harness"
#   vertical: "medical-devices"
```

```
# 4. Start using Speckit normally — the hooks fire automatically from here
/speckit-constitution <describe the project>
```

### What actually happens (from this session's real run)

Running `/speckit-constitution` on a feature description for "CareLink Glucose
Companion" (a connected CGM companion app):

1. Speckit's own `speckit-constitution` skill checked `.specify/extensions.yml`,
   found the mandatory `before_constitution` hook, and **automatically invoked**
   `/speckit-ai-dlc-compliance-check` before drafting anything.
2. That check loaded `registry/guardrail-index.yaml` (8 entries at the time), filtered
   to `vertical: medical-devices` + `phase: constitution`, intersected with tags
   derived from the feature description, and loaded **4 of 8** guardrail files.
3. One finding was genuinely **blocking**: no SaMD classification had been recorded
   for the product — a regulatory decision no agent can make. The check reported it
   and asked for resolution rather than guessing.
4. The other three findings were binding-but-satisfiable: they got folded directly
   into the drafted `memory/constitution.md` as governance principles (cybersecurity,
   HIPAA technical safeguards, minimum-necessary).
5. Running `/speckit-specify` next correctly **refused to let the feature reach
   `/speckit-plan`** until the SaMD classification gate was resolved — the harness's
   gate held, exactly as designed, confirmed live rather than just claimed in a design
   doc.

### Command reference

| Command | Produces | Our hook |
|---|---|---|
| `/speckit-constitution` | `memory/constitution.md` | `before_constitution` (mandatory) |
| `/speckit-specify` | `specs/<feature>/spec.md` | — *(gap — see Part 10)* |
| `/speckit-clarify` *(optional)* | resolves spec ambiguity | — |
| `/speckit-plan` | technical implementation plan | `after_plan` (mandatory) |
| `/speckit-tasks` | dependency-ordered `tasks.md` | `after_tasks` (mandatory) |
| `/speckit-checklist` *(optional)* | requirement-completeness checklist | — |
| `/speckit-analyze` *(optional)* | cross-artifact consistency check | — |
| `/speckit-implement` | writes the code | `after_implement` (mandatory) |
| `/speckit-converge` | catches up an existing codebase | — |

### Where things live

```
my-project/
  .specify/
    extensions.yml                          <- hook registrations (auto-generated)
    extensions/ai-dlc-compliance/
      compliance-config.yml                 <- the one file you edit
    compliance/<feature-slug>/
      guardrails-applied.md                 <- evidence log
  .claude/skills/speckit-ai-dlc-compliance-check/   <- auto-materialized from our command file
  memory/constitution.md                    <- enriched with guardrail principles
  specs/<feature>/spec.md                   <- gated if a binding finding is unresolved
```

Full reference: [`integrations/speckit/README.md`](../integrations/speckit/README.md).

---

## Part 2 — Using it in BMAD

### What BMAD is

BMAD-METHOD (`bmad-method` on npm) — a persona-driven framework with agents mirroring
an agile team (Analyst, PM, UX Designer, Architect, Dev), moving a project through
planning artifacts (brief → PRD → architecture → epics/stories) and then implementation
(`bmad-build`) and review (`bmad-code-review`).

### Its extension mechanism (verified hands-on against v6.12.4)

BMAD has no Speckit-style extension manifest. Instead, **every workflow skill ships
its own `customize.toml`** describing an overridable surface
(`activation_steps_prepend`, `activation_steps_append`, `persistent_facts`,
`on_complete`, and more). A project supplies overrides by dropping a TOML file at
`{project-root}/_bmad/custom/<workflow-name>.toml` — resolved and merged
automatically every time that workflow activates. Confirmed directly from BMAD's own
`bmad-customize` skill, whose entire job is authoring these files correctly.

### Step by step

```bash
# 1. Install BMAD into a project
npx bmad-method install --modules bmm --tools claude-code

# 2. Install the compliance adapter (copy, not a CLI command — BMAD's extension
#    surface IS "drop files in _bmad/custom/")
cp -r /path/to/ai-dlc-harness/integrations/bmad/skills/ai-dlc-compliance-check \
      .claude/skills/ai-dlc-compliance-check
mkdir -p _bmad/custom/ai-dlc-compliance
cp /path/to/ai-dlc-harness/integrations/bmad/custom/*.toml _bmad/custom/
cp /path/to/ai-dlc-harness/integrations/bmad/compliance-config.yml \
   _bmad/custom/ai-dlc-compliance/compliance-config.yml

# 3. The one manual decision — edit that compliance-config.yml:
#    harness_path: "../ai-dlc-harness"
#    vertical: "medical-devices"
```

### What actually happens (verified with BMAD's own tooling, this session)

Running BMAD's resolver against the installed overrides:

```bash
$ python _bmad/scripts/resolve_customization.py \
    --skill .claude/skills/bmad-architecture --project-root . \
    --key workflow.activation_steps_prepend
{
  "workflow.activation_steps_prepend": [
    "skill:ai-dlc-compliance-check phase=development"
  ]
}
```

That's BMAD's own tooling confirming the override is live — the same confirmation
style as Speckit's `specify artifact list --json` showing `"active": true` on our
hooks. All four overrides (`bmad-product-brief`, `bmad-architecture`,
`bmad-create-epics-and-stories`, `bmad-code-review`) resolved the same way.

From here, running `bmad-product-brief` triggers
`skill:ai-dlc-compliance-check phase=constitution` *before* the workflow greets the
user — so a blocking finding is the first thing they see, not something buried after
the agent's already started talking.

### Workflow mapping

| BMAD workflow | Override file | Harness phase |
|---|---|---|
| `bmad-product-brief` | `bmad-product-brief.toml` | `constitution` |
| `bmad-architecture` | `bmad-architecture.toml` | `development` |
| `bmad-create-epics-and-stories` | `bmad-create-epics-and-stories.toml` | `development` (re-check) |
| `bmad-code-review` | `bmad-code-review.toml` | `review` — runs as one more parallel reviewer in BMAD's own multi-reviewer pass |

### Where things live

```
my-project/
  _bmad/
    custom/
      bmad-product-brief.toml               <- team-committed override
      bmad-architecture.toml
      bmad-create-epics-and-stories.toml
      bmad-code-review.toml
      ai-dlc-compliance/
        compliance-config.yml               <- the one file you edit
  .claude/skills/ai-dlc-compliance-check/    <- the check itself
  _bmad-output/
    compliance/<feature-slug>/
      guardrails-applied.md                 <- evidence log
```

Full reference: [`integrations/bmad/README.md`](../integrations/bmad/README.md).

### A note on BMAD v7

BMAD v7 was in preview (`bmad migrate`, beta) at the time this adapter was built. If
the project you're adopting into is already on v7, re-verify the `customize.toml`
surface hasn't changed shape before trusting this adapter as-is.

---

## Part 3 — Using it in Amazon Kiro

### What Kiro is

AWS's spec-driven AI IDE — the tool behind AWS's own public "AI-DLC" (AI-Driven
Development Lifecycle) methodology and its Forward Deployed Engineering organization.
Kiro works from a three-document spec (`requirements.md`, `design.md`, `tasks.md`) per
feature.

### Its extension mechanism (from kiro.dev's own docs)

- **Steering files** (`.kiro/steering/*.md`) — markdown with YAML front matter,
  `inclusion: always | fileMatch | manual | auto`. `always` files load into every
  interaction, the same role Kiro's own `product.md`/`tech.md`/`structure.md` files
  play — this is Kiro's constitution-equivalent, since Kiro's 3-document spec model
  has no separate constitution step.
- **Hooks** (`.kiro/hooks/*.json`) — JSON files with a `trigger`
  (`PostFileSave`/`PreToolUse`/`PostToolUse`/`Stop`), an optional `matcher` (regex),
  and an `action` (`"command"` runs a shell command, `"agent"` injects a prompt —
  this adapter uses `"agent"` throughout).

> **This adapter was built from AWS's official documentation, not hands-on tested** —
> Kiro is a downloadable IDE, not something installable and introspectable from a
> terminal the way Speckit's and BMAD's CLIs were. The JSON is schema-valid; verify
> trigger/matcher behavior against a real Kiro session before trusting it the way the
> other two adapters have been verified.

### Step by step

```bash
mkdir -p .kiro/steering .kiro/hooks
cp /path/to/ai-dlc-harness/integrations/kiro/steering/ai-dlc-compliance.md .kiro/steering/
cp /path/to/ai-dlc-harness/integrations/kiro/hooks/*.json .kiro/hooks/
```

Then edit `.kiro/steering/ai-dlc-compliance.md` — the one manual decision, same as
every other adapter — and set `harness_path` and `vertical` in the fields called out
at the top of that file.

### Phase mapping

| Harness phase | Kiro mechanism |
|---|---|
| `constitution` | the `always`-included steering file itself |
| `development` | `PostFileSave` hook matched on `(design\|tasks)\.md$` |
| `review` | `PostFileSave` hook matched on source-file extensions (tune the regex per project) |

Full reference, including the honest limitations list: [`integrations/kiro/README.md`](../integrations/kiro/README.md).

---

## Part 4 — Using it with no framework at all

### When this applies

The customer isn't using Speckit, BMAD, or Kiro — a bespoke internal pipeline, or a
team working directly in a coding agent (Claude Code, Cursor, Copilot) with no
spec-driven layer on top.

### The honest tradeoff

Nothing fires this automatically. The agent (prompted by the user) decides when a
piece of work matches a phase and invokes the check itself. That's a real tradeoff —
nothing enforces it, so it's easier to skip — not a lesser version of the same
guarantee the hook-based adapters give. Say this plainly to anyone evaluating this
path.

### Step by step

```bash
cp -r /path/to/ai-dlc-harness/integrations/generic/skill ai-dlc-compliance-check
cp /path/to/ai-dlc-harness/integrations/generic/compliance-config.yml ./compliance-config.yml
# edit harness_path and vertical
```

If the coding agent has no custom-skill mechanism at all, paste the skill's content
directly into the project's `AGENTS.md`/`CLAUDE.md` instead.

### Worked example

A developer using plain Claude Code (no framework) on a `medical-devices` project,
about to design a new feature, would prompt something like: *"Before we design this,
run the AI-DLC compliance check for the development phase."* The agent then follows
`skill/SKILL.md`'s steps 1-7 manually — same index query, same binding/advisory
handling, same evidence file — just without a hook triggering it.

### When this degrades further

If even a manually-invoked skill is more automation than a team wants, the harness
still has one more tier: hand them `verticals/<vertical>/INDEX.md` as a reviewed
checklist, pure documentation, no agent involvement at all. Worse than the skill, but
still real and intentional — see the main [README](../README.md).

Full reference: [`integrations/generic/README.md`](../integrations/generic/README.md).

---

## Part 5 — Side by side

| | Speckit | BMAD | Kiro | No framework |
|---|---|---|---|---|
| **Trigger** | Automatic (`extensions.yml` hooks) | Automatic (`customize.toml` overrides) | Automatic (hooks) + always-on (steering) | Manual |
| **Install step** | `specify extension add ... --dev` | Copy files into `_bmad/custom/` | Copy files into `.kiro/` | Copy a skill file |
| **Config file** | `.specify/extensions/ai-dlc-compliance/compliance-config.yml` | `_bmad/custom/ai-dlc-compliance/compliance-config.yml` | Fields at the top of `.kiro/steering/ai-dlc-compliance.md` | `compliance-config.yml` at project root |
| **Constitution-phase hook** | `before_constitution` | `bmad-product-brief` activation step | the always-on steering file itself | invoked manually |
| **Development-phase hook** | `after_plan`, `after_tasks` | `bmad-architecture`, `bmad-create-epics-and-stories` | `PostFileSave` on `design.md`/`tasks.md` | invoked manually |
| **Review-phase hook** | `after_implement` | `bmad-code-review` (as a parallel reviewer) | `PostFileSave` on source files | invoked manually |
| **Validation confidence** | Hands-on verified (installed, ran, inspected via Speckit's own introspection) | Hands-on verified (installed, ran BMAD's own resolver) | Built from official docs, **not** hands-on tested | N/A — no framework to verify against |
| **Evidence log location** | `.specify/compliance/<slug>/` | `_bmad-output/compliance/<slug>/` | `.kiro/compliance/<slug>/` | `.ai-dlc-compliance/<slug>/` |

---

## Part 6 — Adding a new vertical (worked example: `ehr`)

This is exactly what was done to add the `ehr` vertical covering both EHR-platform
development (e.g., a Greenway-shape customer, contributing to the EHR product itself)
and EHR-interoperability development (e.g., a DaVita-shape customer, building an app
that connects to an EHR) — one vertical, two shapes distinguished by
`applicability_tags` rather than two separate verticals, since they share most of
their regulatory ground (FHIR, HIPAA).

1. **Copy the template**: `verticals/_template/` → `verticals/ehr/`.
2. **Write guardrail files** sourced from real regulations, one per constitution/
   development/review phase as needed — for `ehr`, that was ONC certification scope
   and the information blocking rule (constitution), SMART on FHIR authorization and
   USCDI data mapping (development), and interoperability conformance testing
   (review). Each file's frontmatter follows `schema/guardrail.schema.json` exactly,
   same as every other guardrail in the harness.
3. **Tag for both shapes**: `applicability_tags` on each guardrail includes
   `ehr-platform-feature` and/or `ehr-interoperability-app` as appropriate, so the
   index's tag-intersection step (Part 0) naturally surfaces the right subset per
   customer shape without forking the vertical.
4. **Add rows to `registry/guardrail-index.yaml`** — one per guardrail, mirroring its
   frontmatter.
5. **Add edges to `registry/relationships.yaml`** where a real relationship exists —
   `ehr`'s edges include a genuine `conflicts_with` between HIPAA minimum-necessary
   and information blocking, which pull in opposite directions on the same kind of
   feature (narrowing an API response for privacy reasons can itself look like an
   information-blocking restriction).
6. **Record it in `governance/CHANGE-LOG.md`**.
7. **Get SME sign-off** before any of it is treated as authoritative — see
   `governance/CONTENT-OWNERS.md`. Everything above is pilot content until that
   happens.

**Nothing in any framework adapter needed to change.** That's the actual proof this
design works the way it was meant to: the hierarchy+index pattern absorbed a new
vertical with zero changes to the Speckit extension, the BMAD overrides, the Kiro
hooks, or the generic skill.

---

## Part 7 — How the pieces actually connect (file-by-file)

This part exists because "a hook fires automatically" is easy to say and hard to
picture. There is no hidden runtime, no background watcher, no event bus. Every step
below is an agent (Claude, or whichever tool is driving) reading one file and doing
exactly what it says — which happens to include "now go read this other file." It's
documents, not software dispatch, all the way down.

Worked example, hands-on verified this session: a user asks for a product brief in a
BMAD project with the adapter installed.

1. **Your words** → Claude Code's skill-matcher compares what you typed against every
   installed skill's `description` field and picks `bmad-product-brief`. No file
   involved yet.
2. **`.claude/skills/bmad-product-brief/SKILL.md`** *(BMAD's file, untouched by us)*
   — its own text, under `## On Activation`, instructs: *"Resolve customization...
   Execute each entry in `activation_steps_prepend` in order."* That sentence is the
   entire origin of the chain — a plain-English instruction inside a markdown file.
3. **`_bmad/scripts/resolve_customization.py`** *(BMAD's own script)* — a real Python
   script the agent actually runs. It merges three TOML layers (the skill's bundled
   defaults, a team override, an optional personal override) and prints the merged
   result as JSON.
4. **`_bmad/custom/bmad-product-brief.toml`** *(our file — copied verbatim from
   `ai-dlc-harness/integrations/bmad/custom/bmad-product-brief.toml`)* — the entire
   content is:
   ```toml
   [workflow]
   activation_steps_prepend = [
     "skill:ai-dlc-compliance-check phase=constitution",
   ]
   ```
   One string. That's the whole mechanism. "Installing the adapter" *is* this file
   existing in this folder — nothing else registers it anywhere.
5. **`.claude/skills/ai-dlc-compliance-check/SKILL.md`** *(our second file — copied
   from `ai-dlc-harness/integrations/bmad/skills/ai-dlc-compliance-check/`)* — step
   2's instruction said "execute each entry." BMAD has a documented convention (also
   used for `persistent_facts`, `doc_standards`, etc.): a string prefixed `skill:NAME`
   means "go invoke the skill named NAME." The agent stops following
   `bmad-product-brief` and starts following *this* file instead, with `phase=
   constitution` as its argument.
6. **`compliance-config.yml` + the harness's `registry/guardrail-index.yaml`** —
   still inside step 5's instructions: read our third file
   (`_bmad/custom/ai-dlc-compliance/compliance-config.yml`), resolve `harness_path`,
   open `<harness_path>/registry/guardrail-index.yaml`, filter it, load only the
   matched guardrail `.md` files.
7. **Activation complete** → control returns to `bmad-product-brief`'s own
   instructions, which say *"do not begin the main workflow until all activation
   steps have been completed."* Only now does the actual brief conversation start.

**Only 3 of these 7 steps are ours** (4, 5, 6's config file) — everything else already
existed the moment `npx bmad-method install` ran. Speckit's equivalent chain swaps
steps 2-4 for its `extensions.yml` hook registry; Kiro's swaps them for a steering
file + a hook JSON. Step 5 onward — our skill, the config, the harness lookup — is
identical in every adapter.

### Path resolution, three hops, traced literally

`compliance-config.yml` never contains the string `guardrail-index.yaml` anywhere —
that filename is hardcoded inside `ai-dlc-compliance-check/SKILL.md`'s own
instructions, not configurable. The config file only supplies a *directory*; the
skill supplies the *filename*. Three separate concatenations get you from a project
root to one specific guardrail file:

```
Hop 1 — project root + compliance-config.yml's harness_path → the harness repo root
   C:\Projects\AIPDLC\demo-bmad
 + ../ai-dlc-harness                                    (from compliance-config.yml)
 = C:\Projects\AIPDLC\ai-dlc-harness

Hop 2 — harness repo root + a hardcoded filename → the index file
   C:\Projects\AIPDLC\ai-dlc-harness
 + /registry/guardrail-index.yaml                        (hardcoded in SKILL.md)
 = C:\Projects\AIPDLC\ai-dlc-harness\registry\guardrail-index.yaml

Hop 3 — harness repo root + a path FIELD FROM THAT INDEX → one guardrail file
   C:\Projects\AIPDLC\ai-dlc-harness
 + verticals/medical-devices/constitution/samd-classification.md   (the index row's own `path:` field)
 = C:\Projects\AIPDLC\ai-dlc-harness\verticals\medical-devices\constitution\samd-classification.md
```

| Hop | Comes from | Configurable or hardcoded? |
|---|---|---|
| 1. project root → harness root | `compliance-config.yml`'s `harness_path` | **configurable** — the one thing a project edits |
| 2. harness root → the index file | `ai-dlc-compliance-check/SKILL.md` | **hardcoded** — identical in every adapter |
| 3. harness root → one guardrail file | `guardrail-index.yaml`'s own `path:` field per row | **hardcoded in the index** — set when the guardrail was authored |

`vertical: "medical-devices"` in `compliance-config.yml` doesn't resolve a path at
all — it's a *filter value* applied against `guardrail-index.yaml`'s rows in Hop 2,
before any `path:` field is even looked at.

## Part 8 — Supporting other coding tools: Claude, Cursor, Devin, and beyond

The question this section answers: we've been assuming Claude Code throughout — what
happens when a team uses Cursor, Windsurf, Copilot, or Devin instead?

### The split that makes this tractable

Separate **the logic** from **the loader**:

- **The logic** — `agent-interface/LOADING-PROTOCOL.md` and every `ai-dlc-compliance-
  check` skill's prose. Plain English. Nothing in it says "Claude." Any agent that can
  read a file and follow instructions can execute it.
- **The loader** — the tool-specific plumbing that gets that prose in front of the
  agent at the right moment. This is the only part that varies.

Every adapter we've built is this same pair, with a different loader: Speckit's
`extensions.yml` hooks, BMAD's `_bmad/custom/*.toml` overrides, Kiro's steering/hooks
files, the generic adapter's manual invocation. Adding tool support is adding another
loader, never rewriting the logic.

### BMAD already solved most of this — verified, real data

BMAD's own installer (`npx bmad-method install --list-tools`) supports roughly 45
coding tools, each with its own install target directory:

| Tool | Target dir |
|---|---|
| Claude Code | `.claude/skills` |
| Cursor | `.agents/skills` |
| GitHub Copilot | `.agents/skills` |
| Cline | `.cline/skills` |
| Windsurf | `.agents/skills` |
| Kiro | `.kiro/skills` |
| ...~39 more | mostly `.agents/skills`, a handful with their own folder |

Our adapter's trigger mechanism (`_bmad/custom/*.toml`, `resolve_customization.py`,
`activation_steps_prepend`) is BMAD's own Python-driven machinery — it doesn't know or
care which underlying agent reads the result. So for a team running
`bmad-method install --tools cursor` instead of `--tools claude-code`, our four
override `.toml` files need **zero changes**. The only adjustment is which folder the
`ai-dlc-compliance-check` skill gets copied into:

```bash
# claude-code:
cp -r .../ai-dlc-compliance-check .claude/skills/ai-dlc-compliance-check
# cursor, per the table above:
cp -r .../ai-dlc-compliance-check .agents/skills/ai-dlc-compliance-check
```

**Honest caveat**: only the `.claude/skills` path has been hands-on installed and
tested (same as every "hands-on verified" claim in this guide). Whether `.agents/
skills` expects an identical `SKILL.md` frontmatter format is unverified — worth a
real test before promising it, not assumed from the directory name alone.

### Where real per-tool work is still needed

If a team uses Cursor, Windsurf, or Copilot **directly — no BMAD, no Speckit in the
middle** — that's the generic adapter's territory, and there a real per-tool loader
has to be built, because nothing is translating for us. Cursor's own convention is
`.cursor/rules/*.mdc` with its own frontmatter (globs, `alwaysApply`); Copilot's is
`.github/copilot-instructions.md`. Each needs its own thin wrapper — same shape of
work as building `integrations/kiro/` was. The body text (the 7-step algorithm)
copy-pastes unchanged every time; only the wrapper differs.

### Devin — flagged honestly, not guessed at

Devin is not in BMAD's supported tool list, and it isn't really in the same family as
the others. Cursor, Cline, Windsurf, and Claude Code all read local files an agent
discovers and follows. Devin, as far as is known without direct investigation, works
through its own "Knowledge" and "Playbooks" concepts — more cloud-hosted and API/UI-
driven than "drop a markdown file in a folder." This needs real investigation before
anyone can say whether the same loader pattern applies, or whether Devin needs
something structurally different (pushed via an API rather than read from a file).
Don't promise Devin support without that investigation first.

## Part 9 — Marketplace distribution (future work, not yet built)

`harness_path` today is a relative path a human types by hand (`"../ai-dlc-harness"`),
which only works because the harness checkout happens to sit next to the consuming
project on the same machine — true for every demo in this guide because both were
cloned into `C:\Projects\AIPDLC` by hand. A marketplace customer never does that; they
install something and don't manually position a sibling repo first. This section is
the honest answer to "what breaks, and what has to change."

### What doesn't change

The mechanism survives untouched: `compliance-config.yml` still holds a pointer,
`ai-dlc-compliance-check` still reads `registry/guardrail-index.yaml` relative to
that pointer. What changes is *who sets `harness_path`* and *what it points at* —
nothing else in the chain from Part 7 needs editing.

### Two distribution models

- **Model A — vendored.** The install step downloads the harness content itself into
  a known, managed location (think: how a dependency folder works), and
  `harness_path` gets set automatically to point there. Checks run fully offline
  after install.
- **Model B — remote.** `harness_path` becomes an HTTPS endpoint instead of a
  filesystem path; the check fetches guardrail content over the network every time it
  runs.

**Recommendation: Model A**, for two reasons specific to this product, not just
convenience:
1. **Offline/air-gapped operation.** Several target customers (medical device, EHR)
   run in locked-down environments. A compliance check with a hard network dependency,
   firing every time someone drafts a PRD, is a real adoption blocker.
2. **A compliance rule that silently changes mid-project is a liability, not a
   feature.** "Always reads live" is fine for a pilot one team controls. A marketplace
   customer wants a *pinned* version — the content a team builds against should only
   change when they deliberately update, the same way a dependency version is pinned.

### What's genuinely new, that doesn't exist today

- **Versioning/pinning** — install pins a version; update is an explicit, separate step.
- **Entitlements** — if verticals are sold separately, the check needs to verify the
  customer is actually licensed for the vertical it's about to query.
- **An actual installer** — today, "install" is `cp` run by hand. Distribution needs
  something that fetches, places, and records the pinned version automatically.

### How `harness_path` would look, concretely, under each strategy

| Install strategy | Example `harness_path` value |
|---|---|
| Vendored per-project | `C:\Projects\AIPDLC\demo-bmad\.ai-dlc-harness` — absolute, inside the project |
| Shared per-user cache (one copy, many projects) | `C:\Users\ADMIN\.ai-dlc-harness\` — absolute, outside any one project |
| Versioned/pinned cache | `C:\Users\ADMIN\.ai-dlc-harness\v1.2.0\` — the version baked into the path itself |

### Mapping onto the marketplace channels already discussed

| Channel | What changes for `harness_path` |
|---|---|
| Internal company catalog | Lowest lift — point at a company-standard managed location instead of "wherever you cloned it." No real versioning/entitlement need since it's internal. |
| BMAD's own distribution | BMAD's installer already supports `--custom-source <git-url>` for custom modules — a real, existing lever worth using for the thin adapter. The harness *content* is less naturally a "BMAD module" (domain knowledge, not agent personas), so it likely still needs its own vendoring step. |
| Claude plugin marketplace | Natural fit — plugin installs land in a known location the skill could resolve without the user ever typing a path. |
| AWS Marketplace | Mostly a procurement/billing wrapper for this shape of product (content read by a local agent, not a running service) — would still need Model A underneath, with AWS Marketplace handling the transaction. |

This entire part is undesigned, not just unbuilt — it belongs on the roadmap next to
SME sign-off and Kiro hands-on validation, not treated as a detail to bolt on later.

## Part 10 — FAQ / known gaps

**How do I know which vertical to pick?** It's a human decision — regulatory affairs
or whoever owns compliance for that customer engagement, not engineering. If no
existing vertical fits, that's the trigger for Part 6.

**What if my framework isn't Speckit, BMAD, or Kiro?** Use the generic adapter (Part
4) as the floor, and consider whether the framework has its own hook/extension system
worth building a dedicated adapter for later — see the session notes on BMAD/Kiro/
HumanLayer/AWS-FDE naming for how that evaluation was done for these three.

**What if two guardrails conflict?** That's what `relationships.yaml`'s
`conflicts_with` edges are for — see `ehr`'s HIPAA-vs-information-blocking edge and
`medical-devices`'s risk-vs-cybersecurity edge as worked examples. These need an
explicit human precedence call; no adapter resolves them automatically.

**Known gaps, carried over from the dry run and still open:**
- No compliance hook fires at Speckit's `before_specify`/`after_specify`, even though
  guardrail `GR-MD-CLASS-001` literally requires a check "before any feature spec is
  written" — currently has to be carried forward by hand.
- `binding_tier` conflates "binding and satisfiable by writing it into this artifact
  now" with "binding and blocked on an external human decision" — worth a third state.
- `registry/guardrail-index.yaml` is hand-maintained; needs an auto-generation script
  from guardrail frontmatter before this scales past a handful of verticals.
- The Kiro adapter is unverified against a real Kiro session (see Part 3).
- Nothing validates that a `vertical:` string in any adapter's config actually matches
  a real folder under `verticals/` — a typo currently fails silently (zero guardrails
  matched) rather than erroring.
- The `.agents/skills` (and other non-`.claude/skills`) install targets BMAD supports
  for other tools (Cursor, Windsurf, Copilot, etc.) are unverified — only `.claude/
  skills` has been hands-on installed and tested (see Part 8).
- Devin specifically needs real investigation before any claim about support — it
  doesn't fit the local-file loader pattern the other tools share (see Part 8).
- No marketplace installer exists yet in any form — today "install" is `cp` run by
  hand, with a manually-typed relative `harness_path`. Versioning, entitlements, and
  an automated install flow are all undesigned (see Part 9).
