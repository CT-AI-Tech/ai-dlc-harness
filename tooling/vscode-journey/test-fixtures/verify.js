// Plain-node verification script — no vscode API involved.
// Run from tooling/vscode-journey/: node test-fixtures/verify.js
const path = require("path");
const { buildJourneyModel } = require("../out/dataSources");

const projectRoot = path.join(__dirname, "sample-project");
const model = buildJourneyModel(projectRoot);

console.log(JSON.stringify(model, null, 2));

console.log("\n--- sanity checks ---");
console.log("featureDirectory:", model.featureDirectory);
console.log("slug:", model.slug);
console.log("compliance loaded:", !!model.compliance);
console.log("guardrails matched:", model.guardrails.length);
console.log(
  "guardrails by status:",
  model.guardrails.map((g) => `${g.id}:${g.evidence ? g.evidence.status : "unchecked"}`)
);
console.log("flightPlan loaded:", !!model.flightPlan, "nodes:", model.flightPlan?.nodes?.length);
console.log("artifacts:", model.artifacts);
console.log("notes:", model.notes);

console.log("\n--- feature switcher checks ---");
console.log("isActiveFeature (default, no override):", model.isActiveFeature);
console.log(
  "availableFeatures:",
  model.availableFeatures.map((f) => `${f.slug} (spec:${f.hasSpec} plan:${f.hasPlan} fp:${f.hasFlightPlan})`)
);
const assert = (cond, msg) => {
  if (!cond) throw new Error("ASSERTION FAILED: " + msg);
};
assert(model.availableFeatures.length === 2, "expected 2 fixture features");
assert(model.isActiveFeature === true, "default model should be the active feature");

const overridden = buildJourneyModel(projectRoot, "specs/002-second-feature");
console.log(
  "override to 002-second-feature -> featureDirectory:",
  overridden.featureDirectory,
  "isActiveFeature:",
  overridden.isActiveFeature
);
assert(overridden.isActiveFeature === false, "viewing a non-pointer feature must report isActiveFeature=false");
assert(overridden.slug === "002-second-feature", "override must actually switch which feature loads");

console.log("\nAll feature-switcher assertions passed.");

console.log("\n--- dev view ---");
const devModel = buildJourneyModel(projectRoot, null, "dev");
console.log("viewMode:", devModel.viewMode);
console.log("flightPlan loaded (should be null — dev view skips it):", devModel.flightPlan);
console.log(
  "guardrails (development+review phases):",
  devModel.guardrails.map((g) => `${g.id} tasks=${JSON.stringify(g.evidence?.related_tasks || [])} files=${JSON.stringify(g.evidence?.related_files || [])}`)
);
assert(devModel.viewMode === "dev", "viewMode must round-trip");
assert(devModel.flightPlan === null, "dev view must not load flightPlan");
const sdlc = devModel.guardrails.find((g) => g.id === "GR-MD-SDLC-001");
assert(!!sdlc, "GR-MD-SDLC-001 (development phase) must be in the dev view");
assert(sdlc.evidence?.related_files?.includes("src/integration/payer-retry.ts"), "related_files must round-trip from evidence");
const trace = devModel.guardrails.find((g) => g.id === "GR-MD-TRACE-001");
assert(!!trace, "GR-MD-TRACE-001 (review phase) must be in the dev view too");
assert(!devModel.guardrails.some((g) => g.id === "GR-MD-CLASS-001"), "constitution-phase guardrails must NOT be in the dev view");

