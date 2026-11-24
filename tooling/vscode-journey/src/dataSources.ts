/**
 * Pure data-loading and -shaping functions for the Architect Journey View.
 *
 * Deliberately free of any `vscode` import so this file can be exercised by a
 * plain `node`/`ts-node` script against on-disk fixtures, outside the extension
 * host. `extension.ts` is the only file that touches the `vscode` API.
 *
 * Every loader degrades gracefully: a missing or unparsable file returns
 * `null`/`[]` plus a human-readable note, never throws. The caller
 * (`buildJourneyModel`) collects those notes so the webview can show *why*
 * something is empty instead of just being empty.
 */
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

export interface FeaturePointer {
  feature_directory: string;
}

export interface ComplianceConfig {
  harness_path: string;
  harness_repo_url?: string;
  vertical: string;
  block_on_binding?: boolean;
  evidence_dir?: string;
}

export interface GuardrailIndexEntry {
  id: string;
  title: string;
  vertical: string;
  lifecycle_phase: string;
  binding_tier: "binding" | "advisory" | string;
  applicability_tags: string[];
  summary: string;
  path: string;
  /** Optional. Absent means "regulatory" — the pilot's original content.
   *  "engineering" marks cross-cutting/engineering-standards/ (coding
   *  standards, agent-behavior patterns) — the Dev view groups on this. */
  category?: "regulatory" | "engineering" | string;
}

interface GuardrailIndexFile {
  guardrails: GuardrailIndexEntry[];
}

export interface FlightPlanNode {
  id: string;
  type: string;
  name: string;
  size?: string;
  risk?: "low" | "med" | "high" | string;
  deps: string[];
  reqs: string[];
  inputs?: string[];
  outputs?: string[];
  checks?: string[];
  done?: string;
  task?: string;
  sources?: string[];
}

export interface FlightPlanRequirement {
  id: string;
  text: string;
  type: string;
  ambiguity?: number;
  sources?: string[];
}

export interface FlightPlan {
  epic?: { code?: string; title?: string; summary?: string; approach?: string };
  brief?: string;
  flags?: { phi?: boolean; regulations?: string[] };
  requirements: FlightPlanRequirement[];
  questions?: unknown[];
  success?: string[];
  nodes: FlightPlanNode[];
}

export type EvidenceStatus = "passed" | "flagged" | "blocked";

export interface EvidenceEntry {
  id: string;
  title?: string;
  phase?: string;
  binding_tier?: string;
  applicability_tags?: string[];
  finding?: string;
  status: EvidenceStatus;
  timestamp?: string;
  /** Populated at after_tasks/after_implement when tasks.md exists. Often
   *  empty — a feature-wide guardrail has no specific task to point at. */
  related_tasks?: string[];
  /** Populated only at after_implement, once real files exist. */
  related_files?: string[];
  /** Optional. Paths (workspace-relative) or URLs backing `finding` beyond its
   *  own prose — a test log, a PR, the specific file/section that satisfies
   *  this guardrail. This is what makes a status reviewable, not just stated. */
  evidence_refs?: string[];
}

export type TestResultStatus = "passed" | "failed" | "not_verified" | "not_implemented";

export interface TestResultEntry {
  user_story: string;
  scenario_index: number;
  scenario_text: string;
  status: TestResultStatus;
  note?: string;
  timestamp?: string;
  /** Optional. Same idea as EvidenceEntry.evidence_refs — a test-run log, a
   *  screenshot, anything that backs the status beyond the note's prose. */
  evidence_refs?: string[];
}

/** Which lifecycle phases each persona view cares about — see Step 2 of the
 *  Speckit compliance command for the phase names themselves. */
export type ViewMode = "architect" | "dev" | "qa";

export const PHASES_BY_VIEW_MODE: Record<ViewMode, string[]> = {
  architect: ["constitution", "development"],
  dev: ["development", "review"],
  qa: ["review"],
};

