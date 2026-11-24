// Simple file-backed plan library. Swap for a database when you need multi-instance hosting.
import { mkdir, readFile, readdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const dir = path.resolve(process.env.PLAN_STORE_DIR || "./data/plans");
await mkdir(dir, { recursive: true });
const file = id => path.join(dir, `${id}.json`);
const validId = id => /^[a-f0-9-]{36}$/.test(id);

export async function listPlans() {
  const names = (await readdir(dir)).filter(n => n.endsWith(".json"));
  const items = await Promise.all(names.map(async n => {
    try { const p = JSON.parse(await readFile(path.join(dir, n), "utf8")); return { id: p.id, code: p.plan.epic.code, title: p.plan.epic.title, savedAt: p.savedAt, provider: p.provider, customer: p.plan.customer?.name || null }; }
    catch { return null; }
  }));
  return items.filter(Boolean).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
export async function getPlan(id) {
  if (!validId(id)) return null;
  try { return JSON.parse(await readFile(file(id), "utf8")); } catch { return null; }
}
export async function savePlan(plan, meta = {}) {
  const id = meta.id && validId(meta.id) ? meta.id : randomUUID();
  const rec = { id, savedAt: new Date().toISOString(), provider: meta.provider || null, plan };
  await writeFile(file(id), JSON.stringify(rec, null, 2));
  return rec;
}
export async function deletePlan(id) {
  if (!validId(id)) return false;
  try { await unlink(file(id)); return true; } catch { return false; }
}
