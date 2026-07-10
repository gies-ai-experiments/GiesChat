---
name: illinois-azure-cli-deploy
description: Run the concrete Azure CLI (`az`) commands to deploy or migrate a University of Illinois Disruption Lab app to Azure App Service. Use when you need the actual commands to log in, target the shared subscription and resource group, reuse the existing App Service Plan, create or update a web app, wire GitHub branch deployment, set app settings and connection strings, use staging slots and swap, stream logs, and verify a deployment — as opposed to only planning the migration. Pairs with illinois-azure-app-migration (topology decisions) and illinois-azure-governance (guardrails).
---

# Illinois Azure CLI Deploy

Use this skill to actually execute an Azure deployment with the `az` CLI. The Azure CLI is well configured and documented; what it needs is direction, which is what this skill provides. Decide the migration topology with `illinois-azure-app-migration` and confirm the guardrails with `illinois-azure-governance` first, then run these commands.

For meeting-specific facts, read `references/meeting-context.md`.

## Golden Rules

- **Reuse the existing App Service Plan** (`dl-appplan-01`, P1mv4 — all five lab apps + slots run on it). Do not let a deploy create a brand-new plan or stand up separate container services — that put the Line Hunt app on different servers and added cost.
- **Reuse the shared Postgres server** (`dl-postgresqlserver-01`, PG 18). New apps get a database + app-scoped login role on it — NEVER a new flexible server. UniQuick provisioned its own server by mistake; the Azure admin flagged the duplicate cost and it was migrated + deleted (2026-06-12). Provisioning scripts should verify the db exists, not create servers (pattern: uniquick `infra/provision.sh`).
- **Reuse the shared Log Analytics workspace** (`dl-loganalytics-01`, 1 GB/day cap). Point new App Insights components at it — never create a per-app workspace (`uniquick-logs` is the duplicate counter-example, pending merge).
- **Resource group is `DL_ResourceGroup_01`** — verified canonical (older notes with `dl_resource_group_r1` / `dl-resource-group-01` are stale).
- **Keep region consistent** with the existing deployment (North Central US, `northcentralus`) unless there is a latency/compliance reason.
- **Never commit secrets.** API keys and connection strings live in App Service settings, never in the repo. Confirm `.env` is git-ignored before pushing.
- **Touch production last.** Deploy to a development/test branch and a staging slot, verify, then swap.

## 0. Preflight

```bash
# Install check
az version

# Sign in (device code is handy on remote/SSH sessions)
az login            # or: az login --use-device-code

# List subscriptions and select the Disruption Lab one
az account list -o table
az account set --subscription "Urban Business Disruption Lab"

# Verified canonical names (re-confirm with az group list / az appservice plan list if in doubt)
RG="DL_ResourceGroup_01"
PLAN="dl-appplan-01"           # shared P1mv4 — all lab apps live here
REGION="northcentralus"
APP="<dl-app-name>"            # follow naming: dl-<app>, no spaces
```

## 1. Create or reuse the web app (in the existing plan)

```bash
# Reuse the shared plan; do NOT pass --sku/--plan-new flags that create a plan.
# Pick a runtime that matches the app (list options first):
az webapp list-runtimes --os linux -o table

# TypeScript/Node apps:
az webapp create -g "$RG" -p "$PLAN" -n "$APP" --runtime "NODE:20-lts"
# Python backends (e.g. Line Hunt):
# az webapp create -g "$RG" -p "$PLAN" -n "$APP" --runtime "PYTHON:3.12"
```

## 2. Wire GitHub deployment to the Azure branch

Connect deployment to the Azure development/test branch first, never directly to production. Use obvious branch names: `az-develop` / `azure-develop` for testing, `az-main` / `azure-main` for staging/production.

```bash
# GitHub Actions-based deployment (recommended):
az webapp deployment github-actions add \
  -g "$RG" -n "$APP" \
  --repo "gies-ai-experiments/<repo>" \
  --branch az-develop \
  --login-with-github
```

If using the classic source-control integration instead:

```bash
az webapp deployment source config \
  -g "$RG" -n "$APP" \
  --repo-url "https://github.com/gies-ai-experiments/<repo>" \
  --branch az-develop --git-token "$GITHUB_TOKEN"
```

