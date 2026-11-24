# AI-DLC Journey (VS Code extension)

Three visual, persona-based views on top of a Speckit project, all reading the
same underlying state the `ai-dlc-compliance-check` skill already writes as a
side effect of normal Speckit commands — no separate tool, no server, nothing
to remember to run:

- **Architect** — the design plan (rendered in Flight Plan's graph shape — a
  sibling tool in this same harness, under `tooling/flight-plan/`) annotated
  with which guardrails shaped it.
- **Dev / Lead** — the same guardrail evidence, split into **Engineering
  Standards** (coding/architecture practices — `cross-cutting/engineering-
  standards/`) and **Regulatory / Compliance** (everything else), each grouped
  by file/task instead of shown as one flat list — answering "what applied to
  the thing I'm touching" rather than "what applied to the feature overall."
- **QA** — `spec.md`'s Acceptance Scenarios cross-referenced with their actual
  verification status (`passed`/`failed`/`not_verified`/`not_implemented`),
  plus the review-phase guardrails relevant to testing.

All three appear as separate collapsible sections under the same **AI-DLC
Journey** icon in the Activity Bar (the same pattern VS Code's own Explorer
uses for Open Editors / Folders / Outline) — not tabs inside one panel.

`flight-plan.json` is written directly by the same agent, in the same run,
that already produces `plan.md` — no call to Flight Plan's server. Flight
Plan's own app (with its cost/time simulation) remains available separately
for anyone who wants that, but nothing here depends on it being installed or
running.

A BMAD pilot, and a Product Owner view (which needs real UI screenshots, not
yet wired to anything), are deliberately not built here.

## What each view needs to show real data

All three share:
- A Speckit project with `.specify/feature.json` pointing at an active feature
  (run `/speckit-specify` at least once)
- The `ai-dlc-compliance` Speckit extension installed (see the harness repo's
  `docs/QUICKSTART.md`) — for `compliance-config.yml` → `harness_path` / `vertical`
- A `guardrails-applied.json` evidence sidecar, written automatically by the
  compliance-check skill's Step 6 — optional; guardrails just show "not yet
  checked" without it. Every guardrail card renders `evidence.finding`
  directly (the answer to "why is this addressed/flagged/blocked," not just
  the status dot) and, when present, `evidence.evidence_refs` as clickable
  links/files — this is the whole point of recording evidence at all: a
  reviewer checks it themselves, in one click, instead of taking a status
  dot's word for it. `related_tasks` and `related_files`, also optional, are
  what the Dev view groups by — populated at `after_tasks`/`after_implement`
  respectively, often empty by design (a feature-wide guardrail has no
  specific file to point at). All four fields degrade gracefully when absent.

Architect only:
- A `flight-plan.json` in `specs/<feature>/` — written automatically by **Step
  6a**, at the `after_plan` hook (right after `/speckit-plan` produces
  `plan.md`).

QA only:
- A `test-results.json` sidecar — written automatically by **Step 6b**, at the
  `after_implement` hook, referencing `spec.md`'s Acceptance Scenarios by
  `user_story` + `scenario_index` (no invented IDs).

See `release-speckit/commands/speckit.ai-dlc-compliance.check.md` (Steps 6,
6a, 6b) for the exact schemas.

None of these are required for any view to open — every missing piece shows an
explanatory empty state instead of a blank panel or a crash.

## Build and run

```bash
npm install
npm run compile
```

### Verify the data plumbing (no VS Code needed)

