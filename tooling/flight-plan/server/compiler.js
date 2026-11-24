// Turns a free-text requirement into a validated plan.
// The model only decomposes work; all pricing happens in the browser from config/catalog.json.

export function buildPrompt(requirement, catalog, ctx = { text: "", sources: new Set() }) {
  const grounded = ctx.sources.size > 0;
  const types = catalog.compilerTypes;
  return `You are the Intent Compiler of Flight Plan, a planning tool for agentic software delivery. Turn the requirement below into a build plan as JSON.

The platform adds these nodes itself, so do NOT include them: intent compiler, scope sign-off, test strategist, test runner, security scan, compliance check, performance test, code review, release, evidence pack, and all human gates. You choose only the design and build work.

Agent types you may use (exact type keys):
- domain_model: domain entities, standards mappings (FHIR, X12, HL7, CSV layouts), data dictionaries
- architecture: ADRs, API contracts, sequence diagrams, threat model. Include one when there are new services, external APIs or cross-system flows.
- data_migration: new or changed database schema, migrations, seed data
- backend: services, APIs, business logic, jobs
- integration: connectors to external systems such as payers, EHRs, clearinghouses, government portals, third-party APIs
- ui: screens, portals, front-end flows
- workflow: rules engines, eligibility logic, state machines, deadlines, notifications
- ai_ml: LLM or ML features such as extraction, classification, summarization
- infra: cloud infrastructure, IaC, environments, tenancy and isolation setup
- reporting: dashboards, analytics, exports
(Allowed keys: ${types.join(", ")}.)

Sizes: S, M, L, XL. Prefer splitting XL work into two nodes.

Rules:
- Return 3 to 12 nodes, in dependency order: a node may depend only on nodes listed before it. deps holds ids of earlier nodes it needs; nodes with no deps start right after scope sign-off. Maximize safe parallelism.
- Split the requirement into atomic, testable requirements (6 to 25). Every requirement must appear in at least one node's reqs.
- risk is low, med or high. High means hard to undo, touches PHI, money or security, or crosses an external boundary.
- ambiguity is 0 (clear) to 1 (unclear). Ask questions only where ambiguity is above 0.35 and the answer would change the plan; give a proposed answer for each.
- flags.phi is true if protected health information is handled. flags.regulations lists named regulations or standards that impose controls (for example HIPAA, SOC 2, No Surprises Act).
- success: 4 to 7 measurable epic-level success criteria, with numbers where possible.
- Node names are specific to this epic (e.g. "EOB Extraction Pipeline", not "AI Component Builder"). Keep every string under 120 characters. inputs, outputs and checks have 2 to 4 items each. done is one measurable closing condition.
- Do not estimate tokens, hours or cost. The platform prices nodes from its own catalog.
- task: one or two sentences saying exactly what this agent will do on this epic, naming the concrete technologies and systems involved.
${grounded ? `- Customer context is provided below. Prefer the customer's stack, systems, standards and decisions over generic best practice, and do not ask questions the context already answers. If you follow best practice against the context, say why in the approach.
- sources: on every requirement, question and node, list the context ids that drove it (profile ids like P:techStack, document ids like DOC-1). Use [] when it comes only from general best practice. Never cite an id that is not in the context.` : "- sources: use [] everywhere (no customer context was given)."}

Reply with only JSON, no prose and no code fence, in exactly this shape:
{"epic":{"code":"short code like PA-142","title":"...","summary":"one sentence","approach":"2-3 sentences on how the work is sequenced and why"},
 "flags":{"phi":true,"regulations":["HIPAA"]},
 "requirements":[{"id":"R1","text":"...","type":"functional|non-functional|compliance|integration","ambiguity":0.2,"sources":["DOC-1"]}],
 "questions":[{"q":"...","proposed":"...","reqs":["R4"],"sources":[]}],
 "success":["..."],
 "nodes":[{"id":"D1","type":"domain_model","name":"...","size":"M","risk":"med","deps":[],"reqs":["R1"],"task":"...","sources":["P:techStack"],"inputs":["..."],"outputs":["..."],"checks":["..."],"done":"..."}]}

${ctx.text ? ctx.text + "\n" : ""}Requirement:
"""
${requirement.slice(0, 12000)}
"""`;
}

// Tolerant JSON extraction: whole reply, then a fenced block, then first { to last }.
export function extractJson(text) {
  const tries = [text];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) tries.push(fence[1]);
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) tries.push(text.slice(a, b + 1));
  for (const t of tries) { try { return JSON.parse(t); } catch {} }
  const err = new Error("The model did not return valid JSON.");
  err.status = 502; err.code = "invalid_json";
  throw err;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const str = (v, m = 200) => (typeof v === "string" ? v.trim().slice(0, m) : "");
const arr = (v, m = 6, l = 160) => (Array.isArray(v) ? v.map(x => str(x, l)).filter(Boolean).slice(0, m) : []);

export function normalizePlan(raw, brief, catalog, allowed = new Set()) {
  const src = v => arr(v, 8, 30).filter(x => allowed.has(x));
  if (!raw || typeof raw !== "object") throw shapeError();
  const types = catalog.compilerTypes, sizes = catalog.sizes;
  const e = raw.epic || {};
  const requirements = (Array.isArray(raw.requirements) ? raw.requirements : []).slice(0, 40)
    .map((r, i) => ({ id: str(r.id, 8) || "R" + (i + 1), text: str(r.text, 220), type: str(r.type, 20) || "functional", ambiguity: clamp(Number(r.ambiguity) || 0, 0, 1), sources: src(r.sources) }))
    .filter(r => r.text);
  const rids = new Set(requirements.map(r => r.id));
  const ids = new Set();
  const nodes = (Array.isArray(raw.nodes) ? raw.nodes : []).slice(0, 14).map((n, i) => {
    let id = str(n.id, 10) || "N" + (i + 1);
    if (ids.has(id)) id += "_" + i;
    ids.add(id);
    const type = types.includes(n.type) ? n.type : "backend";
    return {
      id, type, name: str(n.name, 48) || catalog.agents[type].name,
      size: sizes[n.size] ? n.size : "M",
      risk: ["low", "med", "high"].includes(n.risk) ? n.risk : undefined,
      deps: arr(n.deps, 8, 12), reqs: arr(n.reqs, 20, 8).filter(r => rids.has(r)),
      task: str(n.task, 260), sources: src(n.sources), inputs: arr(n.inputs, 4), outputs: arr(n.outputs, 4), checks: arr(n.checks, 4), done: str(n.done, 180)
    };
  });
  if (!requirements.length || !nodes.length) throw shapeError();
  const f = raw.flags || {};
  return {
    epic: { code: str(e.code, 14) || "EPIC", title: str(e.title, 70) || "Untitled epic", summary: str(e.summary, 220), approach: str(e.approach, 500) },
    brief, flags: { phi: !!f.phi, regulations: arr(f.regulations, 6, 30) }, requirements,
    questions: (Array.isArray(raw.questions) ? raw.questions : []).slice(0, 8)
      .map(q => ({ q: str(q.q, 200), proposed: str(q.proposed, 200), reqs: arr(q.reqs, 6, 8), sources: src(q.sources) })).filter(q => q.q),
    success: arr(raw.success, 8, 180), nodes
  };
}

function shapeError() {
  const err = new Error("The model returned a plan without requirements or nodes.");
  err.status = 502; err.code = "shape";
  return err;
}
