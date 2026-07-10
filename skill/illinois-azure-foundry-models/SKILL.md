---
name: illinois-azure-foundry-models
description: Provision and operate per-app Azure AI Foundry (AIServices / Azure OpenAI) model resources for University of Illinois Disruption Lab apps — create the account, deploy or swap a model, fetch the endpoint and keys, call the `/openai/v1/` surface, and rotate keys. Use whenever an app needs an LLM on Illinois Azure: standing up a new Foundry/AIServices or Azure OpenAI account, deploying or switching a model (gpt-5.x, gpt-4.1, DeepSeek, Kimi), choosing kind/SKU/quota, wiring an app's provider/endpoint/api_key, or rotating a leaked key. Pairs with illinois-azure-governance (cost/quota guardrails) and illinois-azure-container-deploy / illinois-azure-cli-deploy (where the model gets wired into the running app).
---

# Illinois Azure Foundry Models

Use this skill to give an app its LLM on Illinois Azure: a dedicated Azure AI Foundry resource (an `AIServices` or `OpenAI` Cognitive Services account), one or more model deployments, and the endpoint + key the app uses to call them. This is the operational counterpart to the AI row in `illinois-azure-governance` — that skill says *per-app AI account is the correct boundary*; this skill is *how you actually create and run one*.

For meeting-specific facts and the current lab inventory, read `references/meeting-context.md`. Confirm cost/quota guardrails with `illinois-azure-governance` first, then run these commands. Once the model exists, wire it into the app with `illinois-azure-container-deploy` (containers/MCP) or `illinois-azure-cli-deploy` (App Service).

## Golden Rules

- **A per-app AI account is the RIGHT boundary** — unlike the shared App Service plan, Postgres server, and Log Analytics workspace (which apps must *share*), each app should get its **own** Foundry/OpenAI account. `GlobalStandard` deployments cost **$0 idle**, so a dedicated account adds no fixed cost while preserving per-app cost attribution and TPM quota. Do not pile new apps onto another app's account (e.g. MindForum's) — that mixes their cost and quota.
- **Pick the right `kind`.** `--kind AIServices` is the Foundry multi-model surface (OpenAI models **plus** DeepSeek, Kimi, etc.); `--kind OpenAI` is Azure-OpenAI-only. Prefer `AIServices` unless you specifically need an OpenAI-only resource — it costs the same and keeps the model menu open.
- **`--custom-domain` is required.** Without it the account has no `https://<name>.cognitiveservices.azure.com/` host, and the keyed `/openai/v1/` surface (and Entra token auth) won't work. Set `--custom-domain <account-name>`.
- **Model = deployment name, everywhere downstream.** The string the app sends as `model` is the *deployment* name, not the catalog model id. Name the deployment after the model (`gpt-4.1`) so the two never drift.
- **The account key is a secret.** Store it in Container Apps secrets or Key Vault — never in the image, repo, or a logged command. Each account has **two** keys (`key1`/`key2`) specifically so you can rotate with zero downtime.
- **Resource group `DL_ResourceGroup_01`, region `northcentralus`,** tagged `creator=<netid> app=dl-<app> purpose=llm` — consistent with the rest of the lab. AIServices account names *may* contain hyphens (unlike ACR), so use `dl-foundry-<app>`.

## 0. Preflight

```bash
az login
az account set --subscription "Urban Business Disruption Lab"   # or: urbana-business-disruptionlab
RG="DL_ResourceGroup_01"; REGION="northcentralus"
APP="<app>"                       # logical app name, e.g. projectclaw
ACCT="dl-foundry-${APP}"          # AIServices account name (hyphens OK)

# Reuse vs create: a per-app account is correct, but check what already exists first.
az cognitiveservices account list -g "$RG" \
  --query "[].{name:name, kind:kind, endpoint:properties.endpoint, sku:sku.name}" -o table
```

## 1. Create the per-app Foundry account

```bash
az cognitiveservices account create \
  -n "$ACCT" -g "$RG" -l "$REGION" \
  --kind AIServices --sku S0 \
  --custom-domain "$ACCT" \
  --tags creator=<netid> app=dl-${APP} purpose=llm \
  --yes
```

`--yes` accepts the Responsible AI terms. The endpoint becomes `https://${ACCT}.cognitiveservices.azure.com/`.

## 2. Pick a model + check quota, then deploy

