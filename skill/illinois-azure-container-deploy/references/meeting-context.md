# Meeting Context: Azure Container / MCP Deployment

Source: Granola meeting `619b15fc-2f8d-4cbd-a350-d67be8adac7b`, "Model routing strategy and Azure deployment with Dejan", June 9, 2026.

## Concrete Decisions

- The team is building an MCP (Model Context Protocol) application to deploy on Azure.
- Dejan's recommendation: **use a different Azure Container Registry for every application.**
- An MCP server is explicitly "not a traditional web application," so expect different deployment handling than an App Service web app (HTTP/SSE transport, container runtime, ingress/port configuration).
- "Project Claw" — an internal open-source messaging layer ("open cloud for messaging" used internally) — will also be deployed, and that one is "traditional stuff" (a standard web app). It can ship as a Web App for Containers in the existing App Service Plan.

## Next Steps From the Meeting

- Deploy the MCP app on Azure using a separate Azure registry.
- Deploy Project Claw as a traditional web app.
- Make the Azure Skills repo accessible to the team (kept private for now; decision to keep it private was confirmed in the meeting).

## Notes

- ACR registry names must be alphanumeric only (no hyphens/underscores), globally unique, 5–50 chars — so the `dl-<service>-<app>` naming convention is applied via resource tags, not the registry name itself.
- Confirm the canonical resource group name (`dl_resource_group_r1` vs `dl-resource-group-01`) and keep the region as `northcentralus`, consistent with the App Service deployments.
