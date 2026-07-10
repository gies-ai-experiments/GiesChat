# Illinois Azure Security — Checks, Patterns, and Remediation

The detail behind the three-phase gate in `SKILL.md`. Contents:

1. Secret pattern catalog
2. Student/admin PII pattern catalog
3. Phase 1 scan commands (artifact: diff, tracked files, history, build context)
4. Phase 2 Azure config checks
5. Finding → fix table
6. Rotate-then-scrub runbook (already-pushed secret)

Adjust `<app>`, `<acr>`, and the deploy branch to the app in hand. Resource defaults: subscription `urbana-business-disruptionlab`, resource group `DL_ResourceGroup_01`, shared Log Analytics `dl-loganalytics-01`.

---

## 1. Secret pattern catalog

Match these against the shipping ref and the build context. All are case-insensitive where it matters. Anchor generic ones on an assignment so entropy alone doesn't drown the signal in false positives.

| Secret | Regex (egrep) | Notes |
|---|---|---|
| Canvas API token | `[0-9]+~[A-Za-z0-9]{40,}` | Current Canvas format `<accountID>~<random>`; legacy tokens are bare 64-hex — see the generic row. Canvas holds rosters/grades, so a leaked token is a direct student-data breach. |
| Azure OpenAI / Cognitive Services key | `(?i)(azure_openai\|cognitive\|openai)[a-z_]*key["' :=]+[A-Za-z0-9]{32,}` | Azure keys are 32-hex (legacy) or 84-char base62 (current). `illinois-azure-foundry-models` issues these. |
| OpenAI / Anthropic key | `sk-(ant-)?[A-Za-z0-9_-]{20,}` | |
| Azure Storage connection string | `DefaultEndpointsProtocol=.*AccountKey=[A-Za-z0-9+/=]{40,}` | Full account access if leaked. |
| DB URL with credentials | `(?i)(postgres(ql)?\|mysql\|mongodb(\+srv)?)://[^:@/\s]+:[^@/\s]+@` | The lab's shared `dl-postgresqlserver-01` holds app data. |
| Private key | `-----BEGIN ([A-Z]+ )?PRIVATE KEY-----` | RSA/EC/OPENSSH/PGP. |
| JWT | `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}` | May embed user identity in the payload. |
| Generic secret assignment | `(?i)(api[_-]?key\|secret\|token\|passwd\|password\|client[_-]?secret)\s*[:=]\s*['"][^'"]{8,}['"]` | Catch-all. |

**Ignore these — they are not leaks:** `process.env.*`, `os.environ[...]`, `${...}`, `secretref:...`, `@Microsoft.KeyVault(...)`, and obvious placeholders (`changeme`, `xxxxx`, `<your-key>`, `***`, values in `.env.example` / `.env.test.example`). Flagging these trains the user to ignore the gate.

## 2. Student/admin PII pattern catalog

| PII | Regex / signal | Notes |
|---|---|---|
| Real Illinois email | `[A-Za-z0-9._%+-]+@([a-z0-9-]+\.)*illinois\.edu` minus `example\|test\|noreply\|sample\|dummy` | A handful in a fixture = a real roster leak. |
| UIN | `\b[0-9]{9}\b` near `uin\|university id\|student id` | 9-digit university ID. Bare 9-digit runs are noisy — weight by nearby keyword or fixture context. |
| NetID | `(?i)netid\s*[:=]` assignments; `[a-z]{2,8}[0-9]?@illinois\.edu` local-part | NetID is just a username, so anchor on the keyword or the email form. |
| Roster / grade fixtures | files matching `(?i)(roster\|grades?\|enrollment\|students?\|section)` under `test\|tests\|fixtures\|__fixtures__\|mocks` | Canvas data dumped into tests is the most common real-data leak. |
| PII in logs | a `console.(log\|info\|warn\|error)` / `logger?.(info\|debug\|warn\|error)` / `print` / `System.out` line that also names `email\|token\|password\|ssn\|uin\|netid\|grade\|student\|user\b` | Logs stream to `dl-loganalytics-01`; logged PII is both a privacy and a retention problem. |

## 3. Phase 1 scan commands

Set the pattern alternation once, then reuse. Redact matches when reporting — show `file:line` and the pattern name, not the raw value.

```bash
# Secret alternation (tune as needed)
SEC='[0-9]+~[A-Za-z0-9]{40,}|-----BEGIN ([A-Z]+ )?PRIVATE KEY-----|DefaultEndpointsProtocol=.*AccountKey=[A-Za-z0-9+/=]{40,}|(postgres(ql)?|mysql|mongodb(\+srv)?)://[^:@/[:space:]]+:[^@/[:space:]]+@|sk-(ant-)?[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'

# a) The change under review (fastest signal) — diff vs the deploy base
git diff origin/main...HEAD | grep -nE "$SEC"

# b) All tracked content that ships on the branch (App Service branch deploy)
git grep -nIE "$SEC" -- ':!*.lock' ':!package-lock.json' ':!*.min.*' ':!**/*.example'

# c) History — a secret committed earlier still deploys and is still public
git log -p --all -G'-----BEGIN ([A-Z]+ )?PRIVATE KEY-----|AccountKey=|[0-9]+~[A-Za-z0-9]{40,}' | grep -nE "$SEC"

# d) Secret FILES riding along
git ls-files | grep -EI '(^|/)\.env($|\.)|\.pem$|(^|/)id_rsa$|my\.secrets'

# e) Container build context: does .dockerignore actually exclude them, and does the Dockerfile copy everything?
grep -E '\.env|\*?\.pem|secrets' .dockerignore || echo 'WARN: .dockerignore missing secret exclusions'
grep -nE '^(COPY|ADD)[[:space:]]+\.(/)?[[:space:]]' Dockerfile   # COPY . .  bakes the whole context (incl. .env) unless dockerignored
```

