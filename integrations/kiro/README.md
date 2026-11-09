# AI-DLC Compliance Guardrails (Amazon Kiro adapter)

Wires the [AI-DLC compliance harness](../../README.md) into
[Amazon Kiro](https://kiro.dev) — AWS's spec-driven AI IDE, the tool behind AWS's own
public "AI-DLC" (AI-Driven Development Lifecycle) methodology and its new Forward
Deployed Engineering organization.

> **Validation note, read before relying on this**: unlike the Speckit and BMAD
> adapters, this one was **not** hands-on tested in a live Kiro session — Kiro is a
> downloadable IDE/CLI, not something installable and introspectable from this
> terminal the way `specify-cli` and `bmad-method` were. This adapter is built
> directly from Kiro's own official documentation (steering file format and hook JSON
> schema, both fetched from kiro.dev/docs), and the JSON files here are schema-valid,
> but **verify the trigger names and matcher behavior against a real Kiro session**
> before treating this as production-ready, the same way you'd want the medical-devices
> guardrail content itself reviewed by an SME before trusting it.

## The mechanism

Kiro has two extension points relevant here, both confirmed from kiro.dev's own docs:

- **Steering files** (`.kiro/steering/*.md`) — markdown with YAML front matter
  (`inclusion: always | fileMatch | manual | auto`). `always` files load into every
  interaction, the same way `product.md`/`tech.md`/`structure.md` do — Kiro's own
  "constitution" equivalent.
- **Hooks** (`.kiro/hooks/*.json`) — one JSON file per hook (or set of hooks), each
  with a `trigger` (`PostFileSave`, `PreToolUse`, `PostToolUse`, `Stop`), an optional
  `matcher` (regex against the file path or tool ID), and an `action`
  (`type: "command"` runs a shell command, `type: "agent"` injects a prompt into the
  conversation — this adapter uses `"agent"` throughout, same reasoning as the other
  two adapters: we want the agent to reason and load files, not run an opaque script).

Kiro's spec model (`requirements.md` / `design.md` / `tasks.md`) has **no separate
constitution step** the way Speckit does. The mapping this adapter uses:

| Harness phase | Kiro mechanism | Why |
|---|---|---|
| `constitution/` | the `always`-included steering file (`steering/ai-dlc-compliance.md`) | No dedicated constitution file in Kiro — the always-loaded steering file *is* the constitution-equivalent, same role as `product.md`/`tech.md`/`structure.md` |
| `development/` | `PostFileSave` hook matched on `(design|tasks)\.md$` | Fires when the design or task breakdown is saved, before implementation starts |
| `review/` | `PostFileSave` hook matched on source-file extensions | Fires when actual code is saved — adjust the matcher to your project's real source extensions/paths |

## Install into a Kiro project

```bash
mkdir -p .kiro/steering .kiro/hooks
cp /path/to/ai-dlc-harness/integrations/kiro/steering/ai-dlc-compliance.md .kiro/steering/
cp /path/to/ai-dlc-harness/integrations/kiro/hooks/*.json .kiro/hooks/
```

Then edit `.kiro/steering/ai-dlc-compliance.md` and set `harness_path` and this
project's `vertical` (the two fields called out at the top of the file) — same one
manual decision as every other adapter in this harness.

## What this does not do yet

- **Not hands-on verified** — see the note at the top. Re-test trigger names and
  matcher regex syntax against a real Kiro session before depending on it.
- The review-phase hook's matcher is a generic source-extension regex
  (`\.(py|ts|tsx|js|jsx|java|cs|go)$`) — tighten it per project rather than relying on
  the default.
- No evidence-logging automation beyond the agent prompt's own instruction to write to
  `.kiro/compliance/` — unlike Speckit's extension, there's no enforced write step.
- `PreToolUse`/`PostToolUse` triggers (which could match more precisely on write-type
  tool calls rather than file-save events) weren't used here because the exact tool-ID/
  category-tag vocabulary wasn't confirmed from available documentation — worth
  revisiting once that's verified against a real Kiro install.
