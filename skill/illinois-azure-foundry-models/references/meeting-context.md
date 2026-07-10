# Meeting Context: Azure AI Foundry Models

Sources: Granola meeting "Model routing strategy and Azure deployment with Dejan" (June 9, 2026), the June 2026 live-inventory audit, and the Project Claw deployment on 2026-06-27.

## Concrete Decisions

- Each app gets its **own** Azure AI Foundry / Cognitive Services account. This is the opposite of the shared-layer rule for compute/Postgres/logs: because `GlobalStandard` deployments are **$0 when idle**, a per-app account adds no fixed cost and keeps cost attribution and TPM quota cleanly separated per app.
- Prefer `--kind AIServices` (the Foundry multi-model surface) over `--kind OpenAI` (Azure-OpenAI-only) — same price, broader model menu (OpenAI + DeepSeek + Kimi + …).
- Apps call models through the OpenAI-compatible `/openai/v1/` surface on the account's custom-domain endpoint, with the account key as a Bearer token. The string sent as `model` is the **deployment name**, not the catalog model id.
- Control cost with TPM quota at deploy time plus in-app token budgets, not by sharing accounts.

## Live Inventory (observed 2026-06-27, `DL_ResourceGroup_01`)

| Account | Kind | Endpoint host | Deployments seen |
|---|---|---|---|
| `dl-foundry-projectclaw` | AIServices | dl-foundry-projectclaw.cognitiveservices.azure.com | gpt-4.1 (2025-04-14), gpt-5.4 (2026-03-05) — created for Project Claw |
| `DL-Foundry-MindForum` | AIServices | dl-foundry-mindforum.cognitiveservices.azure.com | gpt-5.4, gpt-4.1, Kimi-K2.6, DeepSeek-V4-Pro, DeepSeek-V3-0324, DeepSeek-V4-Flash |
| `uniquick-aoai` | OpenAI | uniquick-aoai.openai.azure.com | gpt-4o-mini |
| `ashleyn4-7611-resource` | AIServices | ashleyn4-7611-resource.cognitiveservices.azure.com | gpt-5.4 |

All deployments above use the `GlobalStandard` SKU.

## Notes

- AIServices/OpenAI account names may contain hyphens (unlike ACR registry names) — `dl-foundry-<app>` is fine. `--custom-domain` must be set so the `https://<name>.cognitiveservices.azure.com/` endpoint exists.
- The `/openai/v1/` base is appended to the bare account endpoint. nanobot's `azure_openai` provider appends it itself, so its `api_base` must be the bare endpoint (no `/openai/v1`).
- Verified end to end on 2026-06-27: a `gpt-5.4` deployment on `dl-foundry-projectclaw` returned a chat completion via `POST {endpoint}/openai/v1/chat/completions` with `key1` as the Bearer token.
- Region kept at `northcentralus`, consistent with the App Service and Container Apps deployments.
