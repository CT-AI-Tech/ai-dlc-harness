export function need(name) {
  const v = process.env[name];
  if (!v) throw Object.assign(new Error(`Missing ${name} in .env for this provider.`), { status: 500, code: "config" });
  return v;
}
export async function postJson(url, headers, body, signal) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`Provider returned ${res.status}: ${text.slice(0, 400)}`);
    err.status = res.status === 429 ? 429 : 502; err.code = res.status === 429 ? "rate_limited" : "upstream";
    throw err;
  }
  return JSON.parse(text);
}
