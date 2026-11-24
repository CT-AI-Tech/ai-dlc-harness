// Anthropic API (console.anthropic.com). Billed to the API key's organization.
import { need, postJson } from "./util.js";
export default function anthropic() {
  const key = need("ANTHROPIC_API_KEY");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  return {
    name: "Anthropic API", model,
    async complete(prompt, { maxTokens, signal }) {
      const r = await postJson("https://api.anthropic.com/v1/messages",
        { "x-api-key": key, "anthropic-version": "2023-06-01" },
        { model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }, signal);
      return { text: (r.content || []).filter(b => b.type === "text").map(b => b.text).join(""), usage: { input: r.usage?.input_tokens, output: r.usage?.output_tokens }, truncated: r.stop_reason === "max_tokens" };
    }
  };
}
