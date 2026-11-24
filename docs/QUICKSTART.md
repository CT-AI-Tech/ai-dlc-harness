# Quickstart — installing the AI-DLC Compliance Harness

Two paths below: **BMAD** and **Speckit**. Both end the same way — install the
framework, install the harness directly from its public GitHub repo, and start
building. Nothing is cloned by hand; the harness's guardrail content is fetched
automatically the first time it's needed.

Pick the section for whichever framework you're using. If you use neither, see
`ADOPTION-GUIDE.md` Part 4 (no-framework path) instead — this guide only covers the
two native installs.

---

## Path A — BMAD

Three separate steps: install BMAD, install our harness module, then the one file
copy BMAD can't do for you.

### 1. Install BMAD

No persistent install required — `npx` pulls it per run:

```bash
mkdir my-project && cd my-project
npx bmad-method@latest install --directory . --tools claude-code
```

Accept the defaults when prompted, or add `--yes` to skip prompts. This installs
only BMAD's own core module — nothing of ours yet:
```
✓ BMad Core Module (installed)
✓ claude-code (... skills → .claude/skills)
```

### 2. Install our harness module

Run `install` again, same directory, this time pointed at our module's public repo:

```bash
npx bmad-method@latest install --directory . \
  --custom-source "https://github.com/CT-AI-Tech/bmad-aidlc-harness.git" \
  --modules "ai-dlc-compliance" --tools claude-code
```

BMAD recognizes the existing install and adds the module on top of it — the output
will say `Custom files preserved: N`, confirming it didn't touch what step 1 set up.
You'll see:
```
✓ AI-DLC Compliance Harness (v0.1.0, installed)
```

Three questions get asked during this step (or defaulted, with `--yes`):
- **Where should the harness registry live?** — default `../ai-dlc-harness`. Leave
  this as the default; nothing needs to exist there yet.
- **Which vertical applies to this project?** — `medical-devices` or `ehr`.
- **Should a BINDING guardrail block the workflow until resolved?** — yes/no.

### 3. One manual step BMAD can't automate

BMAD has no mechanism for one module to wire another module's workflow-customization
files. Copy the 4 override files the module ships into `_bmad/custom/`:

```bash
curl -L -o harness-module.zip https://codeload.github.com/CT-AI-Tech/bmad-aidlc-harness/zip/refs/heads/main
unzip harness-module.zip
mkdir -p _bmad/custom
cp bmad-aidlc-harness-main/overrides/*.toml _bmad/custom/
rm -rf harness-module.zip bmad-aidlc-harness-main
```

This is the *only* manual file-copy step in the whole flow, and it's a one-time
action per project — it wires the compliance check into BMAD's product-brief,
architecture, epics/stories, and code-review workflows.

### 4. Use it — the harness fetches itself on first use

Launch Claude Code (or your configured agent) in `my-project/` and start whichever
BMAD workflow covers your constitution-equivalent phase (e.g. the product-brief
workflow). The compliance check fires automatically, before the workflow's own
greeting.

**The first time it runs**, since nothing exists at `../ai-dlc-harness` yet, it
clones the public registry automatically:
```
[ai-dlc-compliance] auto-fetched the harness to ../ai-dlc-harness from
https://github.com/CT-AI-Tech/ai-dlc-harness.git
```
Every run after that reuses the same checkout — no repeated downloads, no action
needed from you. Then it reports what it found:
```
## Compliance guardrails checked — constitution phase, vertical: medical-devices

**Binding** (must resolve before continuing):
- [GR-MD-001] ... — ...

**Advisory** (flagged, not blocking):
- [GR-MD-004] ... — ...

Evidence recorded: _bmad-output/compliance/<slug>/guardrails-applied.md
```

That's it — no `git clone` of anything, by you, at any point.

---

## Path B — Speckit

### 1. Install the Speckit CLI

```bash
pip install git+https://github.com/github/spec-kit.git
```

Confirm it's on your PATH: `specify --version`.

### 2. Scaffold a project and install the harness extension

```bash
specify init my-project --integration claude --non-interactive
cd my-project
specify extension add --from "https://github.com/CT-AI-Tech/speckit-aidlc-harness/archive/refs/heads/main.zip"
```

You'll see an "⚠ Untrusted Source" confirmation — this is Speckit's standard warning
for any URL-based extension install (as opposed to a vetted catalog), not specific
to this harness. Type `y` to continue.

Expected output:
```
✓ Extension installed successfully!
AI-DLC Healthcare Compliance Guardrails (v0.1.0)
Provided commands:
  • speckit-ai-dlc-compliance-check - ...
Config scaffolded:
  • .specify/extensions/ai-dlc-compliance/compliance-config.yml
```

The scaffolded config already defaults `harness_path` to `../ai-dlc-harness` and
`harness_repo_url` to the public registry — only change `vertical` if your project
is `ehr` instead of `medical-devices`.

### 3. Use it — the harness fetches itself on first use

```bash
/speckit-constitution Build a patient intake form for a Class II medical device
```

Speckit's `before_constitution` hook fires `ai-dlc-compliance-check` automatically.
The first time it runs, with nothing at `../ai-dlc-harness` yet, it clones the
public registry on its own:
```
[ai-dlc-compliance] auto-fetched the harness to ../ai-dlc-harness from
https://github.com/CT-AI-Tech/ai-dlc-harness.git
```
and reports binding/advisory guardrails before Speckit's own constitution step
continues. The same hooks fire automatically at `/speckit-plan`, `/speckit-tasks`,
and `/speckit-implement` too (`after_plan`, `after_tasks`, `after_implement`).

---

## What never requires a manual step, either path

- Cloning the harness registry (`ai-dlc-harness`) — auto-fetched on first use.
- Re-fetching it on later runs — the same checkout is reused once it exists.
- Pointing at a different checkout — if `harness_path` already has something there
  (a fork, a pinned commit, your own mirror), auto-fetch never touches it.

## The one step that *is* still manual, and only for BMAD

Copying the 4 workflow-override `.toml` files into `_bmad/custom/` (Path A, step 3).
BMAD has no module-to-module workflow-wiring mechanism — this is a one-time,
per-project action. Speckit needs no equivalent step; its extension system wires its
own hooks automatically on `specify extension add`.
