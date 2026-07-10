# Meeting Context: Azure Infrastructure Setup

Source: Granola meeting `276ee247-a369-44b5-974c-0e300c42ef22`, titled "Azure infrastructure setup - web server, app service, and deployment slots with Dan", May 19, 2026.

## Concrete Decisions

- Use the existing `Urban Business Disruption Lab` Azure subscription unless Adam or IT Partners changes direction.
- Dan granted owner access to Adam and contributor access to Ash and Keshav.
- Use one shared resource group for Disruption Lab apps: `dl_resource_group_r1`.
- Initial web server/App Service Plan: Premium P1v4 in North Central US.
- Cost estimate mentioned: about $162/month pay-as-you-go, or about $96/month with a one-year reservation, pending CFOP confirmation.
- Create a Log Analytics workspace with a 1 GB daily cap to avoid runaway log bills.
- Initial app container: `mindforum`, with a `staging` deployment slot.
- Recommended source-control approach: create an Azure branch in the existing repo instead of cloning the whole repo, unless the team chooses otherwise.

## Migration Guidance From Dan

- Keep the current live production environment untouched while Azure is tested.
- Deploy Azure changes from a separate branch such as an Azure staging/development branch.
- Move code first and test it against a blank or test database.
- Migrate production data as a separate export/import step after the Azure app path works.
- Store connection strings as App Service environment variables, or use Azure service connector once the database exists.
- Use staging slot deployment and swap to production for zero-downtime cutover.

## Database Topology Options Discussed

- One database: staging and production slots both point to production DB.
- Two databases: staging points to staging/test DB and production points to production DB.
- Full IT Partners approach: dev slot and test app point to development DB; staging slot and production app point to production DB.

## Later Follow-Ups

- Next session should create the database server, configure connection strings, and set up GitHub CI/CD.
- Ash/Keshav should research database architecture and propose single vs dual/four-step topology.
- Adam should confirm CFOP, subscription ownership, and domain choice.
- Dan should purchase reservations after CFOP confirmation and clean unknown contributors once Adam confirms access needs.

## Update: June 2026 Deployments

Sources: Granola meetings `9808d07b-ef54-4cf2-a748-5a3eb271b785` ("Azure infrastructure setup with Keshav", June 3, 2026) and `619b15fc-2f8d-4cbd-a350-d67be8adac7b` ("Model routing strategy and Azure deployment with Dejan", June 9, 2026).

- MindForum (TypeScript) was migrated successfully; CI/CD pipelines work on both `main` and a test branch, verified with and without changes.
- Mindful app was also migrated and is working, ready for API key configuration.
- **Reuse the existing App Service Plan.** The Line Hunt app mistakenly created separate container services on different servers, adding cost. Migrate such apps into the existing plan in `northcentralus` and delete the separate services afterward.
- Resource naming convention adopted: prefix `dl-`, then service type, then app name (e.g. `dl-openai-mindform`). Avoid spaces.
- Database: Postgres 17 vs 18 discussed — version 17 has a longer support lifecycle (~5 years remaining); version 18 is newer but fully supported. Confirm the version before provisioning.
- **Resource group naming discrepancy:** these June notes refer to `dl-resource-group-01` (and region `north-central-us`), while the May 19 notes above say `dl_resource_group_r1`. Confirm the canonical name with `az group list` before scripting — do not assume.
- For the hands-on `az` command sequence, see the `illinois-azure-cli-deploy` skill. For containerized/MCP workloads, see `illinois-azure-container-deploy`.
