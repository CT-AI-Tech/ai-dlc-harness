# Plugging the harness into a Spec Kit AI-DLC repo

This harness is meant to live **alongside**, not inside, a Spec Kit project repo — one
harness, reused across many customer/solution repos. Each Spec Kit repo pulls in only
what it needs, via Spec Kit's own **extension** mechanism.

> Earlier drafts of this doc proposed hand-editing `memory/constitution.md` and
> building bespoke tooling. That's no longer necessary: Spec Kit (`specify-cli`) ships
> a real extension system — `.specify/extensions.yml`, `before_*`/`after_*` hooks at
> every lifecycle command, local-path extension install via `specify extension add
> <path> --dev` — that's a perfect fit for this. Use `extension/ai-dlc-compliance/`
> below instead of wiring anything by hand.

## Where it attaches in Spec Kit's pipeline

Spec Kit's own flow is `constitution → specify → clarify → plan → tasks → analyze →
implement`, and it fires a hook before and after every one of those. The
`ai-dlc-compliance` extension registers at four of them, matching the harness's
lifecycle-phase folders:

| Spec Kit hook | Harness folder loaded |
|---|---|
| `before_constitution` | `verticals/<vertical>/constitution/` |
| `after_plan` | `verticals/<vertical>/development/` |
| `after_tasks` | `verticals/<vertical>/development/` (re-checked against concrete tasks) |
| `after_implement` | `verticals/<vertical>/review/` |

See [`extension/ai-dlc-compliance/README.md`](extension/ai-dlc-compliance/README.md)
for exactly how it's registered and what each hook does.

## Installing into a target project

```bash
cd your-speckit-project          # already ran `specify init`
specify extension add /path/to/ai-dlc-harness/integrations/speckit/extension/ai-dlc-compliance --dev
```

Then edit `.specify/extensions/ai-dlc-compliance/compliance-config.yml` and set:

```yaml
harness_path: "../ai-dlc-harness"   # where this project's checkout can find the harness
vertical: "medical-devices"          # which verticals/<name> applies
```

From then on, running `/speckit-constitution`, `/speckit-plan`, `/speckit-tasks`, or
`/speckit-implement` in that project automatically triggers the matching compliance
check — the agent sees the mandatory-hook block Spec Kit emits (see
`speckit-constitution`'s `SKILL.md`, "Pre-Execution Checks") and invokes
`/speckit-ai-dlc-compliance-check` itself; nothing outside Spec Kit's normal flow is
needed.

## Reuse across customers

The harness (`ai-dlc-harness/`) and this extension are versioned together and
referenced by path or pinned commit from each customer's Spec Kit repo — the same
pattern Spec Kit's own `git`/`github`/`assess` core extensions use for
distribution. A harness update (new vertical, revised guardrail) doesn't require
touching the target repo beyond bumping the pinned reference.

## Not yet built (next steps once the pilot is validated)

- Publish `ai-dlc-compliance` through a private Spec Kit extension catalog
  (`specify preset catalog add` / `specify extension catalog add`) instead of a raw
  local path, so customer repos can `specify extension add ai-dlc-compliance` by name.
- A generation script that regenerates `registry/guardrail-index.yaml` from guardrail
  frontmatter automatically (currently hand-maintained for the pilot's 8 guardrails).
- Wire `registry/relationships.yaml` into `speckit.compliance.check` for the
  `conflicts_with`/`depends_on` cases, once there's a real recurring need for it (see
  `../../governance/DECISIONS.md`).
- A CI check that fails a PR if a feature touched a vertical with no compliance-check
  evidence recorded under `.specify/compliance/`.
