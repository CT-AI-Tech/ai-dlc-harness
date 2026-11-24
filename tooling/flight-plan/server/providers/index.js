import anthropic from "./anthropic.js";
import bedrock from "./bedrock.js";
import vertex from "./vertex.js";
import mock from "./mock.js";
import { azureOpenAI, openAICompatible } from "./openai.js";

const FACTORIES = { anthropic, bedrock, vertex, "azure-openai": azureOpenAI, "openai-compatible": openAICompatible, mock };

export async function createProvider(name = process.env.LLM_PROVIDER || "mock") {
  const f = FACTORIES[name];
  if (!f) throw new Error(`Unknown LLM_PROVIDER "${name}". Use one of: ${Object.keys(FACTORIES).join(", ")}.`);
  return await f();
}
