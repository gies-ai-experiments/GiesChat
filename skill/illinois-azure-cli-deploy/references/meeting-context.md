# Meeting Context: Azure CLI Deployment

Primary source: Granola meeting `619b15fc-2f8d-4cbd-a350-d67be8adac7b`, "Model routing strategy and Azure deployment with Dejan", June 9, 2026.
Supporting source: Granola meeting `9808d07b-ef54-4cf2-a748-5a3eb271b785`, "Azure infrastructure setup — app services, databases, and OpenAI integration with Keshav", June 3, 2026.

## Why This Skill Exists

- June 9 action item (Ashleyn): "Create additional Azure CLI skills after the meeting."
- Dejan's framing: the Azure CLI is good and well-documented, but it needs *direction* — that direction is what the AI skills provide. This skill is that direction layer for hands-on `az` deployment.

## Concrete Facts Used

- CI/CD pipelines are working on both `main` and a test branch for MindForum; tested with and without changes and reflecting correctly.
- MindForum (the migrated app) is TypeScript.
- Models are trained to git-ignore `.env` files by default when an API key would be pushed — but still verify; secrets belong in App Service settings, not the repo.
- June 3 lesson: the Line Hunt app created separate container services instead of using the existing App Service Plan, which put it on different servers and added cost. The fix is to deploy into the existing plan in `northcentralus`.
- Resource naming convention from June 3: prefix `dl-`, add service type, append app name (e.g. `dl-openai-mindform`). Avoid spaces.

## Open Questions / Discrepancies

- Resource group name is inconsistent across notes: May 19 notes say `dl_resource_group_r1`; June 3 notes say `dl-resource-group-01`. Confirm the canonical name with `az group list` before scripting.
- Reservation pricing for the App Service Plan (Premium P1v4) was deferred pending CFOP confirmation (see governance skill).
