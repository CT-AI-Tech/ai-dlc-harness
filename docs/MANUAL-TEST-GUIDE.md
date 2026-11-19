# Manual test guide — installing the harness into fresh Speckit and BMAD projects

This walks through exactly what was verified hands-on against the three public repos:

- `https://github.com/CT-AI-Tech/ai-dlc-harness` (main) — the registry + verticals
- `https://github.com/CT-AI-Tech/speckit-aidlc-harness` (main) — Speckit extension release
- `https://github.com/CT-AI-Tech/bmad-aidlc-harness` (main) — BMAD module release

Both release repos were byte-for-byte diffed against this repo's `release-speckit/` and
`release-bmad/` folders — no drift. Follow either section independently; they don't
depend on each other except both ultimately pointing at the same `ai-dlc-harness`
content.

> **You do not need to clone `ai-dlc-harness` yourself.** Both the BMAD skill and the
> Speckit command now auto-fetch it into `harness_path` the first time a compliance
> check runs, if nothing is there yet (git clone, falling back to a zip download if
> `git` isn't available or the network blocks it). This section is written assuming
> that behavior; the manual clone from older versions of this guide is no longer a
> required step — see "Nothing cloned by hand" callouts below for what to expect
> instead.
>
> **This requires `ai-dlc-harness` (for the updated `LOADING-PROTOCOL`-adjacent skill
> instructions) and both release repos to be re-published with the latest content
> from this working copy before it's live for real installs** — the auto-fetch logic
> was added to `release-bmad/ai-dlc-compliance-check/SKILL.md` and
> `release-speckit/commands/speckit.ai-dlc-compliance.check.md` (plus their
> `integrations/` source counterparts) in this session. Until those are pushed, an
> install from the public repos gets the previous behavior (manual clone required —
> see the bottom of this guide for that fallback path).

**No setup step needed before either section below** — just pick an empty scratch
folder for `my-harness-test/` and create project folders inside it. The harness
checkout appears automatically the first time it's needed.

---

## Part A — Speckit

### A1. Install the Speckit CLI

```bash
pip install git+https://github.com/github/spec-kit.git
```

(If `git+https://github.com/...` resets, download the zip the same way as above and
`pip install ./spec-kit-main` instead.)

Confirm it's on your PATH:
```bash
specify --version
```

### A2. Scaffold a new Speckit project

From inside `my-harness-test/`:
```bash
specify init my-speckit-project --integration claude --non-interactive
cd my-speckit-project
```

### A3. Install the compliance extension from the public release repo

```bash
specify extension add --from "https://github.com/CT-AI-Tech/speckit-aidlc-harness/archive/refs/heads/main.zip"
```

You'll see an "⚠ Untrusted Source" confirmation (expected — it's warning you that
you're installing from a raw URL instead of a vetted catalog). Type `y`.

If this specific download gets reset by your network, use the direct codeload URL
(same content, different host — see Troubleshooting):
```bash
specify extension add --from "https://codeload.github.com/CT-AI-Tech/speckit-aidlc-harness/zip/refs/heads/main"
```

Expected output:
```
✓ Extension installed successfully!
AI-DLC Healthcare Compliance Guardrails (v0.1.0)
Provided commands:
  • speckit-ai-dlc-compliance-check - ...
Config scaffolded:
  • .specify/extensions/ai-dlc-compliance/compliance-config.yml
```

### A4. Nothing to clone — defaults already point at an auto-fetch

Open `.specify/extensions/ai-dlc-compliance/compliance-config.yml`:
```yaml
harness_path: "../ai-dlc-harness"
harness_repo_url: "https://github.com/CT-AI-Tech/ai-dlc-harness.git"
vertical: "medical-devices"
```
Leave `harness_path`/`harness_repo_url` as-is unless you want to point at a fork or an
already-existing checkout. Only change `vertical` if you want to test `ehr` instead.

### A5. Verify the hooks are live

```bash
specify artifact list --json
```
Look for `before_constitution`, `after_plan`, `after_tasks`, `after_implement` with
`"active": true`.

### A6. Use it for real

```bash
/speckit-constitution Build a patient intake form for a Class II medical device
```
The `before_constitution` hook fires automatically. The first time it runs, if
`../ai-dlc-harness` doesn't exist yet, the agent clones it from `harness_repo_url`
on its own before doing anything else — you'll see a one-line
`[ai-dlc-compliance] auto-fetched the harness to ../ai-dlc-harness from
https://github.com/CT-AI-Tech/ai-dlc-harness.git` note, and a
`../ai-dlc-harness/.ai-dlc-harness-autofetched` marker file appears. Every run after
that reuses the same checkout. Then `ai-dlc-compliance-check` queries
`guardrail-index.yaml` for `medical-devices` + `constitution` and reports
binding/advisory guardrails before Speckit's own constitution step runs.

---

## Part B — BMAD

### B1. No persistent install needed — `npx` pulls it per run

From inside `my-harness-test/`:
```bash
mkdir my-bmad-project && cd my-bmad-project
npx bmad-method@latest install --directory . \
  --custom-source "https://github.com/CT-AI-Tech/bmad-aidlc-harness.git" \
  --modules "ai-dlc-compliance" --tools claude-code
```

Accept the defaults when prompted (or pass `--yes` to skip prompts entirely, as the
verification run did). This installs BMAD core + the compliance module in one pass.

Expected: a "BMad is ready to use!" panel confirming:
```
✓ BMad Core Module (installed)
✓ AI-DLC Compliance Harness (v0.1.0, installed)
✓ claude-code (9 skills → .claude/skills)
```

### B2. Verify config landed

```bash
cat _bmad/config.toml
```
Should contain:
```toml
[modules.ai-dlc-compliance]
harness_path = "../ai-dlc-harness"
vertical = "medical-devices"
block_on_binding = "true"
```
Note `harness_repo_url` is **not** in this file — it's only 3 prompted questions, same
as before. The skill defaults it to
`https://github.com/CT-AI-Tech/ai-dlc-harness.git` when absent; add the line by hand
only if you want to point at a fork or private mirror.

Nothing clones `ai-dlc-harness` at this point — that happens lazily, the first time
the skill actually runs (see B5).

Confirm the manifest shows it came from the real URL, not a local path:
```bash
grep -A6 "name: ai-dlc-compliance$" _bmad/_config/manifest.yaml
```
Should show `source: custom` and `repoUrl: https://github.com/CT-AI-Tech/bmad-aidlc-harness`.

### B3. The one manual step BMAD can't automate

BMAD has no mechanism for one module to write another module's workflow-customization
files. You need the 4 override `.toml` files from the module's `overrides/` folder,
copied into `_bmad/custom/`:

```bash
curl -L -o bmad-aidlc-harness.zip https://codeload.github.com/CT-AI-Tech/bmad-aidlc-harness/zip/refs/heads/main
unzip bmad-aidlc-harness.zip
mkdir -p _bmad/custom
cp bmad-aidlc-harness-main/overrides/*.toml _bmad/custom/
rm -rf bmad-aidlc-harness.zip bmad-aidlc-harness-main
```

### B4. Verify

```bash
python _bmad/scripts/resolve_config.py --project-root . | grep -A4 ai-dlc-compliance
```

### B5. Use it for real

Launch Claude Code in `my-bmad-project/` and start the product-brief workflow (or
whichever BMAD workflow you use for the constitution-equivalent phase) — the
`activation_steps_prepend` entry from `bmad-product-brief.toml` fires
`ai-dlc-compliance-check` before BMAD's own greeting.

The first time it runs, if `harness_path` (`../ai-dlc-harness` by default) doesn't
exist, the skill clones it automatically from `harness_repo_url` before doing
anything else, reports a one-line `[ai-dlc-compliance] auto-fetched the harness to
../ai-dlc-harness from https://github.com/CT-AI-Tech/ai-dlc-harness.git` note, and
drops a `../ai-dlc-harness/.ai-dlc-harness-autofetched` marker. Every subsequent run
reuses that same checkout without re-fetching.

---

## Fallback: pre-seeding the harness checkout by hand

If you want to pin a specific commit, test against a fork, or just prefer not to let
the first run touch the network, you can still clone `ai-dlc-harness` yourself before
installing either adapter — auto-fetch only fires when `harness_path` doesn't already
exist, so a pre-existing checkout (however it got there) is always left alone:

```bash
git clone https://github.com/CT-AI-Tech/ai-dlc-harness.git
# or, if git clone to github.com is reset on your network (see below):
curl -L -o ai-dlc-harness.zip https://codeload.github.com/CT-AI-Tech/ai-dlc-harness/zip/refs/heads/main
unzip ai-dlc-harness.zip && mv ai-dlc-harness-main ai-dlc-harness
```

## Troubleshooting: GitHub connection resets

While running this exact guide, `git clone https://github.com/...` and direct
`https://github.com/...` / `https://raw.githubusercontent.com/...` requests got reset
(`Recv failure: Connection was reset` / `WinError 10054`) on this machine's network,
while `https://api.github.com/...` and `https://codeload.github.com/...` worked fine
throughout. This looks like a local network/firewall quirk (some networks block
specific GitHub CDN hosts while allowing others) — not a problem with the repos
themselves (content was confirmed byte-identical via the working hosts). If you hit
the same thing: swap any failing `github.com/.../archive/...zip` URL for the
equivalent `codeload.github.com/.../zip/...` URL, and swap `raw.githubusercontent.com`
file reads for the GitHub API's contents endpoint
(`api.github.com/repos/<owner>/<repo>/contents/<path>`).