```bash
npm run verify
```
Runs `dataSources.ts`'s `buildJourneyModel` against `test-fixtures/sample-project`
(a fixture mirroring a real Speckit project's layout, with a copy of Flight
Plan's own `sample-plan.json` as its `flight-plan.json`) and prints the merged
model plus a sanity-check summary — guardrails matched, their evidence status,
node count, resolved artifact links.

### Visually check the webview (no VS Code needed)

```bash
npm run dev-preview
```
Renders the actual `webview/` files against the same fixture into `dev-preview/`,
with a small shim so `app.js` runs outside a real webview (`acquireVsCodeApi`
just logs instead of posting to an extension host). Open `dev-preview/index.html`
with any static server, or pass a different fixture path:
```bash
node scripts/build-dev-preview.js path/to/other/project
```

### Try it while developing (F5 — a temporary debug window only)

1. Open this folder (`tooling/vscode-journey/`) in VS Code.
2. Open the **Run and Debug** panel, confirm **"Run Extension"** is selected, press **F5**.
3. In the new Extension Development Host window, open a real Speckit project
   and click the AI-DLC Journey icon in the Activity Bar.

This window only exists for developing the extension itself — it's not how a
real developer would use this day to day. See the next section for that.

### Install it for real — runs in your own, normal VS Code window

No separate instance, no F5, nothing different from any other installed
extension (GitLens, Prettier, etc.) once this is packaged and installed:

```bash
npm install
npm run compile
npx @vscode/vsce package --allow-missing-repository
code --install-extension aidlc-journey-<version>.vsix
```

If you're updating an already-installed copy, uninstall first
(`code --uninstall-extension ct-ai-tech.aidlc-journey`) rather than installing over
it — VS Code can silently skip reactivating the extension host when the version
string looks unchanged, which looks exactly like "nothing happens when I click
anything." Bump the `version` in `package.json` on every real change, for the same
reason.

Reload VS Code (or just reopen it). A new **AI-DLC Journey** icon appears in
the Activity Bar, in every workspace, from then on, with three sections —
Architect, Dev / Lead, QA — each collapsible independently. There's nothing to
"launch" each time.

### What's live and automatic once installed

Every view is a persistent sidebar panel, not a one-shot snapshot:
- Each renders the current state the moment you open it.
- Each **watches** `guardrails-applied.json`, `test-results.json`,
  `flight-plan.json`, `plan.md`, `tasks.md`, `spec.md`, and
  `.specify/feature.json` for changes (`vscode.workspace.createFileSystemWatcher`
  in `extension.ts`) and refreshes itself in place — no re-opening, no
  re-running a command — the moment any of them change. In practice: every
  time a Speckit hook fires and the coding agent runs the
  `ai-dlc-compliance-check` skill, Step 6 writes `guardrails-applied.json`
  (all three views), Step 6a writes `flight-plan.json` at `after_plan`
  (Architect), and Step 6b writes `test-results.json` at `after_implement`
  (QA); every view picks up its relevant files within ~300ms.
- A manual refresh button (⟳) sits in each view's title bar too, for the rare
  case nothing watched actually changed but you want a forced re-read.
- A **feature switcher** dropdown (under the title) lists every feature under
  `specs/`, with a status hint (`plan ready` / `spec only` / `no design graph
  yet`). Picking one re-renders **all three views** for that feature — this
  selection is shared across Architect/Dev/QA (see `FeatureSelector` in
  `extension.ts`), since they're different lenses on the same feature. It's
  **purely a view change**: it never writes `.specify/feature.json`. The point
  is that an architect (or anyone) reviewing several devs' plans after a
  planning sprint can browse all of them without ever redirecting what the
  next `/speckit-plan` a dev runs actually targets — that's still governed
  solely by `.specify/feature.json`, which only Speckit's own scripts write. A
  `viewing only — not the active planning feature` badge appears whenever
  you're looking at something other than the live pointer, so it's never
  ambiguous which one Speckit itself would plan next.

What I verified without a real VS Code instance: the data-loading logic
end-to-end against a realistic fixture for all three view modes (`npm run
verify` — includes explicit assertions that Dev shows development+review-phase
guardrails with `related_tasks`/`related_files`, QA shows review-phase
guardrails plus all four `test-results.json` statuses, and the Architect view
correctly excludes both), every graceful-degradation path (missing/corrupt
files), the live-update rendering path (simulated the exact
`postMessage({type:"model", ...})` the file watcher sends and confirmed each
webview re-renders in place without a reload), and a visual pass over all
three rendered views (`npm run dev-preview` writes `index-architect.html`,
`index-dev.html`, `index-qa.html`) confirming grouping, status colors, and
that the Architect view didn't regress from the shared-code refactor.
What only a real VS Code instance can confirm: the extension host's three
separate view registrations under one Activity Bar container, the feature
switcher actually keeping all three views in sync via the shared
`FeatureSelector`, the file watcher firing on a real file save and on a real
agent-written `flight-plan.json`/`guardrails-applied.json`/`test-results.json`,
and the `vscode.open` round-trip when you click a node/guardrail/artifact
link. There's an "AI-DLC Journey" Output channel
(`vscode.window.createOutputChannel` in `extension.ts`) logging every message
each webview sends and every step of model building, tagged by which view
sent it — check it first if something doesn't behave as expected, rather than
guessing from the UI alone.

## Files

- `src/dataSources.ts` — all data loading/shaping, zero `vscode` dependency,
  directly testable with plain `node`. `buildJourneyModel(root, featureOverride,
  viewMode)` is the one entry point all three views call; `PHASES_BY_VIEW_MODE`
  is the only thing that actually differs between personas — same guardrail
  data, filtered differently.
- `src/extension.ts` — the VS Code glue: one `JourneyViewProvider` class
  parameterized by `viewMode`, registered three times (Architect/Dev/QA)
  against three view ids under the same Activity Bar container; a shared
  `FeatureSelector` keeps the feature switcher in sync across all three;
  message handling for `openFile`/`ready`/`selectFeature`.
- `webview/` — one shared HTML/CSS/JS bundle for all three views (not three
  copies) — `app.js`'s `renderAll` sets `body[data-view]` from `model.viewMode`
  and branches to `renderGraph`+`renderGuardrails` (Architect),
  `renderDevContent`, or `renderQaContent`; `guardrailCardHtml`/
  `wireGuardrailTitleClicks` are shared by all three guardrail-card renderings.
  The graph layout/edge-drawing is adapted from Flight Plan's own
  `public/app.js` (`layout()`/`renderGraphShell()`/`drawEdges()`), trimmed to
  skip Flight Plan's pricing/gate-synthesis logic since this view maps
  `flight-plan.json`'s `nodes[]` directly, 1:1.
- `test-fixtures/sample-project/` — a fixture with the exact on-disk shape a
  real Speckit + ai-dlc-compliance project has (confirmed against a real
  generated project before building this), with two features (one with a full
  plan+evidence+test-results, one spec-only) and evidence entries covering
  every guardrail status and `related_tasks`/`related_files` combination.
