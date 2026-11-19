# AI-DLC Compliance Guardrails (Spec Kit extension)

Wires the [AI-DLC compliance harness](../../../../README.md) into a Spec Kit project
using Spec Kit's own extension/hook mechanism — no hand-edited constitution sections,
no custom tooling outside what Spec Kit already supports.

## What it does

Registers `speckit.ai-dlc-compliance.check` as a **mandatory hook** at four points in
the Spec Kit lifecycle:

| Hook | Harness phase loaded |
|---|---|
| `before_constitution` | `constitution/` — e.g. SaMD classification, premarket cybersecurity |
| `after_plan` | `development/` — e.g. IEC 62304 safety class, ISO 14971 risk feedback |
| `after_tasks` | `development/` (re-checked against the concrete task list) |
| `after_implement` | `review/` — e.g. 21 CFR 820.30 design-control traceability |

Each run queries only the harness's flat `registry/guardrail-index.yaml` — never the
full guardrail prose — then loads just the matched files. See
`commands/speckit.ai-dlc-compliance.check.md` for the exact algorithm, which mirrors
`../../agent-interface/LOADING-PROTOCOL.md` in the harness itself.

## Install into a Spec Kit project

From inside the target Spec Kit project (one that already ran `specify init`):

```bash
specify extension add /path/to/ai-dlc-harness/integrations/speckit/extension/ai-dlc-compliance --dev
```

This copies `compliance-config.yml` into
`.specify/extensions/ai-dlc-compliance/compliance-config.yml`. Edit two fields there:

```yaml
harness_path: "../ai-dlc-harness"   # where this project can find the harness checkout
vertical: "medical-devices"          # which verticals/<name> applies to this project
```

## Why a mandatory (non-optional) hook

Every hook here is `optional: false`, matching how the `git` extension treats
`before_constitution` (repo init) and `before_specify` (branch creation) as
non-negotiable setup steps. Compliance guardrails are the same kind of thing: skipping
them isn't a style choice. If a project genuinely doesn't want a phase checked, turn it
off explicitly in `compliance-config.yml` (`enabled_phases`) rather than relying on the
agent to decline the hook each time — that keeps the decision visible and auditable
instead of silent.

## What this does not do yet

- It does not call out to a real graph database — relationship queries
  (`registry/relationships.yaml`) aren't wired into this command yet; see the harness's
  `governance/DECISIONS.md` for when that becomes worth building.
- It does not yet have a CI-side check (failing a PR if a required phase's hook never
  ran) — today it relies on the agent actually invoking the hook, as Spec Kit's other
  core extensions (e.g. `git`) also do.
