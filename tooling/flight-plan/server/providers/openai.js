// Azure OpenAI and any OpenAI-compatible endpoint (OpenAI, LiteLLM, vLLM, Ollama...).
import { need, postJson } from "./util.js";
function parse(r) {
  const c = r.choices?.[0];
  return { text: c?.message?.content || "", usage: { input: r.usage?.prompt_tokens, output: r.usage?.completion_tokens }, truncated: c?.finish_reason === "length" };
}
export function azureOpenAI() {
  const endpoint = need("AZURE_OPENAI_ENDPOINT").replace(/\/$/, ""), key = need("AZURE_OPENAI_API_KEY"), dep = need("AZURE_OPENAI_DEPLOYMENT");
  const ver = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  return {
    name: "Azure OpenAI", model: dep,
    async complete(prompt, { maxTokens, signal }) {
      return parse(await postJson(`${endpoint}/openai/deployments/${dep}/chat/completions?api-version=${ver}`, { "api-key": key },
        { messages: [{ role: "user", content: prompt }], max_completion_tokens: maxTokens }, signal));
    }
  };
}
export function openAICompatible() {
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""), model = need("OPENAI_MODEL");
  const key = process.env.OPENAI_API_KEY;
  return {
    name: "OpenAI-compatible", model,
    async complete(prompt, { maxTokens, signal }) {
      return parse(await postJson(`${base}/chat/completions`, key ? { authorization: `Bearer ${key}` } : {},
        { model, messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }, signal));
    }
  };
}
