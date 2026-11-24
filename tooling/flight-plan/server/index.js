import "dotenv/config";
import express from "express";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createProvider } from "./providers/index.js";
import { buildPrompt, extractJson, normalizePlan } from "./compiler.js";
import { listPlans, getPlan, savePlan, deletePlan } from "./store.js";
import { initCustomers, listCustomers, getCustomer, saveCustomer, deleteCustomer, customerContext } from "./customers.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(path.join(root, "config/catalog.json"), "utf8"));
const provider = await createProvider();
await initCustomers(root, catalog);
// Any profile key or document id is citable in a saved plan.
const ANY_SOURCE = new Set([...catalog.profileFields.map(f => `P:${f.key}`), ...Array.from({ length: 20 }, (_, i) => `DOC-${i + 1}`)]);
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 8000);
const TIMEOUT = Number(process.env.LLM_TIMEOUT_MS || 180000);
const LIMIT = Number(process.env.COMPILE_RATE_LIMIT || 20);

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

// Optional basic auth for the whole app.
const { BASIC_AUTH_USER: U, BASIC_AUTH_PASS: P } = process.env;
if (U && P) {
  const expected = "Basic " + Buffer.from(`${U}:${P}`).toString("base64");
  app.use((req, res, next) => {
    if (req.path === "/api/health" || req.headers.authorization === expected) return next();
    res.set("WWW-Authenticate", 'Basic realm="Flight Plan"').status(401).send("Sign in required");
  });
}

// Per-IP compile limit (in memory, per instance).
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now(), key = req.ip, list = (hits.get(key) || []).filter(t => now - t < 3600e3);
  if (list.length >= LIMIT) return res.status(429).json({ code: "rate_limited", message: `Limit of ${LIMIT} compiles per hour reached. Try again later.` });
  list.push(now); hits.set(key, list); next();
}

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/api/config", (req, res) => res.json({ catalog, compiler: { provider: provider.name, model: provider.model } }));

app.post("/api/compile", rateLimit, async (req, res) => {
  const requirement = String(req.body?.requirement || "").trim();
  if (requirement.length < 60) return res.status(400).json({ code: "too_short", message: "Add more detail: who needs what, which systems it touches, and any rules or deadlines." });
  const customerId = req.body?.customerId || null;
  const customer = customerId ? await getCustomer(customerId) : null;
  if (customerId && !customer) return res.status(404).json({ code: "no_customer", message: "That customer no longer exists. Pick another or none." });
  const ctx = customerContext(customer);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  res.on("close", () => { if (!res.writableEnded) ctl.abort(); });
  const t0 = Date.now();
  try {
    const out = await provider.complete(buildPrompt(requirement, catalog, ctx), { maxTokens: MAX_TOKENS, signal: ctl.signal, customerId });
    if (out.truncated) return res.status(502).json({ code: "truncated", message: "The plan was cut short. Raise LLM_MAX_TOKENS or shorten the requirement." });
    const plan = normalizePlan(extractJson(out.text), requirement, catalog, ctx.sources);
    plan.customer = customer ? { id: customer.id, name: customer.name } : null;
    res.json({ plan, meta: { provider: provider.name, model: provider.model, ms: Date.now() - t0, usage: out.usage, contextChars: ctx.text.length } });
  } catch (e) {
    if (ctl.signal.aborted && !res.headersSent) return res.status(504).json({ code: "timeout", message: "The model took too long. Try again or shorten the requirement." });
    console.error("[compile]", e.message);
    res.status(e.status || 500).json({ code: e.code || "error", message: e.message });
  } finally { clearTimeout(timer); }
});

app.get("/api/plans", async (req, res) => res.json(await listPlans()));
app.get("/api/plans/:id", async (req, res) => { const p = await getPlan(req.params.id); p ? res.json(p) : res.status(404).json({ code: "not_found" }); });
app.post("/api/plans", async (req, res) => {
  const plan = req.body?.plan;
  if (!plan?.epic || !Array.isArray(plan?.nodes)) return res.status(400).json({ code: "bad_plan", message: "Body must be {plan}." });
  try {
    const clean = normalizePlan(plan, plan.brief || "", catalog, ANY_SOURCE);
    clean.customer = plan.customer?.id ? { id: String(plan.customer.id).slice(0, 48), name: String(plan.customer.name || "").slice(0, 80) } : null;
    res.json(await savePlan(clean, { id: req.body.id, provider: req.body.provider }));
  }
  catch (e) { res.status(400).json({ code: e.code || "bad_plan", message: e.message }); }
});
app.delete("/api/plans/:id", async (req, res) => res.json({ ok: await deletePlan(req.params.id) }));

app.get("/api/customers", async (req, res) => res.json(await listCustomers()));
app.get("/api/customers/:id", async (req, res) => { const c = await getCustomer(req.params.id); c ? res.json(c) : res.status(404).json({ code: "not_found", message: "Customer not found." }); });
const sendErr = (res, e) => res.status(e.status || 500).json({ code: e.code || "error", message: e.message });
app.post("/api/customers", async (req, res) => { try { res.json(await saveCustomer(req.body)); } catch (e) { sendErr(res, e); } });
app.put("/api/customers/:id", async (req, res) => {
  if (!(await getCustomer(req.params.id))) return res.status(404).json({ code: "not_found", message: "Customer not found." });
  try { res.json(await saveCustomer(req.body, req.params.id)); } catch (e) { sendErr(res, e); }
});
app.delete("/api/customers/:id", async (req, res) => res.json({ ok: await deleteCustomer(req.params.id) }));

app.use(express.static(path.join(root, "public")));

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`Flight Plan on http://localhost:${port} · compiler: ${provider.name} (${provider.model})`));