export interface GuardrailWithEvidence extends GuardrailIndexEntry {
  evidence: EvidenceEntry | null; // null => "not yet checked"
}

export interface ArtifactLinks {
  constitution: string | null;
  spec: string | null;
  plan: string | null;
  tasks: string | null;
}

export interface FeatureSummary {
  directory: string; // e.g. "specs/001-cgm-companion-app" (forward slashes, always)
  slug: string;
  hasSpec: boolean;
  hasPlan: boolean;
  hasFlightPlan: boolean;
}

export interface JourneyModel {
  workspaceRoot: string;
  viewMode: ViewMode;
  featureDirectory: string | null;
  slug: string | null;
  /** True when featureDirectory matches .specify/feature.json's own pointer —
   *  false means the architect is browsing a different feature than the one
   *  Speckit commands would currently target. View-only; never written back. */
  isActiveFeature: boolean;
  availableFeatures: FeatureSummary[];
  compliance: ComplianceConfig | null;
  guardrails: GuardrailWithEvidence[];
  flightPlan: FlightPlan | null;
  testResults: TestResultEntry[];
  artifacts: ArtifactLinks;
  notes: string[]; // human-readable notes on anything that degraded gracefully
}

/** Resolves the real Speckit artifact paths for this feature, only those that exist. */
export function resolveArtifactLinks(
  workspaceRoot: string,
  featureDirectory: string | null
): ArtifactLinks {
  const existsOrNull = (p: string) => (fs.existsSync(p) ? p : null);
  return {
    constitution: existsOrNull(
      path.join(workspaceRoot, ".specify", "memory", "constitution.md")
    ),
    spec: featureDirectory
      ? existsOrNull(path.join(workspaceRoot, featureDirectory, "spec.md"))
      : null,
    plan: featureDirectory
      ? existsOrNull(path.join(workspaceRoot, featureDirectory, "plan.md"))
      : null,
    tasks: featureDirectory
      ? existsOrNull(path.join(workspaceRoot, featureDirectory, "tasks.md"))
      : null,
  };
}

