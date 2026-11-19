# AI-DLC Compliance Guardrails (BMAD adapter)

Wires the [AI-DLC compliance harness](../../README.md) into a
[BMAD-METHOD](https://github.com/bmadcode/bmad-method) project using BMAD's own
workflow-customization surface — no fork of BMAD, no new CLI, nothing outside what
BMAD already supports.

> Verified hands-on against BMAD v6.12.4 (`core` + `bmm` modules) installed via
> `npx bmad-method install --modules bmm --tools claude-code`. BMAD v7 is in preview
> as of this writing (`bmad migrate` beta) — re-verify this adapter against it before
> relying on it for a v7 project.

## The mechanism (how this differs from the Speckit adapter)

Speckit has a formal extension system with registered `before_*`/`after_*` hooks.
BMAD doesn't have an equivalent "extension" concept — instead, **every BMAD workflow
skill ships its own `customize.toml`** describing an overridable surface
(`activation_steps_prepend`, `activation_steps_append`, `persistent_facts`,
`on_complete`, and more), and a project supplies its own values by dropping a TOML
file at `{project-root}/_bmad/custom/<workflow-name>.toml` — team-committed, resolved
and merged automatically every time that workflow activates. This is confirmed by
BMAD's own `bmad-customize` skill, whose entire job is authoring these override files.

So instead of registering hooks in a manifest, this adapter is just **four ready-made
override TOML files** (in `custom/`) a project copies into its own `_bmad/custom/`,
plus **one skill** (`skills/ai-dlc-compliance-check/`) those overrides invoke.

## What it does

| BMAD workflow | Override file | Harness phase loaded |
|---|---|---|
| `bmad-product-brief` | `custom/bmad-product-brief.toml` | `constitution/` — earliest planning artifact, equivalent to Speckit's `before_constitution` |
| `bmad-architecture` | `custom/bmad-architecture.toml` | `development/` — before the architecture spine is drafted |
| `bmad-create-epics-and-stories` | `custom/bmad-create-epics-and-stories.toml` | `development/` — re-checked against concrete epics/stories |
| `bmad-code-review` | `custom/bmad-code-review.toml` | `review/` — runs as one more parallel reviewer in BMAD's own multi-reviewer pass |

Each override's `activation_steps_prepend` invokes
`skill:ai-dlc-compliance-check phase=<phase>` — run *before* the workflow greets the
user, so a blocking finding is the first thing they see, not something buried after
the workflow has already started.

## Install into a BMAD project

From inside a project that already ran `npx bmad-method install`:

```bash
# 1. Copy the compliance-check skill to wherever this project's tools are configured
#    (same target dir BMAD itself installed into, e.g. .claude/skills for Claude Code)
cp -r /path/to/ai-dlc-harness/integrations/bmad/skills/ai-dlc-compliance-check \
      .claude/skills/ai-dlc-compliance-check

# 2. Copy the workflow overrides into BMAD's own override location
mkdir -p _bmad/custom
cp /path/to/ai-dlc-harness/integrations/bmad/custom/*.toml _bmad/custom/

# 3. Copy and configure the compliance config
mkdir -p _bmad/custom/ai-dlc-compliance
cp /path/to/ai-dlc-harness/integrations/bmad/compliance-config.yml \
   _bmad/custom/ai-dlc-compliance/compliance-config.yml
# then edit harness_path and vertical in that file
```

There's no CLI equivalent of Speckit's `specify extension add` here — BMAD's
extension surface is "drop files in `_bmad/custom/`," so installing this adapter *is*
copying files. A packaged install step (an npm postinstall script, or inclusion as a
BMAD "module") is listed as a next step below.

## Standing context: AGENTS.md

BMAD's `bmad-project-context` skill manages a shared `AGENTS.md` block every BMAD
workflow reads automatically. Add one line there (via that skill, not by hand-editing)
so every agent in the project — not just the ones this adapter hooks — knows the
harness exists:

```
This project uses the AI-DLC compliance harness (vertical: <your-vertical>).
See _bmad/custom/ai-dlc-compliance/compliance-config.yml and
<harness_path>/agent-interface/LOADING-PROTOCOL.md.
```

## What this does not do yet

- No automated install step — see `integrations/speckit`'s equivalent CLI command for
  comparison; a BMAD "module" packaging (so `bmad-method install --custom-source
  <this-path>` installs everything in one step) is on the roadmap.
- Not verified against BMAD v7 (in preview as of this writing).
- `bmad-build`/`bmad-build-auto` (the actual code-writing step) has no override here
  yet — review-phase guardrails currently catch issues at `bmad-code-review`, one step
  later than Speckit's `after_implement`. Worth closing if BMAD teams skip code-review
  on low-stakes changes.