console.log("\n--- qa view ---");
const qaModel = buildJourneyModel(projectRoot, null, "qa");
console.log("viewMode:", qaModel.viewMode);
console.log("testResults:", qaModel.testResults.map((r) => `${r.user_story} #${r.scenario_index}: ${r.status}`));
console.log(
  "guardrails (review phase only):",
  qaModel.guardrails.map((g) => g.id)
);
assert(qaModel.testResults.length === 4, "expected 4 fixture test-result entries");
// GR-GEN-AUDIT-001 is lifecycle_phase: cross-cutting, so it correctly shows up
// in every phase filter, QA's included — only GR-MD-TRACE-001 is "review"
// specifically, and no constitution/development-only guardrail should appear.
const qaAllowedIds = new Set(["GR-MD-TRACE-001", "GR-GEN-AUDIT-001", "GR-ENG-TESTHONESTY-001"]);
assert(
  qaModel.guardrails.every((g) => qaAllowedIds.has(g.id)),
  "qa view must show only review-phase (+ cross-cutting) guardrails"
);
assert(qaModel.guardrails.some((g) => g.id === "GR-MD-TRACE-001"), "GR-MD-TRACE-001 must be in the qa view");
assert(!qaModel.guardrails.some((g) => g.id === "GR-MD-CLASS-001" || g.id === "GR-MD-SDLC-001"), "constitution/development-only guardrails must not leak into qa view");
assert(qaModel.testResults.some((r) => r.status === "failed"), "fixture must include a failed scenario");
assert(qaModel.testResults.some((r) => r.status === "not_verified"), "fixture must include a not_verified scenario");

console.log("\nAll dev/qa view-mode assertions passed.");

console.log("\n--- engineering-standards category split ---");
const engGuardrails = devModel.guardrails.filter((g) => g.category === "engineering");
const regGuardrails = devModel.guardrails.filter((g) => g.category !== "engineering");
console.log("engineering:", engGuardrails.map((g) => g.id));
console.log("regulatory:", regGuardrails.map((g) => g.id));
assert(engGuardrails.length === 2, "expected 2 engineering-category guardrails in dev view (GR-ENG-SECRETS-001, GR-ENG-TESTHONESTY-001)");
assert(engGuardrails.some((g) => g.id === "GR-ENG-SECRETS-001"), "GR-ENG-SECRETS-001 must be categorized as engineering");
assert(regGuardrails.every((g) => g.category !== "engineering"), "regulatory bucket must not contain engineering guardrails");
assert(!regGuardrails.some((g) => g.id.startsWith("GR-ENG-")), "no GR-ENG- guardrail should leak into the regulatory bucket");

console.log("\nAll engineering-category assertions passed.");

console.log("\n--- finding + evidence_refs (the \"why\" and \"proof\") ---");
const secretsGuardrail = devModel.guardrails.find((g) => g.id === "GR-ENG-SECRETS-001");
assert(!!secretsGuardrail.evidence?.finding, "GR-ENG-SECRETS-001 must carry a finding explaining why its status was assigned");
assert(
  secretsGuardrail.evidence.evidence_refs?.includes("src/config/secrets.ts"),
  "GR-ENG-SECRETS-001's evidence_refs must round-trip from the fixture"
);
const flaggedCyber = qaModel.guardrails
  .concat(buildJourneyModel(projectRoot, null, "architect").guardrails)
  .find((g) => g.id === "GR-MD-CYBER-001");
console.log("GR-MD-CYBER-001 finding:", flaggedCyber?.evidence?.finding);
assert(flaggedCyber?.evidence?.finding === "SBOM present, but threat model section still a placeholder.", "flagged guardrail's finding must round-trip exactly");

const testHonestyGuardrail = qaModel.guardrails.find((g) => g.id === "GR-ENG-TESTHONESTY-001");
assert(testHonestyGuardrail.evidence.evidence_refs.length === 2, "GR-ENG-TESTHONESTY-001 must carry both a log path and a PR URL");
assert(testHonestyGuardrail.evidence.evidence_refs.some((r) => r.startsWith("https://")), "a URL-form evidence_ref must round-trip unchanged");

const firstScenario = qaModel.testResults.find((r) => r.scenario_index === 1 && r.user_story.includes("prior authorization"));
assert(firstScenario.evidence_refs?.length === 1, "test-results.json entries must also support evidence_refs");

console.log("\nAll finding/evidence_refs assertions passed.");