function readJsonSafe<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function readYamlSafe<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return yaml.load(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Reads `.specify/feature.json` — the live pointer to the active feature. */
export function loadFeatureDirectory(
  workspaceRoot: string,
  notes: string[] = []
): string | null {
  const p = readJsonSafe<FeaturePointer>(
    path.join(workspaceRoot, ".specify", "feature.json")
  );
  if (!p || !p.feature_directory) {
    notes.push(
      "No .specify/feature.json found — open a feature with Speckit first (e.g. run /speckit-specify), or this view has nothing to show yet."
    );
    return null;
  }
  return p.feature_directory;
}

/** Derives the feature slug (e.g. "001-cgm-companion-app") from its directory. */
export function slugFromFeatureDirectory(featureDirectory: string): string {
  return path.basename(featureDirectory);
}

/**
 * Lists every feature under specs/, for the Architect view's feature switcher.
 * Purely a directory scan — never touches .specify/feature.json. Newest
 * (highest numeric prefix) first, so a review queue reads top-to-bottom.
 */
export function listFeatures(workspaceRoot: string): FeatureSummary[] {
  const specsDir = path.join(workspaceRoot, "specs");
  let entries: string[];
  try {
    entries = fs
      .readdirSync(specsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }

  const summaries: FeatureSummary[] = entries.map((name) => {
    const dir = path.join(specsDir, name);
    return {
      directory: `specs/${name}`,
      slug: name,
      hasSpec: fs.existsSync(path.join(dir, "spec.md")),
      hasPlan: fs.existsSync(path.join(dir, "plan.md")),
      hasFlightPlan: fs.existsSync(path.join(dir, "flight-plan.json")),
    };
  });

  summaries.sort((a, b) => {
    const na = parseInt(a.slug, 10);
    const nb = parseInt(b.slug, 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return nb - na;
    return a.slug.localeCompare(b.slug);
  });
  return summaries;
}

/** Normalizes two feature-directory strings (which may mix / and \) for equality. */
function sameFeatureDirectory(
  workspaceRoot: string,
  a: string | null,
  b: string | null
): boolean {
  if (!a || !b) return false;
  return (
    path.resolve(workspaceRoot, a).toLowerCase() ===
    path.resolve(workspaceRoot, b).toLowerCase()
  );
}

/** Parses `.specify/extensions/ai-dlc-compliance/compliance-config.yml`. */
export function loadComplianceConfig(
  workspaceRoot: string,
  notes: string[] = []
): ComplianceConfig | null {
  const cfg = readYamlSafe<ComplianceConfig>(
    path.join(
      workspaceRoot,
      ".specify",
      "extensions",
      "ai-dlc-compliance",
      "compliance-config.yml"
    )
  );
  if (!cfg || !cfg.harness_path || !cfg.vertical) {
    notes.push(
      "No compliance-config.yml found (or it's missing harness_path/vertical) — install the ai-dlc-compliance Speckit extension to see guardrails here."
    );
    return null;
  }
  return cfg;
}

/** Resolves harness_path (relative to the project root, or absolute) to a real directory. */
export function resolveHarnessPath(
  workspaceRoot: string,
  harnessPath: string
): string {
  return path.isAbsolute(harnessPath)
    ? harnessPath
    : path.resolve(workspaceRoot, harnessPath);
}

/** Parses `<harnessPath>/registry/guardrail-index.yaml`. */
export function loadGuardrailIndex(
  harnessPathResolved: string,
  notes: string[] = []
): GuardrailIndexEntry[] {
  const idx = readYamlSafe<GuardrailIndexFile>(
    path.join(harnessPathResolved, "registry", "guardrail-index.yaml")
  );
  if (!idx || !Array.isArray(idx.guardrails)) {
    notes.push(
      `No registry/guardrail-index.yaml found at ${harnessPathResolved} — the harness checkout may not be fetched yet (it auto-fetches on first compliance-check run, not on extension open).`
    );
    return [];
  }
  return idx.guardrails;
}

/**
 * Same filter as LOADING-PROTOCOL.md Step 2 / the Speckit command's Step 3,
 * narrowed to the phases the Architect view cares about (constitution +
 * development, not review).
 */
export function filterGuardrails(
  index: GuardrailIndexEntry[],
  vertical: string,
  phases: string[] = ["constitution", "development"]
): GuardrailIndexEntry[] {
  return index.filter(
    (g) =>
      (g.vertical === vertical || g.vertical === "cross-cutting") &&
      (phases.includes(g.lifecycle_phase) || g.lifecycle_phase === "cross-cutting")
  );
}

/** Looks for `flight-plan.json` inside the feature directory (manual export from Flight Plan). */
export function loadFlightPlan(
  workspaceRoot: string,
  featureDirectory: string,
  notes: string[] = []
): FlightPlan | null {
  const plan = readJsonSafe<FlightPlan>(
    path.join(workspaceRoot, featureDirectory, "flight-plan.json")
  );
  if (!plan || !Array.isArray(plan.nodes)) {
    notes.push(
      `No flight-plan.json in ${featureDirectory} yet — it's written automatically by the compliance-check skill right after /speckit-plan runs. Run that if you haven't yet.`
    );
    return null;
  }
  return plan;
}

/** Parses the evidence sidecar written by the compliance-check skill's Step 6. */
export function loadEvidence(
  workspaceRoot: string,
  evidenceDir: string,
  slug: string,
  notes: string[] = []
): EvidenceEntry[] {
  const entries = readJsonSafe<EvidenceEntry[]>(
    path.join(workspaceRoot, evidenceDir, slug, "guardrails-applied.json")
  );
  if (!entries || !Array.isArray(entries)) {
    notes.push(
      "No guardrails-applied.json evidence yet for this feature — guardrails below show as 'not yet checked' until a compliance check runs."
    );
    return [];
  }
  return entries;
}

/** Parses the test-verification sidecar written by the compliance-check skill's Step 6b. */
export function loadTestResults(
  workspaceRoot: string,
  evidenceDir: string,
  slug: string,
  notes: string[] = []
): TestResultEntry[] {
  const entries = readJsonSafe<TestResultEntry[]>(
    path.join(workspaceRoot, evidenceDir, slug, "test-results.json")
  );
  if (!entries || !Array.isArray(entries)) {
    notes.push(
      "No test-results.json yet for this feature — it's written automatically at the after_implement hook, once /speckit-implement has run."
    );
    return [];
  }
  return entries;
}

/**
 * Composes every loader above into one model for the webview.
 *
 * `featureOverride`, when given, picks which feature to VIEW — independent of
 * `.specify/feature.json`. This is how each persona view's feature switcher
 * works: browsing several devs' plans never mutates the project's actual
 * active-feature pointer, which would silently redirect whichever dev next
 * runs a Speckit command. Omit it to follow `.specify/feature.json` as before.
 *
 * `viewMode` picks which lifecycle phases' guardrails are relevant (see
 * `PHASES_BY_VIEW_MODE`) — the same guardrail data, filtered differently per
 * persona, not three separate data sources.
 */
export function buildJourneyModel(
  workspaceRoot: string,
  featureOverride?: string | null,
  viewMode: ViewMode = "architect"
): JourneyModel {
  const notes: string[] = [];

  // Resolve the real pointer quietly when viewing a specific feature by choice
  // — "no feature.json found" would be a confusing note while deliberately
  // browsing a feature the architect picked from the switcher.
  const activeFeatureDirectory = loadFeatureDirectory(
    workspaceRoot,
    featureOverride ? [] : notes
  );
  const featureDirectory = featureOverride || activeFeatureDirectory;
  const isActiveFeature = sameFeatureDirectory(
    workspaceRoot,
    featureDirectory,
    activeFeatureDirectory
  );
  const availableFeatures = listFeatures(workspaceRoot);
  const slug = featureDirectory ? slugFromFeatureDirectory(featureDirectory) : null;
  const compliance = loadComplianceConfig(workspaceRoot, notes);

  let guardrails: GuardrailWithEvidence[] = [];
  let testResults: TestResultEntry[] = [];
  if (compliance) {
    const harnessPathResolved = resolveHarnessPath(
      workspaceRoot,
      compliance.harness_path
    );
    const index = loadGuardrailIndex(harnessPathResolved, notes);
    const matched = filterGuardrails(index, compliance.vertical, PHASES_BY_VIEW_MODE[viewMode]);

    const evidenceDir = compliance.evidence_dir || ".specify/compliance";
    const evidence = slug ? loadEvidence(workspaceRoot, evidenceDir, slug, notes) : [];
    const evidenceById = new Map(evidence.map((e) => [e.id, e]));

    guardrails = matched.map((g) => ({
      ...g,
      evidence: evidenceById.get(g.id) || null,
    }));

    if (viewMode === "qa" && slug) {
      testResults = loadTestResults(workspaceRoot, evidenceDir, slug, notes);
    }
  }

  // Only the Architect view renders a design graph — skip the load (and its
  // "no flight-plan.json yet" note) entirely for Dev/QA, where it's noise.
  const flightPlan =
    viewMode === "architect" && featureDirectory
      ? loadFlightPlan(workspaceRoot, featureDirectory, notes)
      : null;

  const artifacts = resolveArtifactLinks(workspaceRoot, featureDirectory);

  return {
    workspaceRoot,
    viewMode,
    featureDirectory,
    slug,
    isActiveFeature,
    availableFeatures,
    compliance,
    guardrails,
    flightPlan,
    testResults,
    artifacts,
    notes,
  };
}
