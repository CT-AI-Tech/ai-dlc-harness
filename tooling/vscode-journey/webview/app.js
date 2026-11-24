(function () {
  "use strict";

  // Works both inside the real VS Code webview and when opened directly in a
  // plain browser for visual QA (acquireVsCodeApi doesn't exist there).
  const vscodeApi =
    typeof acquireVsCodeApi === "function"
      ? acquireVsCodeApi()
      : { postMessage: (msg) => console.log("[dev preview] postMessage", msg) };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function openFile(p) {
    if (!p) return;
    vscodeApi.postMessage({ type: "openFile", path: p });
  }

  const EMPTY_MODEL = {
    viewMode: "architect",
    featureDirectory: null,
    slug: null,
    isActiveFeature: true,
    availableFeatures: [],
    compliance: null,
    guardrails: [],
    flightPlan: null,
    testResults: [],
    artifacts: {},
    notes: ["No model data was provided to this view."],
  };

  function renderHeader(model) {
    const title = document.getElementById("feature-title");
    const sub = document.getElementById("feature-sub");
    const links = document.getElementById("artifact-links");

    const viewLabel = { architect: "Architect View", dev: "Dev / Lead View", qa: "QA View" }[model.viewMode] || "Architect View";
    title.textContent = model.flightPlan?.epic?.title
      ? model.flightPlan.epic.title
      : model.slug
      ? `Feature: ${model.slug}`
      : `AI-DLC Journey — ${viewLabel}`;

    const vertical = model.compliance?.vertical || "(no vertical configured)";
    sub.textContent = model.slug
      ? `${model.slug} · vertical: ${vertical}`
      : "No active Speckit feature detected.";

    const artifactEntries = [
      ["Constitution", model.artifacts?.constitution],
      ["Spec", model.artifacts?.spec],
      ["Plan", model.artifacts?.plan],
      ["Tasks", model.artifacts?.tasks],
    ].filter(([, p]) => !!p);

    links.innerHTML = artifactEntries
      .map(([label, p]) => `<a data-path="${esc(p)}">${esc(label)}</a>`)
      .join("");
    links.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => openFile(a.getAttribute("data-path")));
    });
  }

  function featureLabel(f) {
    const bits = [];
    if (f.hasPlan) bits.push("plan ready");
    else if (f.hasSpec) bits.push("spec only");
    if (!f.hasFlightPlan && f.hasPlan) bits.push("no design graph yet");
    return bits.length ? `${f.slug} (${bits.join(", ")})` : f.slug;
  }

  // feature.json (Windows) stores backslashes; listFeatures() always returns
  // forward slashes — normalize before comparing, this is display logic only.
  const normSlashes = (p) => String(p || "").replace(/\\/g, "/");

  function renderFeatureSwitcher(model) {
    const sel = document.getElementById("feature-switcher");
    const badge = document.getElementById("viewing-badge");
    const features = model.availableFeatures || [];

    if (features.length === 0) {
      sel.classList.add("hidden");
      badge.classList.add("hidden");
      return;
    }
    sel.classList.remove("hidden");

    const current = normSlashes(model.featureDirectory);
    sel.innerHTML = features
      .map(
        (f) =>
          `<option value="${esc(f.directory)}"${normSlashes(f.directory) === current ? " selected" : ""}>${esc(featureLabel(f))}</option>`
      )
      .join("");

    sel.onchange = () => {
      vscodeApi.postMessage({ type: "selectFeature", featureDirectory: sel.value });
    };

    badge.classList.toggle("hidden", model.isActiveFeature !== false);
  }

  // --- graph: layered-by-dependency-depth, same approach as Flight Plan's
  // own public/app.js layout()/renderGraphShell()/drawEdges(), trimmed to the
  // structural parts (no pricing/gate synthesis — plan.nodes map 1:1). ---
  function layerNodes(nodes) {
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const depth = {};
    const depthOf = (id, seen) => {
      if (depth[id] !== undefined) return depth[id];
      if (seen.has(id)) return 0; // cycle guard
      seen.add(id);
      const n = byId[id];
      const deps = (n && n.deps) || [];
      const d = deps.length
        ? 1 + Math.max(...deps.filter((x) => byId[x]).map((x) => depthOf(x, seen)))
        : 0;
      depth[id] = d;
      return d;
    };
    nodes.forEach((n) => depthOf(n.id, new Set()));
    const layers = [];
    nodes.forEach((n) => {
      const d = depth[n.id];
      (layers[d] = layers[d] || []).push(n);
    });
    return layers;
  }

  function riskClass(risk) {
    return risk === "high" ? "risk-high" : risk === "low" ? "risk-low" : "risk-med";
  }

  function renderGraph(model) {
    const graphEl = document.getElementById("graph");
    const emptyEl = document.getElementById("graph-empty");
    const detailEl = document.getElementById("detail");
    detailEl.classList.add("hidden");
    detailEl.innerHTML = "";
    const plan = model.flightPlan;

    if (!plan || !Array.isArray(plan.nodes) || plan.nodes.length === 0) {
      graphEl.classList.add("hidden");
      emptyEl.classList.remove("hidden");
      emptyEl.textContent = model.featureDirectory
        ? "No flight-plan.json found for this feature yet. It's written automatically by the compliance-check skill right after /speckit-plan runs — run that if you haven't yet."
        : "Open a Speckit feature to view its design plan here.";
      return;
    }

    const layers = layerNodes(plan.nodes);
    const cols = Math.max(...layers.map((l) => (l ? l.length : 0)));
    graphEl.style.gridTemplateColumns = `repeat(${Math.max(cols, 1)}, minmax(160px, 1fr))`;

    graphEl.innerHTML =
      '<svg class="edges" aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs><g id="edgeG"></g></svg>';

    layers.forEach((layer, rowIdx) => {
      (layer || []).forEach((n) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `node ${riskClass(n.risk)}`;
        btn.id = "node-" + n.id;
        btn.style.gridRow = rowIdx + 1;
        btn.innerHTML = `<span class="n-type">${esc(n.type || "node")}</span><span class="n-name">${esc(n.name || n.id)}</span><span class="n-reqs">${(n.reqs || []).map(esc).join(", ")}</span>`;
        btn.addEventListener("click", () => renderDetail(n));
        graphEl.appendChild(btn);
      });
    });

    requestAnimationFrame(() => drawEdges(plan.nodes));
    emptyEl.classList.add("hidden");
    graphEl.classList.remove("hidden");
  }

  function drawEdges(nodes) {
    const g = document.getElementById("edgeG");
    if (!g) return;
    const graphEl = document.getElementById("graph");
    const box = (id) => {
      const el = document.getElementById("node-" + id);
      if (!el) return null;
      return {
        x: el.offsetLeft,
        y: el.offsetTop,
        w: el.offsetWidth,
        h: el.offsetHeight,
      };
    };
    let html = "";
    nodes.forEach((n) => {
      (n.deps || []).forEach((d) => {
        const s = box(d);
        const t = box(n.id);
        if (!s || !t) return;
        const sx = s.x + s.w / 2,
          sy = s.y + s.h;
        const tx = t.x + t.w / 2,
          ty = t.y;
        const dy = ty - sy;
        html += `<path d="M${sx},${sy} C${sx},${sy + dy * 0.5} ${tx},${ty - dy * 0.5} ${tx},${ty}" marker-end="url(#arrow)"/>`;
      });
    });
    g.innerHTML = html;
    const svg = graphEl.querySelector("svg.edges");
    if (svg) {
      svg.setAttribute("width", graphEl.scrollWidth);
      svg.setAttribute("height", graphEl.scrollHeight);
    }
  }

  function renderDetail(n) {
    const el = document.getElementById("detail");
    const list = (arr) => (arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "<em>none</em>");
    el.innerHTML = `
      <h3>${esc(n.name || n.id)} <span style="color:var(--muted);font-size:11px;">(${esc(n.type || "node")}, ${esc(n.risk || "med")} risk)</span></h3>
      <div class="d-row"><div class="d-label">Task</div>${esc(n.task || "—")}</div>
      <div class="d-row"><div class="d-label">Inputs</div>${list(n.inputs)}</div>
      <div class="d-row"><div class="d-label">Outputs</div>${list(n.outputs)}</div>
      <div class="d-row"><div class="d-label">Checks</div>${list(n.checks)}</div>
      <div class="d-row"><div class="d-label">Done when</div>${esc(n.done || "—")}</div>
      <div class="d-row"><div class="d-label">Covers requirements</div>${(n.reqs || []).map(esc).join(", ") || "—"}</div>
    `;
    el.classList.remove("hidden");
  }

  function statusClass(evidence) {
    if (!evidence) return "unknown";
    if (evidence.status === "passed") return "passed";
    if (evidence.status === "flagged") return "flagged";
    if (evidence.status === "blocked") return "blocked";
    return "unknown";
  }

  function statusLabel(evidence) {
    if (!evidence) return "not yet checked";
    return { passed: "addressed", flagged: "flagged", blocked: "blocked" }[evidence.status] || evidence.status;
  }

  function refLabel(ref) {
    return /^https?:\/\//i.test(ref) ? ref.replace(/^https?:\/\//i, "") : ref;
  }

  // Shared by the Architect rail, Dev view's groupings, and QA's "Review
  // Guardrails" mini-rail — same card, same click-to-open behavior everywhere.
  //
  // The whole point of showing `evidence.finding` here (not just the status
  // dot) is answering "why is this addressed/flagged/blocked" without a
  // second click — and `evidence_refs`, when present, is what makes that
  // finding checkable rather than just asserted.
  function guardrailCardHtml(g) {
    const tier = g.binding_tier === "binding" ? "binding" : "advisory";
    const st = statusClass(g.evidence);
    const tasks = g.evidence?.related_tasks || [];
    const files = g.evidence?.related_files || [];
    const refs = g.evidence?.evidence_refs || [];
    const taskChips = tasks.map((t) => `<span class="chip">${esc(t)}</span>`).join("");
    const fileChips = files
      .map((f) => `<span class="chip chip-link" data-openpath="${esc(f)}">${esc(f)}</span>`)
      .join("");
    const refLinks = refs
      .map((r) => `<span class="chip chip-link chip-evidence" data-openpath="${esc(r)}">${esc(refLabel(r))}</span>`)
      .join("");
    const finding = g.evidence?.finding;
    return `
        <div class="g-card ${tier}">
          <div class="g-row1">
            <span class="g-id">${esc(g.id)}</span>
            <span class="g-tier ${tier}">${tier}</span>
          </div>
          <span class="g-title" data-path="${esc(g.path)}">${esc(g.title)}</span>
          <div class="g-summary">${esc(g.summary)}</div>
          <div class="g-status ${st}"><span class="dot"></span>${esc(statusLabel(g.evidence))}</div>
          ${finding ? `<div class="g-finding"><span class="g-finding-label">Why:</span> ${esc(finding)}</div>` : ""}
          ${refLinks ? `<div class="g-evidence-row"><span class="g-finding-label">Evidence:</span> ${refLinks}</div>` : ""}
          ${taskChips || fileChips ? `<div class="chips">${taskChips}${fileChips}</div>` : ""}
        </div>`;
  }

  function wireGuardrailTitleClicks(containerEl, harnessPath) {
    containerEl.querySelectorAll(".g-title").forEach((elm) => {
      elm.addEventListener("click", () => {
        const rel = elm.getAttribute("data-path");
        if (!harnessPath || !rel) return;
        openFile(harnessPath.replace(/\/$/, "") + "/" + rel);
      });
    });
    // related_files chips and evidence_refs both point at workspace-relative
    // paths or URLs — openFile/extension.ts already handles both cases, no
    // harness_path prefix needed (unlike the guardrail's own definition file).
    containerEl.querySelectorAll(".chip-link").forEach((elm) => {
      elm.addEventListener("click", () => openFile(elm.getAttribute("data-openpath")));
    });
  }

  function renderGuardrails(model) {
    const listEl = document.getElementById("guardrails-list");
    const emptyEl = document.getElementById("guardrails-empty");
    const guardrails = model.guardrails || [];

    if (guardrails.length === 0) {
      listEl.classList.add("hidden");
      emptyEl.classList.remove("hidden");
      emptyEl.textContent = model.compliance
        ? "No guardrails apply to this vertical/phase."
        : "No compliance-config.yml found — install the ai-dlc-compliance Speckit extension to see guardrails here.";
      return;
    }

    emptyEl.classList.add("hidden");
    listEl.classList.remove("hidden");
    listEl.innerHTML = guardrails.map(guardrailCardHtml).join("");
    wireGuardrailTitleClicks(listEl, model.compliance?.harness_path);
  }

  // --- dev view: same guardrail data as Architect, grouped by file/task
  // instead of shown as one flat list. A guardrail with no related_files and
  // no related_tasks (e.g. a constitution-phase one) falls into "applies
  // broadly" rather than being hidden — empty attribution is still honest
  // data, not nothing.
  // Groups a guardrail list by related_files -> related_tasks -> "applies to
  // the whole feature", same logic used for either persona-section below.
  function groupByFileTaskBroad(guardrails) {
    const byFile = new Map();
    const byTask = new Map();
    const broad = [];
    guardrails.forEach((g) => {
      const files = g.evidence?.related_files || [];
      const tasks = g.evidence?.related_tasks || [];
      if (files.length) {
        files.forEach((f) => {
          if (!byFile.has(f)) byFile.set(f, []);
          byFile.get(f).push(g);
        });
      } else if (tasks.length) {
        tasks.forEach((t) => {
          if (!byTask.has(t)) byTask.set(t, []);
          byTask.get(t).push(g);
        });
      } else {
        broad.push(g);
      }
    });

    let html = "";
    for (const [file, gs] of byFile) {
      html += `<div class="group-section"><div class="group-heading">${esc(file)}</div>${gs.map(guardrailCardHtml).join("")}</div>`;
    }
    for (const [task, gs] of byTask) {
      html += `<div class="group-section"><div class="group-heading">Task ${esc(task)}</div>${gs.map(guardrailCardHtml).join("")}</div>`;
    }
    if (broad.length) {
      html += `<div class="group-section"><div class="group-heading">Applies to the whole feature</div>${broad.map(guardrailCardHtml).join("")}</div>`;
    }
    return html;
  }

  // category is absent on all the pilot's original (regulatory) content —
  // only cross-cutting/engineering-standards/ sets category: engineering.
  const isEngineering = (g) => g.category === "engineering";

  function renderDevContent(model) {
    const groupsEl = document.getElementById("dev-groups");
    const emptyEl = document.getElementById("dev-empty");
    const guardrails = model.guardrails || [];

    if (guardrails.length === 0) {
      groupsEl.classList.add("hidden");
      emptyEl.classList.remove("hidden");
      emptyEl.textContent = model.compliance
        ? "No development/review-phase guardrails apply to this vertical yet."
        : "No compliance-config.yml found — install the ai-dlc-compliance Speckit extension to see this here.";
      return;
    }
    emptyEl.classList.add("hidden");
    groupsEl.classList.remove("hidden");

    const engineering = guardrails.filter(isEngineering);
    const regulatory = guardrails.filter((g) => !isEngineering(g));

    let html = "";
    if (engineering.length) {
      html += `<h3 class="persona-section-title">Engineering Standards</h3>${groupByFileTaskBroad(engineering)}`;
    }
    if (regulatory.length) {
      html += `<h3 class="persona-section-title">Regulatory / Compliance</h3>${groupByFileTaskBroad(regulatory)}`;
    }
    groupsEl.innerHTML = html;
    wireGuardrailTitleClicks(groupsEl, model.compliance?.harness_path);
  }

  // --- qa view: acceptance-scenario verification status, plus the
  // review-phase guardrails rail for cross-reference. ---
  function scenarioStatusLabel(status) {
    return (
      { passed: "passed", failed: "failed", not_verified: "not verified", not_implemented: "not implemented" }[status] ||
      status
    );
  }

  function renderQaContent(model) {
    const scenariosEl = document.getElementById("qa-scenarios");
    const emptyEl = document.getElementById("qa-empty");
    const results = model.testResults || [];

    if (results.length === 0) {
      scenariosEl.classList.add("hidden");
      emptyEl.classList.remove("hidden");
      emptyEl.textContent = model.featureDirectory
        ? "No test-results.json yet for this feature — it's written automatically at the after_implement hook, once /speckit-implement has run."
        : "Open a Speckit feature to view its test verification status here.";
    } else {
      emptyEl.classList.add("hidden");
      scenariosEl.classList.remove("hidden");

      const byStory = new Map();
      results.forEach((r) => {
        if (!byStory.has(r.user_story)) byStory.set(r.user_story, []);
        byStory.get(r.user_story).push(r);
      });

      let html = "";
      for (const [story, scenarios] of byStory) {
        html += `<div class="scenario-group-title">${esc(story)}</div>`;
        scenarios
          .sort((a, b) => a.scenario_index - b.scenario_index)
          .forEach((r) => {
            const refs = r.evidence_refs || [];
            const refLinks = refs
              .map((ref) => `<span class="chip chip-link chip-evidence" data-openpath="${esc(ref)}">${esc(refLabel(ref))}</span>`)
              .join("");
            html += `
          <div class="scenario-card status-${esc(r.status)}">
            <div class="scenario-text">#${esc(r.scenario_index)} ${esc(r.scenario_text)}</div>
            <div class="scenario-status-row status-${esc(r.status)}"><span class="dot"></span>${esc(scenarioStatusLabel(r.status))}</div>
            ${r.note ? `<div class="scenario-note">${esc(r.note)}</div>` : ""}
            ${refLinks ? `<div class="g-evidence-row"><span class="g-finding-label">Evidence:</span> ${refLinks}</div>` : ""}
          </div>`;
          });
      }
      scenariosEl.innerHTML = html;
      scenariosEl.querySelectorAll(".chip-link").forEach((elm) => {
        elm.addEventListener("click", () => openFile(elm.getAttribute("data-openpath")));
      });
    }

    // Review-phase guardrails, same card component as Architect/Dev.
    const gListEl = document.getElementById("qa-guardrails-list");
    const gEmptyEl = document.getElementById("qa-guardrails-empty");
    const guardrails = model.guardrails || [];
    if (guardrails.length === 0) {
      gListEl.classList.add("hidden");
      gEmptyEl.classList.remove("hidden");
      gEmptyEl.textContent = "No review-phase guardrails apply to this vertical yet.";
    } else {
      gEmptyEl.classList.add("hidden");
      gListEl.classList.remove("hidden");
      gListEl.innerHTML = guardrails.map(guardrailCardHtml).join("");
      wireGuardrailTitleClicks(gListEl, model.compliance?.harness_path);
    }
  }

  function renderNotes(model) {
    const el = document.getElementById("notes");
    const notes = model.notes || [];
    el.innerHTML = notes.map((n) => `<div>· ${esc(n)}</div>`).join("");
  }

  function renderAll(model) {
    document.body.dataset.view = model.viewMode || "architect";
    renderHeader(model);
    renderFeatureSwitcher(model);
    if (model.viewMode === "dev") {
      renderDevContent(model);
    } else if (model.viewMode === "qa") {
      renderQaContent(model);
    } else {
      renderGraph(model);
      renderGuardrails(model);
    }
    renderNotes(model);
  }

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (msg && msg.type === "model" && msg.model) {
      renderAll(msg.model);
    }
  });

  renderAll(window.__AIDLC_MODEL__ || EMPTY_MODEL);
  // Tell the extension host we're ready — it re-sends the current model in
  // case it changed between the initial HTML render and this script running.
  vscodeApi.postMessage({ type: "ready" });
})();
