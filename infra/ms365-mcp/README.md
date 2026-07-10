# Microsoft 365 Outlook MCP Deployment Notes

GiesChat connects to the hosted Outlook MCP server at:

```text
https://ms365-mcp.azurewebsites.net/mcp
```

In HTTP mode, `@softeria/ms-365-mcp-server` acts as the OAuth authorization
server for MCP clients and forwards the MCP client's `redirect_uri` to
Microsoft Entra. That means the Entra app registration used by the hosted MCP
server must include GiesChat's MCP callback URL exactly:

```text
https://gieschat.azurewebsites.net/api/mcp/ms365-outlook/oauth/callback
```

If that URI is missing, Microsoft returns:

```text
AADSTS50011: The redirect URI ... does not match the redirect URIs configured
for the application ...
```

## Fix The Redirect URI

Run the helper script after logging in with an Azure account that can update the
MS365 MCP app registration:

```bash
infra/ms365-mcp/configure-gieschat-redirect.sh
```

The script defaults to the Illinois-owned app registration used by the hosted
MCP Web App:

```text
0cb50d47-5b9d-4aff-bfd9-e44be6b6c830
```

The original failing client ID, `084a3e9f-a9f4-43f7-89f9-d229cf97853e`, is the
upstream package's default multi-tenant app and is not owned by the Illinois
tenant, so its redirect URIs cannot be fixed from this subscription.

Override defaults with environment variables when needed:

```bash
MS365_MCP_CLIENT_ID=<app-client-id> \
GIESCHAT_MCP_REDIRECT_URI=https://gieschat.azurewebsites.net/api/mcp/ms365-outlook/oauth/callback \
infra/ms365-mcp/configure-gieschat-redirect.sh
```

If you also set `AZURE_RESOURCE_GROUP` and `MS365_MCP_WEBAPP_NAME`, the script
sets the hosted MCP app's `MS365_MCP_ALLOWED_REDIRECT_URIS` app setting to the
same callback URI. This makes the MCP server reject unexpected redirect URIs
before forwarding users to Microsoft.

```bash
AZURE_RESOURCE_GROUP=<resource-group> \
MS365_MCP_WEBAPP_NAME=ms365-mcp \
infra/ms365-mcp/configure-gieschat-redirect.sh
```

## Manual Azure Portal Fix

1. Open Azure Portal > Microsoft Entra ID > App registrations.
2. Open the app with client ID `0cb50d47-5b9d-4aff-bfd9-e44be6b6c830`.
3. Go to Authentication.
4. Under Web redirect URIs, add:

```text
https://gieschat.azurewebsites.net/api/mcp/ms365-outlook/oauth/callback
```

5. Save, then retry connecting the `ms365-outlook` MCP server from GiesChat.

## Admin Consent

The app registration requests these delegated Microsoft Graph scopes for the
read-only Outlook preset:

```text
Calendars.Read
Calendars.Read.Shared
Contacts.Read
Mail.Read
MailboxSettings.Read
User.Read
```

An Entra administrator may still need to grant tenant-wide admin consent before
all users can connect without an approval prompt.
