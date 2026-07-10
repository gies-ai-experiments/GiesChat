---
name: illinois-azure-security
description: Pre-deploy safety gate for University of Illinois Disruption Lab Azure work — make sure no student/admin data or secret ships to Azure. Use before any `az` App Service deploy or ACR image push, and before the illinois-azure-cli-deploy / illinois-azure-container-deploy skills run, to scan the repo, git history, diff, and container build context for hardcoded secrets (Canvas API tokens, Azure OpenAI/Foundry keys, storage and Postgres connection strings, private keys, JWTs) and real student/admin PII (real @illinois.edu emails, UINs, NetIDs, grades, rosters in code, fixtures, or logs), and to verify Azure handles data safely (secrets in Key Vault / Container Apps secrets not baked into images, ACR admin disabled, private ingress, no PII in Log Analytics, key rotation). Trigger whenever someone is about to deploy, ship, or push a Disruption Lab app to Azure, mentions leaking or committing a key/token/password, or asks whether it is safe to deploy. Pairs with illinois-azure-governance.
---

# Illinois Azure Security

Run this skill as the **last gate before code ships to Illinois Azure** — before `illinois-azure-cli-deploy` pushes a branch to an App Service slot, and before `illinois-azure-container-deploy` builds and pushes an image to ACR. Its one job: make sure no University of Illinois **student or admin data** and no **secret** leaves the lab's control when an app deploys.

Two things leak student/admin data on a deploy, and this gate covers both:

1. **Data baked into what ships** — a Canvas token pasted into a `.ts` file, a real roster in a test fixture, a `.env` copied into a container image. The sibling deploy skills already state the rule ("the key is a secret — never in the image, repo, or a logged command"; "no API keys in the Dockerfile or image layers"); this skill is what *verifies* it before the push.
2. **Data exposed by Azure config** — a secret set as a plaintext app setting instead of a Key Vault reference, a private service left on public ingress, request bodies with student PII streamed to Log Analytics.

The full pattern catalog, scan commands, and the finding→fix table live in `references/checks.md`. Read it when running the gate. Apply this **after** `illinois-azure-governance` (ownership/cost guardrails) and **before** the deploy skills execute.

**Golden rule — a pushed secret is a compromised secret.** If a real key/token/password is already committed and pushed, deleting the line does **not** un-leak it. Rotate the credential first (Azure OpenAI/Foundry accounts carry two keys, `key1`/`key2`, specifically for zero-downtime rotation — see `illinois-azure-foundry-models` Step 6), *then* scrub history. Treat "it's only in an old commit" as still-exposed. Never print a discovered secret's value back to the user or into a log — report the location and mask the value.

## Phase 0 — Establish what actually ships

The scan target depends on how the app deploys, so pin this down first:

- **App Service via GitHub branch** (`illinois-azure-cli-deploy`): what ships is the **committed branch**, not just the working tree. Scan the tracked files on the deploy branch **and its history** — a secret committed three commits ago still deploys and is still public.
- **Container via ACR** (`illinois-azure-container-deploy`): what ships is the **Docker build context** — every file `COPY`/`ADD` pulls into the image, minus `.dockerignore`. Scan the build context and confirm `.dockerignore` actually excludes secret files.

Note the resource names the config checks will need: subscription `urbana-business-disruptionlab`, resource group `DL_ResourceGroup_01`, shared Log Analytics workspace `dl-loganalytics-01`.

## Phase 1 — Scan the artifact for leaked secrets and PII

Scan for **secrets** (Canvas API tokens `NNNN~…`, Azure OpenAI/Foundry keys, `DefaultEndpointsProtocol=…AccountKey=` storage strings, `postgres://user:pass@…`, `-----BEGIN … PRIVATE KEY-----`, JWTs, high-entropy `KEY|SECRET|TOKEN|PASSWORD=` assignments) and for **student/admin PII** (real `@illinois.edu` addresses excluding `example`/`test`/`noreply`, 9-digit UINs, NetIDs, grade/roster fixtures, PII inside `log`/`console`/`print` statements).

Also confirm no secret **file** rides along: `.env*`, `*.pem`, `id_rsa`, `my.secrets` staged in git or present in the build context, and no `COPY . .` / `ADD . .` in the Dockerfile without a `.dockerignore` that excludes them.

`references/checks.md` has the exact patterns and the ready-to-run `git grep` / history / build-context commands. Run them against the ref or context identified in Phase 0.

## Phase 2 — Verify Azure handles the data safely

Assume the code is clean and check the deploy configuration:

- **Secrets stored correctly** — Container Apps `--secrets` + `secretref:`, or App Service app settings as Key Vault references (`@Microsoft.KeyVault(...)`), never plaintext values that belong in a vault. (`az containerapp show … --query properties.configuration.secrets`; `az webapp config appsettings list -g DL_ResourceGroup_01 -n <app>`.)
- **ACR auth scoped** — `az acr show -n <acr> --query adminUserEnabled` should be `false`; prefer managed identity over the broad admin credential.
- **Ingress intentional** — `--ingress internal` for anything not meant to be public; `external` only on purpose.
- **Logs carry no PII** — no request bodies, keys, or student data written to the shared `dl-loganalytics-01` workspace, and its 1 GB/day cap intact. (The lab's $1,100 runaway-log bill is the cautionary tale — uncapped, PII-laden logging is both a privacy leak and a cost leak.)
- **Rotation posture** — if any key was ever exposed, rotate it now rather than assuming deletion was enough.

The exact `az` queries are in `references/checks.md`.

## Phase 3 — Verdict and remediation

Report a single verdict and rank findings by blast radius. Use this structure:

```
## Azure pre-deploy security gate: <PASS | BLOCK>

### Secrets (block deploy)
- <file:line> — <what, value masked> → <fix: move to Container Apps secret / Key Vault ref; ROTATE if already pushed>

### Student/admin PII (block deploy)
- <file:line> — <what> → <fix: remove/anonymize fixture, redact log line>

### Azure config (warn or block)
- <resource> — <misconfig> → <fix: Key Vault ref, disable ACR admin, internal ingress, cap/redact logs>

### Verdict
<PASS: safe to hand off to the deploy skill> or
<BLOCK: fix the above, re-run this gate, then deploy>
```

`BLOCK` on any real secret or real PII in what ships — those are non-negotiable. Azure-config findings are usually `warn` unless they actively expose data (plaintext secret app setting, public ingress on a private service). When you `BLOCK`, offer the concrete remediation from the finding→fix table in `references/checks.md`; for an already-pushed secret, walk the rotate-then-scrub runbook there before anything else.

## Pairs with

- `illinois-azure-governance` — ownership, cost, and identity guardrails (run before this).
- `illinois-azure-foundry-models` — the two-key rotation runbook for a leaked model key.
- `illinois-azure-cli-deploy` / `illinois-azure-container-deploy` — where secrets get wired as app settings / container secrets; run this gate before either deploys.
