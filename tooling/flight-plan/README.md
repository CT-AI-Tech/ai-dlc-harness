# Flight Plan

Compile a plain-language requirement into a priced, simulated agentic build plan: atomic requirements, agent nodes, human gates, tests, success criteria, and P50/P90 forecasts for time, tokens, cost and review effort.

## How it works

```
Browser (public/)                 Server (server/)                    Model provider
─────────────────                 ───────────────                     ──────────────
Requirement ── POST /api/compile ─▶ builds prompt (compiler.js) ──────▶ Anthropic API / Bedrock /
                                   validates JSON (normalizePlan) ◀──── Vertex / Azure OpenAI /
Graph, simulation,  ◀── plan ───── returns plan (no prices)              OpenAI-compatible / mock
budget, tests                      saves plans (store.js → data/plans)
priced from config/catalog.json
```

- **The model only decomposes work.** It returns requirements, questions, success criteria and the design/build nodes. It never estimates tokens, hours or cost.
- **Pricing is deterministic.** Every node is priced from `config/catalog.json` (baseline × size × model tier). The browser adds standard nodes, places human gates by rule and runs a 3,000-run Monte Carlo simulation.
- **Keys never reach the browser.** The server holds provider credentials and is the only thing that calls the model.

## Run it

Requires Node 20+.

```bash
cp .env.example .env      # pick a provider and fill in its settings
npm install
npm start                 # http://localhost:8080
```

With `LLM_PROVIDER=mock` (the default) the app runs with no keys and returns the sample plan, which is useful for demos.

### Docker

```bash
docker build -t flight-plan .
docker run -p 8080:8080 --env-file .env -v flight-plan-data:/data flight-plan
```

## Choosing a model provider

Set `LLM_PROVIDER` in `.env`, then fill in that provider's section. Only one is active at a time.

| `LLM_PROVIDER` | Use when | Billing | Required settings |
|---|---|---|---|
| `anthropic` | Direct Claude API access | Anthropic API organization (console.anthropic.com) | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| `bedrock` | Claude inside your AWS account | Your AWS bill | `AWS_REGION`, `BEDROCK_MODEL_ID`, AWS credentials (env, profile or role) |
| `vertex` | Claude inside your GCP project | Your GCP bill | `VERTEX_PROJECT_ID`, `VERTEX_REGION`, `VERTEX_MODEL`, Application Default Credentials |
| `azure-openai` | Azure OpenAI deployment | Your Azure bill | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT` |
| `openai-compatible` | OpenAI, or any gateway with an OpenAI-style API (LiteLLM, vLLM, Ollama, an internal gateway) | That endpoint | `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_API_KEY` if needed |
| `mock` | Demos and UI work | None | None |

A Claude.ai chat subscription (Pro, Max, Team) cannot be used as a backend for a self-hosted app. Use an API key or a cloud provider above. Model IDs change over time; copy the exact ID from your provider's console.

To route through a company LLM gateway, use `openai-compatible` and point `OPENAI_BASE_URL` at the gateway.

Plans come out best from strong reasoning models. Smaller models may return invalid JSON more often; the server rejects those with a clear error instead of showing a broken plan.

## Customer context

Pick a customer in the **Customer context** bar to make plans specific to that customer. Everything is editable at runtime from **Edit** or **New customer**, and saved on the server (`data/customers/<id>.json`).

| Layer | What you enter | How it is used |
|---|---|---|
| Profile | Business context, tech stack, cloud, existing systems, standards, NFR targets, regulations, team and approval bodies, notes | Sent to the model as context. The compiler prefers these facts over general best practice and cites them as `P:<field>` |
| Documents | Plain-text reference material (RFP extracts, ADRs, integration standards). Paste or import .txt/.md/.csv/.json/.yaml files | Sent to the model, cited as `DOC-n`. Up to 20 documents and 200,000 characters per customer; `PROMPT_DOC_BUDGET` caps how much goes into each compile |
| Gate rules | Gates the customer always requires, placed after scope sign-off, after a given agent type, or before go-live | Inserted by code into every plan for that customer, so they never depend on the model |
| Estimator | JSON overrides for agent baselines, gate minutes, tier prices and size multipliers | Merged over `config/catalog.json` for that customer only |

Gate rules and estimator changes apply immediately to the plan on screen. Profile and document changes need a recompile. Every requirement, question and agent shows which profile fields or documents it drew on, or "Best practice" when none.

A fictional sample, **Acme Health (sample)**, is seeded on first start from `config/customers-seed/`. With the `mock` provider it returns a pre-grounded plan so you can demo the difference without a model key.

Profile fields are defined in `config/catalog.json` under `profileFields`; add or rename fields there.

Customer documents are sent to your configured model provider on every compile. Keep PHI and secrets out of them, and choose a provider and region your data agreements allow.

## Configuring the estimator

`config/catalog.json` is the estimator. Edit it and restart.

- `agents`: one entry per agent type, with baseline `tok` (millions of tokens) and `hrs` at size M, model `tier` (0 Economy, 1 Balanced, 2 Frontier), default `risk`, contracts and checks. An agent with `gate` automatically gets that human gate after it.
- `gates`: reviewer role, review minutes, risk, what the reviewer sees.
- `tiers`: `price` is the blended $ per million tokens for that tier; `tok`, `time`, `sig` adjust tokens, duration and uncertainty.
- `sizes`: multipliers for S, M, L, XL.
- `riskSigma`, `autonomy`, `skippedGateReworkWeight`: simulation behaviour.

The shipped numbers are illustrative. Replace them with actuals from real runs to calibrate the forecasts.

## API

| Method | Path | Body / result |
|---|---|---|
| GET | `/api/config` | Catalog and active compiler (no secrets) |
| POST | `/api/compile` | `{requirement, customerId?}` → `{plan, meta}` |
| GET | `/api/plans` | Saved plan list |
| GET | `/api/plans/:id` | One saved plan |
| POST | `/api/plans` | `{plan, id?}` → saved record |
| DELETE | `/api/plans/:id` | Remove a plan |
| GET | `/api/customers` | Customer list |
| GET / PUT / DELETE | `/api/customers/:id` | Read, replace or remove one customer |
| POST | `/api/customers` | Create a customer |
| GET | `/api/health` | Liveness check |

The plan JSON is the integration contract: the same shape can be produced by other tools or consumed by an execution platform.

## Before deploying for a team

- Turn on access control: set `BASIC_AUTH_USER` and `BASIC_AUTH_PASS`, or put the app behind your SSO (for example Azure App Service authentication or an identity-aware proxy) and leave basic auth empty.
- `COMPILE_RATE_LIMIT` caps compiles per IP per hour to protect your model budget.
- Plans and customers are stored as folders of JSON files. It suits a single instance with a persistent volume. For several instances, replace `server/store.js` with a database.
- Requirements are sent to the configured provider. Use a provider and region your data policy allows, and keep PHI out of requirement text.
