---
name: illinois-azure-governance
description: Apply University of Illinois Azure governance guardrails for Disruption Lab cloud work. Use when asked to review or set up Azure subscriptions, resource groups, access control, cost controls, tags, reservations, Log Analytics, Entra app registrations, campus SSO ownership, custom domains, or IT Partners handoff for Illinois Azure deployments.
---

# Illinois Azure Governance

Use this skill before provisioning or changing Illinois Azure infrastructure. It captures the operational guardrails from the May 19, 2026 IT Partners meeting, updated with the June 2026 live-inventory audit (`~/admin/agent-infra/azure-infra-analysis-2026-06.md`): keep ownership clear, cap surprise costs, use the right subscription, share infrastructure by default, and make resources maintainable after students leave.

For meeting-specific facts, read `references/meeting-context.md`. Apply these guardrails before running the deployment skills `illinois-azure-cli-deploy` or `illinois-azure-container-deploy`.

**Contacts:** Adam King = budget manager / subscription Owner (cost approvals, role grants — not a technical resource). Dejan (Tech Services) = technical contact for DNS, certs, and infra validation. consult@illinois.edu = the Tech Services ticket queue.

## Shared-Layer Conventions (the most important table in this skill)

Every app duplication so far (uniquick-pg Postgres server, uniquick-logs workspace) happened because provisioning scripts created their own copy of a shared layer. The rule: **apps get a slice of shared infrastructure, never their own copy** — except where the per-app boundary is the control.

| Layer | Shared resource (verified 2026-06) | Each app gets |
|---|---|---|
| Compute | `dl-appplan-01` (P1mv4) | a web app (+ staging slot) on the shared plan |
| Postgres | `dl-postgresqlserver-01` (PG 18, B2s) | a database + app-scoped login role — NEVER a new server |
| Logs | `dl-loganalytics-01` (1 GB/day cap) | an App Insights component pointed at the shared workspace |
| Containers | one shared ACR (proposed — confirm with Dejan, who originally advised per-app registries) | a repository (`<app>/<image>`), not a registry |
| Blob storage | per-app account is CORRECT (pennies; account-level managed-identity RBAC is the isolation boundary) | its own storage account |
| AI | per-app OpenAI/AIServices account is CORRECT ($0 idle on GlobalStandard; preserves per-app cost attribution + quota) | its own account, with TPM quota + in-app token budgets |
| DNS | `disruptionlab.illinois.edu` zone (Tech Services IPAM) | one per-app CNAME + asuid TXT (see Domains And DNS) |

Provisioning scripts must VERIFY shared layers exist, not create them (pattern: uniquick `infra/provision.sh`, fixed 2026-06-12).

## Governance Checklist

Before creating resources, confirm:

- Subscription: `urbana-business-disruptionlab` (display name "Urban Business Disruption Lab" — `az account set` accepts either) unless Adam/IT Partners explicitly chooses a new subscription.
- CFOP: Adam must confirm the correct cost center with Matthias or the business office before purchasing one-year reservations.
- Resource group: `DL_ResourceGroup_01` — VERIFIED canonical name (earlier notes saying `dl_resource_group_r1` / `dl-resource-group-01` are stale).
- Region: keep region consistent with the existing deployment unless the app has a specific latency/compliance reason.
- Creator tag: tag Azure resources with the creator's NetID or responsible owner so future cleanup is possible.
- Naming: avoid spaces in Azure resource names because they can break automation, CLI scripts, or deployment tooling.

## Access Control

Use Azure subscription Access Control / IAM to verify who has permissions.

- Adam should be owner so he can see and govern what is being paid for.
- Ash and Keshav were given contributor access for deployment work.
- Contributors can do nearly everything except top-level permission administration.
- Unknown contributors in the subscription should be reviewed and cleaned up after Adam confirms ownership and historical dependencies.
- If access is blocked, escalate to Dan or IT Partners rather than working around permissions.

## Cost Controls

Default to cost visibility and caps before app work expands.

- Use Cost Analysis at the subscription or resource group level to itemize spending by resource. NB: the consumption API hides amounts on this sponsored subscription — ask Adam for actual figures.
- Use the ONE shared Log Analytics workspace `dl-loganalytics-01` — never create a per-app workspace (the `uniquick-logs` duplicate is the cautionary example; merge-and-delete pending).
- Keep the 1 GB daily cap on Log Analytics to avoid runaway log bills.
- Configure budget alerts at the resource group level when possible (e.g. $300/mo with an 80% alert via `az consumption budget`).
- The App Service plan is 60–70% of fixed spend; prototypes don't need P1mv4 — right-sizing to P0v4 is the single biggest lever (~50% of total). Raise with Adam/Dejan before assuming the SKU is fixed.
- Buy one-year reservations for stable web/database resources only after CFOP is confirmed.
- Remember the meeting example: runaway SQL audit logs created an unexpected $1,100 bill, so logging must be capped and monitored.

## Identity And Auth

Prefer Microsoft Entra ID for campus SSO when the app should authenticate University of Illinois users.

- Use one app registration per app.
- Students may be able to self-register apps, but the first setup should be reviewed with IT Partners if the team is unfamiliar with the flow.
- Always add supervisors or permanent staff as owners of Entra app registrations.
- Do not leave app registrations owned only by a student or temporary worker; recovery becomes difficult when they leave.
- Expect secrets/certificates to need periodic rotation; confirm the actual expiration when creating them.

## Domains And DNS

Tech Services policy, stated 2026-06-12 (full thread: `~/code/quick/docs/tech-services-dns-request.md`):

- The lab zone is `disruptionlab.illinois.edu` (exists in Tech Services IPAM). Request per-app records — one CNAME (`<app>.disruptionlab.illinois.edu` → `<app>.azurewebsites.net`) plus an `asuid.<app>` TXT (App Service domain verification) — via consult@illinois.edu / Dejan.
- **Per-app records are granted only for apps built by Gies employees.** ITP manages the zone; IPAM is never delegated to students.
- **No wildcards** — neither campus InCommon/Sectigo certs nor ITP support them; Azure managed certs don't either. Don't ask.
- **Student/experimental apps must not use university DNS** — they stay on `*.azurewebsites.net`, or on a dedicated non-university domain (the github.io pattern; UniQuick's v2 plan for student-site subdomains).
- Subdomain CNAME beats an apex record (no CNAME-at-apex problem, no hardcoded-IP drift); Azure managed certs handle single hostnames fine.
- Do not switch DNS until the Azure production app, database, auth, and rollback path are verified.

## IT Partners Handoff

When preparing a note or ticket for Dan/IT Partners, include:

- Subscription name and resource group.
- App name and intended domain.
- Required access changes.
- Expected App Service Plan and database choice.
- Whether reservations should be purchased and whether CFOP is confirmed.
- GitHub repo and branch that should connect to the staging slot.
- Open questions about Azure OpenAI, Anthropic, Google model availability, or enterprise pricing if AI services are in scope.

## Output Expectations

When asked to review Azure setup, produce:

- Risks and missing confirmations first.
- Cost-control checklist.
- Access/ownership cleanup items.
- Resource naming/tagging guidance.
- Entra app ownership requirements.
- Exact questions to send to Adam or IT Partners.