```bash
# Models this account can deploy:
az cognitiveservices account list-models -n "$ACCT" -g "$RG" \
  --query "[].{model:name, version:version, format:format}" -o table

# Region-wide availability and remaining quota (avoid a 0-quota deploy failure):
az cognitiveservices usage list -l "$REGION" -o table

# Deploy. --sku-capacity is TPM in thousands. GlobalStandard is region-agnostic and $0 idle.
az cognitiveservices account deployment create \
  -g "$RG" -n "$ACCT" \
  --deployment-name gpt-4.1 \
  --model-name gpt-4.1 --model-version 2025-04-14 --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 50
```

To **swap models**, deploy the new one alongside (keep the old as a fallback) and repoint the app's `model` setting:

```bash
az cognitiveservices account deployment create -g "$RG" -n "$ACCT" \
  --deployment-name gpt-5.4 --model-name gpt-5.4 --model-version 2026-03-05 \
  --model-format OpenAI --sku-name GlobalStandard --sku-capacity 50
```

## 3. Get the endpoint and key

```bash
ENDPOINT=$(az cognitiveservices account show -g "$RG" -n "$ACCT" --query properties.endpoint -o tsv)
KEY=$(az cognitiveservices account keys list -g "$RG" -n "$ACCT" --query key1 -o tsv)   # key1 or key2
echo "$ENDPOINT"            # https://dl-foundry-<app>.cognitiveservices.azure.com/
# Never echo $KEY — pipe it straight into a secret store (Step 5 / the deploy skills).
```

## 4. Call the model (`/openai/v1/` surface)

The account exposes an OpenAI-compatible v1 API at `{endpoint}/openai/v1/`. Authenticate with the key as a Bearer token; send the **deployment name** as `model`:

```bash
curl -sS "${ENDPOINT%/}/openai/v1/chat/completions" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"model":"gpt-4.1","messages":[{"role":"user","content":"Reply with one word: pong"}]}'
```

A `{"choices":[…"pong"…]}` response confirms the account, deployment, and key all work end to end.

## 5. Wire it into the app

Give clients the **bare endpoint** plus the key as a secret. For an OpenAI-compatible client, the base URL is `{endpoint}/openai/v1/` and `model` is the deployment name.

For **nanobot / Project Claw** the provider is `azure_openai`, which needs `api_key` + `api_base` and treats `model` as the deployment name. `api_base` is the **bare** endpoint — the provider appends `/openai/v1/` itself, so don't include the path:

```bash
# via illinois-azure-container-deploy (Container Apps secrets + NANOBOT_* env):
NANOBOT_AGENTS__DEFAULTS__PROVIDER=azure_openai
NANOBOT_AGENTS__DEFAULTS__MODEL=gpt-4.1                                   # = deployment name
NANOBOT_PROVIDERS__AZURE_OPENAI__API_BASE=https://dl-foundry-<app>.cognitiveservices.azure.com/
NANOBOT_PROVIDERS__AZURE_OPENAI__API_KEY=secretref:azure-openai-key       # key stored as a secret
```

## 6. Rotate a key

```bash
# Two keys exist for zero-downtime rotation: switch the app to key2, regenerate key1, switch back.
az cognitiveservices account keys regenerate -g "$RG" -n "$ACCT" --key-name key1
az cognitiveservices account keys list -g "$RG" -n "$ACCT" --query key1 -o tsv   # then update the app secret
```

## Common Pitfalls

- Creating an `OpenAI`-kind account, then needing DeepSeek/Kimi → use `--kind AIServices` from the start.
- Omitting `--custom-domain` → no usable `https://<name>.cognitiveservices.azure.com/` host for the keyed v1 surface.
- Deploying into a region/model with 0 quota → `deployment create` fails; check `az cognitiveservices usage list` first.
- Newer reasoning models (gpt-5.x) may require `max_completion_tokens` instead of `max_tokens` and may reject `temperature` — drop those fields if you get a 400.
- Passing `api_base` already ending in `/openai/v1` to a client that appends it (e.g. nanobot) → doubled path / 404. Give the bare endpoint.
- Baking the key into the image or config file → use Container Apps secrets / Key Vault.
- Reusing another app's account "to save time" → breaks per-app cost attribution and shares the TPM quota; create a dedicated account ($0 idle).

## Output Expectations

When asked to provision or change an app's model, produce:

- The account name (`dl-foundry-<app>`), `kind`, region, and tags.
- The model deployment(s): deployment name, model + version, SKU, capacity — and the quota check.
- The endpoint and how to fetch the key (names, not secret values).
- The exact `/openai/v1/` call shape (model = deployment name).
- The app-wiring values: `provider` / `api_base` / `model` (names, not secrets) and which deploy skill applies.
- Rotation and verification steps.
- Any guardrail confirmations still owed to Adam/IT Partners (large TPM capacity, CFOP for reservations).
