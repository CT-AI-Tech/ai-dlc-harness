# AI-DLC Compliance Guardrails (generic / no-framework adapter)

For a customer not using Speckit, BMAD, or Kiro — or any lifecycle framework at all.

This is the floor of the harness's three consumption tiers (see the main
[README](../../README.md)):

1. **Deep hook integration** — Speckit, BMAD, Kiro adapters. Automatic, framework-native.
2. **Generic agent-skill integration** — this folder. Manual trigger, same algorithm,
   any coding agent (Claude Code, Cursor, Copilot, a bespoke pipeline).
3. **Plain documentation** — no tooling at all; hand a team
   `verticals/<vertical>/INDEX.md` as a reviewed checklist.

## Install

```bash
# Copy the skill wherever your coding agent looks for custom skills/commands
# (e.g. .claude/skills/ for Claude Code, a custom command file for Cursor, etc.)
cp -r /path/to/ai-dlc-harness/integrations/generic/skill ai-dlc-compliance-check

# Copy and configure
cp /path/to/ai-dlc-harness/integrations/generic/compliance-config.yml ./compliance-config.yml
# then edit harness_path and vertical
```

If your coding agent doesn't support a custom-skill mechanism at all, skip the skill
file and instead paste the content of `skill/SKILL.md` directly into your project's
`AGENTS.md`/`CLAUDE.md` (or equivalent always-read instructions file) — it's written
to work standalone either way.

## The one real difference from the framework adapters

Nothing fires this automatically. You (or the agent, prompted by you) decide when a
piece of work matches one of the three phases and invoke the check yourself. That's a
real, honest tradeoff — easier to skip, nothing enforces it — not a lesser version of
the same guarantee the hook-based adapters give you. Say so plainly to a customer
considering this path rather than Speckit/BMAD/Kiro: this tier trades automation for
zero framework dependency.

## When this is the right fit

- The customer is evaluating the harness before committing to any framework.
- The customer has a bespoke internal pipeline none of the three adapters target.
- The customer's team works directly in a coding agent (Claude Code, Cursor, Copilot)
  with no spec-driven layer on top at all.

If they later adopt Speckit, BMAD, or Kiro, point them at that framework's adapter —
the harness content and the `compliance-config.yml` shape carry over unchanged; only
the wiring (this folder vs. a framework's hooks) changes.
