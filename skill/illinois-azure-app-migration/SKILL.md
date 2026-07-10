---
name: illinois-azure-app-migration
description: Plan and execute University of Illinois Azure app migrations for Disruption Lab-style apps. Use when asked to move an existing app, bot, Postgres-backed service, GitHub repo, Docker/container workload, or campus-authenticated web app to Illinois Azure App Service, especially when deciding App Service slots, Azure branches, database staging, production cutover, DNS, or Entra ID authentication.
---

# Illinois Azure App Migration

Use this skill to convert an existing app into the Azure deployment pattern discussed with IT Partners on May 19, 2026. Optimize for safe migration first: keep the current production system untouched until Azure staging, database connectivity, authentication, and DNS cutover have been tested.

For meeting-specific facts, read `references/meeting-context.md`. This skill plans the migration; for the concrete `az` commands that execute it, use `illinois-azure-cli-deploy`, and for containerized/MCP workloads use `illinois-azure-container-deploy`.

## Workflow

1. Identify the source app, current host, repo, runtime, database, environment variables, auth mechanism, domains, and production data migration needs.
2. Confirm Azure prerequisites before changing code:
   - Subscription: `urbana-business-disruptionlab` ("Urban Business Disruption Lab"), unless Adam or IT Partners directs otherwise.
   - Resource group: `DL_ResourceGroup_01` (verified canonical; `dl_resource_group_r1` in older notes is stale).
   - Region: `northcentralus`.
   - Web hosting: the shared App Service plan `dl-appplan-01` (P1mv4; right-sizing to P0v4 under discussion — see the governance skill's cost controls).
   - Database: a database + app role on the shared `dl-postgresqlserver-01` (PG 18) — never a new server (see `illinois-azure-cli-deploy` §6).
3. Create an Azure-specific branch in the existing repo unless the user explicitly wants a full repo clone. Prefer a branch because it keeps future merges easier while the old production host remains live.
4. Connect Azure deployment only to the Azure testing branch or staging branch. Do not connect Azure to the current production branch until cutover is intentional.
5. Deploy new code to a staging slot first, test it, then swap staging with production only after verification.
6. Treat database migration as a separate activity from code deployment. First prove the app works against a blank or test database, then export/import production data when ready.
7. Cut over DNS/domains only after Azure production is verified and rollback is understood.

## Architecture Decision

Choose the simplest database and slot topology that matches the app's risk.

### Small app default

Use one production app plus one staging slot, both pointing to one production database:

- Use when the app has low traffic, few users, and simple schema changes.
- Deploy to staging, test, then swap.
- Handle schema migrations carefully because staging and production share data.
- This was considered acceptable for MindForum because usage was small.

### Split database

Use production and staging slots with separate production and staging databases:

- Use when tests need isolation from production data.
- Remember that testing against a staging database can miss production data edge cases.
- Be explicit about how migrations move from staging DB to production DB.

### IT Partners four-step model

Use separate app surfaces for dev/test and staging/prod:

- Development slot and test app point to a development database.
- Staging slot and production app point to the production database.
- Flow: dev branch to dev slot, swap to test, then deploy same code to staging, then swap to production.
- Use when the app has higher risk, multiple developers, meaningful production users, or schema changes that need stronger release discipline.

## GitHub Deployment Pattern

Prefer branch names that make deployment intent obvious:

- `az-develop` or `azure-develop` for development/testing.
- `az-main` or `azure-main` for the branch connected to staging/production.

When configuring Azure App Service deployment:

1. Select GitHub as the source.
2. Select the organization, repository, and Azure-specific branch.
3. Connect the staging slot first.
4. Verify build/runtime settings and environment variables.
5. Keep the legacy host connected to the old production branch until cutover.

## Cutover Checklist

Before swapping or switching DNS, verify:

- App boots successfully in Azure staging.
- Logs are enabled and visible in Log Analytics.
- Required environment variables and connection strings exist in App Service settings.
- Database migrations have been tested on the chosen database topology.
- Production data export/import plan is written and rehearsed when feasible.
- Authentication works with the intended provider, preferably Microsoft Entra ID for campus SSO when appropriate.
- Supervisors or permanent staff are owners of Entra app registrations and Azure resources.
- Domain: per-app record under `disruptionlab.illinois.edu` requested from Tech Services (Dejan / consult@illinois.edu) — employee-built apps only, no wildcards, students stay on azurewebsites.net (full policy in the governance skill's Domains And DNS).
- Rollback path is clear: keep old production host and branch intact until Azure production is proven.

## Output Expectations

When asked to plan a migration, produce:

- Recommended topology with rationale.
- Concrete repo/branch plan.
- Azure resources to create or reuse.
- Database migration sequence.
- Auth and DNS tasks.
- Verification checklist.
- Open questions for Adam, Dan/IT Partners, or the app owner.
