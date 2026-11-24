import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { buildJourneyModel, JourneyModel, ViewMode } from "./dataSources";

/**
 * One feature selection shared across all three persona views (Architect,
 * Dev, QA) — so picking a feature in one view's switcher keeps the other two
 * in sync, since they're all different lenses on the same feature. Still
 * purely in-memory: never writes .specify/feature.json (see JourneyViewProvider).
 */
class FeatureSelector {
  private selected: string | null = null;
  private listeners: Array<() => void> = [];

  get(): string | null {
    return this.selected;
  }

  set(featureDirectory: string | null) {
    this.selected = featureDirectory;
    this.listeners.forEach((l) => l());
  }

  onChange(listener: () => void) {
    this.listeners.push(listener);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("AI-DLC Journey");
  context.subscriptions.push(output);
  output.appendLine(
    `[activate] AI-DLC Journey extension host started (pid ${process.pid}).`
  );

  const featureSelector = new FeatureSelector();
  const providers = [
    new JourneyViewProvider("architect", context.extensionUri, output, featureSelector),
    new JourneyViewProvider("dev", context.extensionUri, output, featureSelector),
    new JourneyViewProvider("qa", context.extensionUri, output, featureSelector),
  ];

  context.subscriptions.push(
    ...providers.map((p) =>
      vscode.window.registerWebviewViewProvider(p.viewId, p)
    ),
    vscode.commands.registerCommand("aidlcJourney.refresh", () =>
      providers.forEach((p) => p.refresh())
    )
  );

  // Watch exactly the files a Speckit hook run (via the compliance-check
  // skill) or a manual Flight Plan export touches. Any change re-pushes a
  // fresh model into every already-open sidebar view — no re-opening, no
  // re-running a command by hand.
  const watchedGlobs = [
    "**/.specify/compliance/**/guardrails-applied.json",
    "**/.specify/compliance/**/test-results.json",
    "**/specs/**/flight-plan.json",
    "**/specs/**/plan.md",
    "**/specs/**/tasks.md",
    "**/specs/**/spec.md",
    "**/.specify/feature.json",
  ];
  let debounceTimer: NodeJS.Timeout | undefined;
  const scheduleRefresh = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => providers.forEach((p) => p.refresh()), 300);
  };
  for (const glob of watchedGlobs) {
    const watcher = vscode.workspace.createFileSystemWatcher(glob);
    watcher.onDidChange(scheduleRefresh);
    watcher.onDidCreate(scheduleRefresh);
    watcher.onDidDelete(scheduleRefresh);
    context.subscriptions.push(watcher);
  }
}

const VIEW_IDS: Record<ViewMode, string> = {
  architect: "aidlcJourney.architectView",
  dev: "aidlcJourney.devView",
  qa: "aidlcJourney.qaView",
};

class JourneyViewProvider implements vscode.WebviewViewProvider {
  public readonly viewId: string;
  private view: vscode.WebviewView | undefined;

  constructor(
    private readonly viewMode: ViewMode,
    private readonly extensionUri: vscode.Uri,
    private readonly output: vscode.OutputChannel,
    private readonly featureSelector: FeatureSelector
  ) {
    this.viewId = VIEW_IDS[viewMode];
    // Any view's switcher changes the shared selection; every view refreshes.
    featureSelector.onChange(() => this.refresh());
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.output.appendLine(`[resolveWebviewView] ${this.viewId} created/resolved.`);
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "webview")],
    };

    const model = this.buildModelForActiveWorkspace();
    webviewView.webview.html = this.renderHtml(webviewView.webview, model);

    webviewView.webview.onDidReceiveMessage((message) => {
      this.output.appendLine(
        `[message from webview:${this.viewMode}] ${JSON.stringify(message)?.slice(0, 200)}`
      );
      if (message?.type === "openFile" && typeof message.path === "string") {
        // evidence_refs can be a URL (a PR link, a CI run) as well as a file
        // path — open it the right way rather than treating a URL as a path.
        if (/^https?:\/\//i.test(message.path)) {
          vscode.env.openExternal(vscode.Uri.parse(message.path));
          return;
        }
        const root = this.activeWorkspaceRoot();
        if (!root) return;
        const abs = path.isAbsolute(message.path)
          ? message.path
          : path.join(root, message.path);
        vscode.commands.executeCommand("vscode.open", vscode.Uri.file(abs));
      } else if (message?.type === "ready") {
        // webview finished its own setup; send the current model once more
        // in case it loaded after resolveWebviewView's initial HTML render.
        this.refresh();
      } else if (message?.type === "selectFeature") {
        // View-only, and shared across all three persona views: this never
        // touches .specify/feature.json. Browsing several devs' plans must
        // not redirect what the next /speckit-plan a dev runs actually
        // targets.
        this.featureSelector.set(
          typeof message.featureDirectory === "string" && message.featureDirectory
            ? message.featureDirectory
            : null
        );
      }
    });

    // Picking up any change that happened while the view was collapsed.
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) this.refresh();
    });
  }

  refresh() {
    if (!this.view) return;
    const model = this.buildModelForActiveWorkspace();
    this.view.webview.postMessage({ type: "model", model });
  }

  private activeWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
  }

  private buildModelForActiveWorkspace(): JourneyModel | { notes: string[] } {
    const root = this.activeWorkspaceRoot();
    if (!root) {
      return { notes: ["Open a Speckit project folder to see its journey here."] };
    }
    return buildJourneyModel(root, this.featureSelector.get(), this.viewMode);
  }

  private renderHtml(webview: vscode.Webview, model: unknown): string {
    const webviewDir = vscode.Uri.joinPath(this.extensionUri, "webview");
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, "app.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, "styles.css"));
    let html = fs.readFileSync(
      vscode.Uri.joinPath(webviewDir, "index.html").fsPath,
      "utf8"
    );
    return html
      .replace("__SCRIPT_URI__", scriptUri.toString())
      .replace("__STYLE_URI__", styleUri.toString())
      .replace("__MODEL_JSON__", JSON.stringify(model).replace(/</g, "\\u003c"));
  }
}

export function deactivate() {}
