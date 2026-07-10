# Meeting Context: Azure Governance

Source: Granola meeting `276ee247-a369-44b5-974c-0e300c42ef22`, titled "Azure infrastructure setup - web server, app service, and deployment slots with Dan", May 19, 2026.

## Participants And Roles

- Vishal: note creator and Disruption Lab project lead in the meeting.
- Dan: IT Partners Azure/infrastructure contact.
- Adam: expected subscription owner and CFOP decision maker.
- Ash and Keshav: developer contributors for app migration work.

## Subscription And Billing

- Existing subscription: `Urban Business Disruption Lab`.
- The team decided to use the existing subscription instead of waiting for a new one, pending Adam's confirmation.
- Current CFOP may be from an older disruption/innovation group.
- Adam needs to confirm CFOP and subscription ownership with Matthias or the business office.
- Unknown existing resources and contributors may be left over from old projects.

## Resource Setup

- Shared resource group created: `dl_resource_group_r1`.
- App Service Plan/web server created with Premium P1v4 in North Central US.
- Reservation discussed: regular cost about $162/month vs about $96/month with one-year reservation.
- Reservation purchase was deferred until CFOP confirmation.
- Log Analytics workspace should have a 1 GB daily cap.

## Access Setup

- Adam was added as owner.
- Ash and Keshav were added as contributors.
- Vishal was also given access.
- Dan warned that unknown contributors should be reviewed and cleaned up once Adam confirms access requirements.

## Identity And Domains

- Microsoft Entra ID was recommended for campus SSO.
- App registrations may be self-service, but permanent owners must be added.
- Students should not be the only owners of app registrations.
- Domains under discussion: `disruption-lab.illinois.edu` and `d-lab.illinois.edu`.
- Dan can create DNS records once the custom domain is confirmed.

## Support Path

- Emailing the infrastructure address creates a ticket.
- Azure issues are likely to route to Dan, but tickets help if he is unavailable.

## Update: June 2026 Governance Notes

Sources: Granola meetings `9808d07b-ef54-4cf2-a748-5a3eb271b785` ("Azure infrastructure setup with Keshav", June 3, 2026) and `619b15fc-2f8d-4cbd-a350-d67be8adac7b` ("Model routing strategy and Azure deployment with Dejan", June 9, 2026).

- **Naming convention** for troubleshooting and cost tracking: prefix `dl-`, add service type, append app name (e.g. `dl-openai-mindform` vs a generic `mindform`). Improves log/error tracing and CLI identification.
- **Budget alerts** should be set at the subscription level (monthly reset, staggered thresholds) and can drill down to app-specific budgets.
- **One Azure Container Registry per application** (Dejan's guidance) — do not share a registry across apps. Note ACR names must be alphanumeric only, so apply the `dl-` convention via resource tags for registries.
- The **Azure Skills repo is kept private** for now (decision confirmed June 9); it will be shared with relevant team members rather than made public.
- Security default: AI coding models git-ignore `.env` files by default when an API key would be committed — but still verify; secrets belong in App Service settings / Key Vault, not the repo.
- **Resource group naming discrepancy:** June notes say `dl-resource-group-01` and region `north-central-us`; May 19 notes say `dl_resource_group_r1`. Confirm the canonical name with `az group list`. This is exactly the kind of naming inconsistency the governance checklist warns against.
- Reservation pricing investigation for Azure Foundry / App Service was flagged for potential savings, still pending CFOP confirmation. Adam to schedule a subscription cleanup meeting.
