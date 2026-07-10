#!/usr/bin/env bash
set -euo pipefail

CLIENT_ID="${MS365_MCP_CLIENT_ID:-0cb50d47-5b9d-4aff-bfd9-e44be6b6c830}"
REDIRECT_URI="${GIESCHAT_MCP_REDIRECT_URI:-https://gieschat.azurewebsites.net/api/mcp/ms365-outlook/oauth/callback}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-}"
WEBAPP_NAME="${MS365_MCP_WEBAPP_NAME:-ms365-mcp}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is required. Install az, run az login, then retry." >&2
  exit 1
fi

echo "Ensuring Entra app registration contains redirect URI:"
echo "  app:      ${CLIENT_ID}"
echo "  redirect: ${REDIRECT_URI}"

redirects=()
found=false
while IFS= read -r uri; do
  [[ -z "${uri}" ]] && continue
  redirects+=("${uri}")
  if [[ "${uri}" == "${REDIRECT_URI}" ]]; then
    found=true
  fi
done < <(
  az ad app show \
    --id "${CLIENT_ID}" \
    --query "web.redirectUris[]" \
    --output tsv 2>/dev/null || true
)

if [[ "${found}" == "true" ]]; then
  echo "Redirect URI is already registered."
else
  redirects+=("${REDIRECT_URI}")
  az ad app update --id "${CLIENT_ID}" --web-redirect-uris "${redirects[@]}"
  echo "Redirect URI registered."
fi

if [[ -n "${RESOURCE_GROUP}" ]]; then
  echo "Setting MS365_MCP_ALLOWED_REDIRECT_URIS on Web App:"
  echo "  resource group: ${RESOURCE_GROUP}"
  echo "  web app:        ${WEBAPP_NAME}"
  az webapp config appsettings set \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${WEBAPP_NAME}" \
    --settings "MS365_MCP_ALLOWED_REDIRECT_URIS=${REDIRECT_URI}" \
    >/dev/null
  echo "Web App redirect allowlist updated."
else
  echo "AZURE_RESOURCE_GROUP is not set; skipped Web App app-settings update."
fi
