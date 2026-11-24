// Claude on AWS Bedrock. Credentials come from the standard AWS chain.
import { need } from "./util.js";
export default async function bedrock() {
  const modelId = need("BEDROCK_MODEL_ID");
  let sdk;
  try { sdk = await import("@aws-sdk/client-bedrock-runtime"); }
  catch { throw Object.assign(new Error("Install @aws-sdk/client-bedrock-runtime to use Bedrock."), { status: 500, code: "config" }); }
  const client = new sdk.BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
  return {
    name: "AWS Bedrock", model: modelId,
    async complete(prompt, { maxTokens, signal }) {
      const body = JSON.stringify({ anthropic_version: "bedrock-2023-05-31", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] });
      const out = await client.send(new sdk.InvokeModelCommand({ modelId, contentType: "application/json", accept: "application/json", body }), { abortSignal: signal });
      const r = JSON.parse(new TextDecoder().decode(out.body));
      return { text: (r.content || []).filter(b => b.type === "text").map(b => b.text).join(""), usage: { input: r.usage?.input_tokens, output: r.usage?.output_tokens }, truncated: r.stop_reason === "max_tokens" };
    }
  };
}
