---
inclusion: always
---

# AI-DLC Compliance Harness

This project is covered by the AI-DLC compliance harness. Its guardrails are binding
project context, on the same footing as this file's own content — treat them the way
you'd treat `product.md`/`tech.md`/`structure.md`.

- **Harness location**: `../ai-dlc-harness` (adjust if your checkout differs — set this
  once per project, same value used in `.kiro/hooks/ai-dlc-compliance-*.json`)
- **This project's vertical**: `medical-devices` — replace with your actual vertical
  (must match a folder under `<harness_path>/verticals/`)
- **Loading protocol**: `<harness_path>/agent-interface/LOADING-PROTOCOL.md` — read
  this once, not every turn, to understand the index-first lookup pattern

## Constitution-phase guardrails (always in effect)

Kiro's spec model (`requirements.md` / `design.md` / `tasks.md`) has no separate
"constitution" document the way Speckit does — this always-included steering file
*is* that constitution-equivalent. Before treating any requirement as settled, check:

1. Query `<harness_path>/registry/guardrail-index.yaml` for entries where
   `vertical == <this project's vertical> OR "cross-cutting"` AND
   `lifecycle_phase == "constitution" OR "cross-cutting"`.
2. Load only the matched guardrail files (typically 2-5, not the whole harness).
3. Treat `binding` findings as hard constraints — flag to the user, don't guess past
   them. Treat `advisory` findings as notes.

Development-phase and review-phase guardrails are **not** loaded here — see
`.kiro/hooks/ai-dlc-compliance-development.json` and
`.kiro/hooks/ai-dlc-compliance-review.json`, which load those at the right moment
instead of carrying them as constant context on every turn.