PII sweep:

```bash
# Real Illinois emails (excluding sample/test)
git grep -nIE '[A-Za-z0-9._%+-]+@([a-z0-9-]+\.)*illinois\.edu' | grep -viE 'example|test|noreply|sample|dummy'
# Roster/grade fixtures
git ls-files | grep -iE '(roster|grades?|enrollment|students?|section).*(json|csv|sql)' | grep -iE 'test|fixture|mock'
# PII in log statements
git grep -nIE '(console\.(log|info|warn|error)|logger?\.(info|debug|warn|error)|print|System\.out).*(email|token|password|ssn|uin|netid|grade|student)'
```

## 4. Phase 2 Azure config checks

```bash
SUB=urbana-business-disruptionlab; RG=DL_ResourceGroup_01
az account set --subscription "$SUB"

# App Service: any secret-looking VALUE that is not a Key Vault reference is a plaintext secret on Azure
az webapp config appsettings list -g "$RG" -n <app> -o json \
  | grep -iE '"(name|value)"' | grep -ivE '@Microsoft\.KeyVault|process\.env'

# Container Apps: secrets should be declared, env should reference them via secretref:
az containerapp show -g "$RG" -n <app> --query "properties.configuration.secrets[].name" -o tsv
az containerapp show -g "$RG" -n <app> --query "properties.template.containers[].env" -o json   # look for raw values vs secretref:

# Ingress: internal for private services
az containerapp show -g "$RG" -n <app> --query "properties.configuration.ingress.external" -o tsv   # true == public

# ACR: admin user should be OFF (prefer managed identity)
az acr show -n <acr> --query adminUserEnabled -o tsv   # true == broad shared credential

# Log Analytics: shared workspace + 1 GB/day cap intact; confirm app logging isn't dumping request bodies/PII
az monitor log-analytics workspace show -g "$RG" -n dl-loganalytics-01 --query "workspaceCapping" -o json
```

## 5. Finding → fix table

| Finding | Fix |
|---|---|
| Secret in tracked code / build context | Remove it; load from a Container Apps secret (`--secrets name=…` + `secretref:`) or a Key Vault reference. **If it was ever pushed, run §6 first.** |
| `.env` / `*.pem` / `my.secrets` in git or context | `git rm --cached`, add to `.gitignore` **and** `.dockerignore`. Rotate anything they contained. |
| `COPY . .` with no `.dockerignore` exclusion | Add `.dockerignore` (`.env*`, `*.pem`, `.git`, `my.secrets`) so secrets and history aren't baked into the image. |
| Real student/admin PII in a fixture | Replace with synthetic data (`student1@example.com`, fake UINs). Never commit a real Canvas export. |
| PII in a log statement | Drop the field or redact it before logging; logs persist in `dl-loganalytics-01`. |
| Plaintext secret app setting | Convert to a Key Vault reference (`@Microsoft.KeyVault(SecretUri=…)`) or a container secret. |
| Public ingress on a private service | `az containerapp ingress update … --type internal`. |
| ACR `adminUserEnabled=true` | `az acr update -n <acr> --admin-enabled false`; use managed identity for the app's pull. |
| Uncapped / PII-heavy logging | Reinstate the 1 GB/day cap and stop logging request bodies (recall the $1,100 runaway-log bill). |

## 6. Rotate-then-scrub runbook (already-pushed secret)

Deleting the line does not un-leak a pushed secret — anyone with the history has it. **Rotate first; scrubbing is cleanup, not the fix.**

1. **Rotate the credential now.**
   - Azure OpenAI / Foundry key: two keys exist for zero-downtime rotation — point the app at `key2`, regenerate `key1`, then update the app's secret (`illinois-azure-foundry-models` Step 6): `az cognitiveservices account keys regenerate -g "$RG" -n <acct> --key-name key1`.
   - Canvas token: revoke it in Canvas → Account → Settings → Approved Integrations, issue a new one, store it as a per-user secret (never in code).
   - Storage key: `az storage account keys renew -g "$RG" --account-name <acct> --key key1`.
   - DB credential: change the app role's password on `dl-postgresqlserver-01` and update the secret.
2. **Move the new value into a secret store** — Container Apps secret or Key Vault — never back into the repo.
3. **Scrub history** — `git filter-repo --replace-text <patterns>` or BFG, then coordinate a force-push. This rewrites history: warn collaborators, they re-clone.
4. **Assume the old value is burned** regardless of scrubbing. Rotation is what actually protects the student/admin data behind it.