## 3. App settings and connection strings (secrets stay here)

```bash
# Set environment variables / API keys directly in App Service:
az webapp config appsettings set -g "$RG" -n "$APP" --settings \
  NODE_ENV=production \
  OPENAI_API_KEY="<from-keyvault-or-portal>" \
  DATABASE_URL="<connection-string>"

# Verify (values are redacted in some views):
az webapp config appsettings list -g "$RG" -n "$APP" -o table
```

Prefer Azure Key Vault references or the Service Connector for the database once it exists; never paste long-lived keys into the repo or commit messages.

## 4. Staging slot, deploy, verify, swap

```bash
# Create a staging slot (slots require Standard/Premium plans — the lab uses Premium P1v4):
az webapp deployment slot create -g "$RG" -n "$APP" --slot staging

# Point the staging slot at the same GitHub branch or push the build to it, then verify:
az webapp show -g "$RG" -n "$APP" --slot staging --query state -o tsv
curl -fsS "https://$APP-staging.azurewebsites.net/health" || echo "health check failed"

# Swap only after verification (zero-downtime cutover):
az webapp deployment slot swap -g "$RG" -n "$APP" --slot staging --target-slot production
```

## 5. Logs and diagnostics

```bash
# Live log stream:
az webapp log tail -g "$RG" -n "$APP"

# Enable filesystem logging if needed:
az webapp log config -g "$RG" -n "$APP" --application-logging filesystem --level information
```

Keep the Log Analytics workspace 1 GB/day cap from the governance skill — uncapped logs once produced an unexpected $1,100 bill.

## 6. Database setup (shared server — never provision one)

The lab's single Postgres server is `dl-postgresqlserver-01` (PG 18, Burstable B2s, `DL_ResourceGroup_01`). It already hosts illinihunt, mindforum, and uniquick databases, has the Allow-Azure-Services firewall rule (App Service connectivity) plus UIUC network/VPN ranges (laptop access requires the UIUC VPN). New apps get a database + dedicated login role:

```bash
# One-time per app, run by the server's Entra admin (vishal@illinois.edu), on the UIUC VPN:
TOKEN=$(az account get-access-token --resource-type oss-rdbms --query accessToken -o tsv)
PGPASSWORD="$TOKEN" psql "host=dl-postgresqlserver-01.postgres.database.azure.com \
    dbname=postgres user=vishal@illinois.edu sslmode=require" <<'SQL'
  CREATE ROLE <app> LOGIN PASSWORD '<generated>';
  CREATE DATABASE <app> OWNER <app>;
SQL
# PG15+ quirk: then connect to the new db as admin and run
#   ALTER SCHEMA public OWNER TO <app>;
# or the app's restore/migrations will fail with "permission denied for schema public".
```

App connection string: `postgres://<app>:<pw>@dl-postgresqlserver-01.postgres.database.azure.com:5432/<app>?sslmode=require` — set via app settings, never in the repo.

Treat data migration as its own step: prove the app boots against a blank database first, then export/import production data (`pg_dump -Fc` + `pg_restore --no-owner --no-privileges`).

## Common Pitfalls

- Creating a new App Service Plan or separate container service → extra servers and cost. Reuse the plan.
- Creating a per-app Postgres server or Log Analytics workspace → duplicate fixed cost; both happened (uniquick-pg, uniquick-logs) and had to be consolidated. Use `dl-postgresqlserver-01` and `dl-loganalytics-01`.
- Wrong region (resources scattered across regions) → keep everything in `northcentralus`.
- Connecting Azure deployment straight to the production branch → use the Azure dev/test branch and a staging slot.
- Hardcoding keys → use `az webapp config appsettings set` and Key Vault; confirm `.env` is git-ignored.
- Slot commands failing → slots need a Standard/Premium plan (the lab uses Premium P1v4).

## Output Expectations

When asked to deploy, produce:

- The exact `az` command sequence with the confirmed subscription, resource group, plan, region, and app name filled in.
- The GitHub repo/branch wired to the staging slot.
- The app settings/connection strings to configure (names, not secret values).
- The verification and swap steps.
- Any guardrail confirmations still owed to Adam or IT Partners (CFOP, ownership, domain).
