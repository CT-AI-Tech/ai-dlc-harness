// Renders the webview standalone (no VS Code) against a fixture project, for
// visual QA in a plain browser. Run after `npm run compile`:
//   node scripts/build-dev-preview.js [path-to-project] [viewMode]
// viewMode omitted -> writes all three (index-architect.html, index-dev.html,
// index-qa.html) plus index.html as an alias for architect. Defaults to
// test-fixtures/sample-project. Open any of them via a static server (e.g.
// `python -m http.server`, or the Claude Code built-in browser's
// preview_start) — file:// also works since nothing calls a real vscode API.
const path = require("path");
const fs = require("fs");
const { buildJourneyModel } = require("../out/dataSources");

const projectRoot = path.resolve(
  __dirname,
  "..",
  process.argv[2] || "test-fixtures/sample-project"
);
const requestedMode = process.argv[3];
const modes = requestedMode ? [requestedMode] : ["architect", "dev", "qa"];

const outDir = path.join(__dirname, "..", "dev-preview");
fs.mkdirSync(outDir, { recursive: true });

const template = fs.readFileSync(
  path.join(__dirname, "..", "webview", "index.html"),
  "utf8"
);

for (const mode of modes) {
  const model = buildJourneyModel(projectRoot, null, mode);
  const html = template
    .replace("__STYLE_URI__", "styles.css")
    .replace("__SCRIPT_URI__", "app.js")
    .replace("__MODEL_JSON__", JSON.stringify(model).replace(/</g, "\\u003c"));
  const fileName = `index-${mode}.html`;
  fs.writeFileSync(path.join(outDir, fileName), html);
  if (mode === "architect") {
    fs.writeFileSync(path.join(outDir, "index.html"), html);
  }
  console.log(`${fileName} written. notes:`, model.notes);
}

fs.copyFileSync(
  path.join(__dirname, "..", "webview", "app.js"),
  path.join(outDir, "app.js")
);
fs.copyFileSync(
  path.join(__dirname, "..", "webview", "styles.css"),
  path.join(outDir, "styles.css")
);

console.log(`dev-preview written to ${outDir}`);
