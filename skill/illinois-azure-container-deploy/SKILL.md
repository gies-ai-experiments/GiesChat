---
name: illinois-azure-container-deploy
description: Deploy containerized University of Illinois Disruption Lab workloads — especially non-traditional apps like MCP (Model Context Protocol) servers — to Azure using a dedicated Azure Container Registry per application. Use when you need the `az acr` and container commands to build and push an image, create a per-app registry, and run it on Azure Container Apps or Web App for Containers, including registry auth, secrets, ingress/ports, and verification. Pairs with illinois-azure-cli-deploy (App Service web apps) and illinois-azure-governance (guardrails).
---

# Illinois Azure Container Deploy

Use this skill for workloads that ship as a container image rather than a plain App Service web app — for example an MCP server (which is "not a traditional web application") or an internal messaging service like Project Claw.

**Registry convention (June 2026 revision):** the lab's cost audit proposes ONE shared Basic ACR with per-app *repositories* (`<app>/<image>:<tag>`) instead of a registry per app — two Basic registries (`illinihuntdevacr`, `giescanvasmcpacr`) already cost ~$10/mo for prototype workloads that one would hold. Dejan (Tech Services) originally advised per-app registries, so **confirm the shared-registry change with Dejan before creating it or merging the existing two**; until then, prefer reusing an existing registry over creating a third.

Decide guardrails with `illinois-azure-governance` and, for plain web apps, prefer `illinois-azure-cli-deploy` instead. For meeting-specific facts, read `references/meeting-context.md`.

## Golden Rules

- **Don't create new registries without checking.** Existing: `illinihuntdevacr`, `giescanvasmcpacr` (both Basic). Shared-registry consolidation is proposed (see above) — reuse before creating; isolate apps by repository name, not registry.
- **Registry name must be alphanumeric only.** ACR names are 5–50 chars, globally unique, **no hyphens or underscores** (e.g. `dlregistry01`, not `dl-registry-01`). Apply the `dl-`/app-name convention with resource *tags*, not the registry name.
- **Resource group is `DL_ResourceGroup_01`, region `northcentralus`** — keep consistent with the rest of the lab.
- **Secrets are container secrets, never baked into the image.** No API keys in the Dockerfile or image layers.
- **MCP needs an HTTP transport.** A remote MCP server on Azure must speak HTTP/SSE (streamable HTTP), not stdio — stdio cannot be reached through Azure ingress. Expose the HTTP port and set ingress accordingly.

## 0. Preflight

```bash
az login
az account set --subscription "Urban Business Disruption Lab"
az group list -o table

RG="<confirmed-resource-group>"
REGION="northcentralus"
APP="mcp"                       # logical app name
ACR="dlacr${APP}"               # alphanumeric only, globally unique
IMAGE="${ACR}.azurecr.io/${APP}:latest"
```

## 1. Registry (reuse first; create only if none fits)

```bash
az acr list -o table   # reuse an existing registry with a per-app repository if possible
az acr create -g "$RG" -n "$ACR" --sku Basic \
  --tags creator=<netid> app=dl-${APP} purpose=mcp

# Optional: enable admin user for quick auth (or use managed identity / service principal):
az acr update -n "$ACR" --admin-enabled true
```

## 2. Build and push the image

Prefer ACR cloud build so you do not need a local Docker daemon:

```bash
# Cloud build straight from the repo/Dockerfile context:
az acr build -r "$ACR" -t "${APP}:latest" .
```

Or build locally and push:

```bash
az acr login -n "$ACR"
docker build -t "$IMAGE" .
docker push "$IMAGE"
```

## 3a. Deploy to Azure Container Apps (recommended for MCP servers)

Container Apps gives external ingress, scale-to-zero, and easy secrets — a good fit for HTTP/SSE MCP servers.

```bash
# One-time per resource group: create a Container Apps environment.
az containerapp env create -g "$RG" -n "dl-cae-${APP}" -l "$REGION"

# Registry credentials (admin user shown; managed identity is preferred for production):
ACR_USER=$(az acr credential show -n "$ACR" --query username -o tsv)
ACR_PASS=$(az acr credential show -n "$ACR" --query "passwords[0].value" -o tsv)

az containerapp create \
  -g "$RG" -n "dl-ca-${APP}" \
  --environment "dl-cae-${APP}" \
  --image "$IMAGE" \
  --registry-server "${ACR}.azurecr.io" \
  --registry-username "$ACR_USER" \
  --registry-password "$ACR_PASS" \
  --target-port 8080 \
  --ingress external \
  --secrets openai-key="<value>" \
  --env-vars MCP_TRANSPORT=http OPENAI_API_KEY=secretref:openai-key \
  --min-replicas 0 --max-replicas 2
```

`--target-port` must match the port the MCP server listens on. `--ingress external` exposes it publicly; use `internal` if it should only be reachable inside the environment.

## 3b. Deploy to Web App for Containers (for traditional containerized web apps)

For a standard web app delivered as a container (e.g. Project Claw), reuse the existing App Service Plan:

```bash
az webapp create -g "$RG" -p "<existing-app-service-plan>" -n "dl-${APP}" \
  --deployment-container-image-name "$IMAGE"

# Wire registry credentials:
az webapp config container set -g "$RG" -n "dl-${APP}" \
  --container-image-name "$IMAGE" \
  --container-registry-url "https://${ACR}.azurecr.io" \
  --container-registry-user "$ACR_USER" \
  --container-registry-password "$ACR_PASS"

# Tell App Service which port the container listens on:
az webapp config appsettings set -g "$RG" -n "dl-${APP}" --settings WEBSITES_PORT=8080
```

## 4. Verify and stream logs

```bash
# Container Apps:
az containerapp show -g "$RG" -n "dl-ca-${APP}" --query properties.configuration.ingress.fqdn -o tsv
az containerapp logs show -g "$RG" -n "dl-ca-${APP}" --follow

# Web App for Containers:
az webapp log tail -g "$RG" -n "dl-${APP}"
```

For an MCP server, confirm the HTTP/SSE endpoint responds (e.g. the `/sse` or `/mcp` route your transport exposes) before wiring any client.

## Common Pitfalls

- ACR name with hyphens/underscores → registry creation fails. Use alphanumeric only.
- Creating a registry per app by default → duplicate ~$5/mo Basic fees; the June 2026 convention is per-app repositories in a shared registry (pending Dejan's confirmation).
- Deploying an MCP server with stdio transport → unreachable over ingress. Use HTTP/SSE and expose the port.
- Wrong `--target-port` / missing `WEBSITES_PORT` → container starts but health checks fail.
- API keys in the image → use Container Apps `--secrets` or App Service settings instead.

## Output Expectations

When asked to deploy a container or MCP server, produce:

- The per-app registry name (alphanumeric) and the `az acr create`/`az acr build` commands.
- The chosen runtime target (Container Apps vs Web App for Containers) with rationale.
- The exact deploy command with image, port, ingress, and secrets (names, not values).
- The transport note for MCP (HTTP/SSE, not stdio).
- Verification steps (FQDN, logs, endpoint check).
