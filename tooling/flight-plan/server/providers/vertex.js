// Claude on Google Vertex AI. Uses Application Default Credentials.
import { need, postJson } from "./util.js";
export default async function vertex() {
  const project = need("VERTEX_PROJECT_ID"), model = need("VERTEX_MODEL");
  const region = process.env.VERTEX_REGION || "us-east5";
  let GoogleAuth;
  try { ({ GoogleAuth } = await import("google-auth-library")); }
  catch { throw Object.assign(new Error("Install google-auth-library to use Vertex AI."), { status: 500, code: "config" }); }
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const host = region === "global" ? "aiplatform.googleapis.com" : `${region}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${project}/locations/${region}/publishers/anthropic/models/${model}:rawPredict`;
  return {
    name: "Google Vertex AI", model,
    async complete(prompt, { maxTokens, signal }) {
      const token = await (await auth.getClient()).getAccessToken();
      const r = await postJson(url, { authorization: `Bearer ${token.token || token}` },
        { anthropic_version: "vertex-2023-10-16", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }, signal);
      return { text: (r.content || []).filter(b => b.type === "text").map(b => b.text).join(""), usage: { input: r.usage?.input_tokens, output: r.usage?.output_tokens }, truncated: r.stop_reason === "max_tokens" };
    }
  };
}
