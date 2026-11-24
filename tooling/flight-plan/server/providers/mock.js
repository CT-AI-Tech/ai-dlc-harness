// Demo provider: returns a bundled plan so the app runs with no keys.
// With a customer selected, it returns config/customers-seed/<id>.plan.json if one exists.
import { readFile } from "node:fs/promises";
export default function mock() {
  return {
    name: "Mock (sample plan)", model: "none",
    async complete(prompt, { customerId } = {}) {
      await new Promise(r => setTimeout(r, 600));
      let raw = null;
      if (customerId && /^[a-z0-9-]+$/.test(customerId)) raw = await readFile(new URL(`../../config/customers-seed/${customerId}.plan.json`, import.meta.url), "utf8").catch(() => null);
      const plan = JSON.parse(raw || await readFile(new URL("../../public/sample-plan.json", import.meta.url), "utf8"));
      delete plan.brief;
      return { text: JSON.stringify(plan), usage: {}, truncated: false };
    }
  };
}
