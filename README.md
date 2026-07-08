# GiesChat

GiesChat is a customized deployment of [LibreChat](https://github.com/danny-avila/LibreChat)
built for the Gies College of Business at the University of Illinois. It keeps
LibreChat's multi-provider chat core and adds Gies-specific surfaces:

- **Illinois SSO** — students sign in with their Microsoft/Entra (Illinois)
  account, so each person is their own user (a shared guest user is also
  supported for local testing).
- **Gies Course Tutors** — a curated marketplace of Socratic tutor agents, one
  per Gies course, grounded in scraped course reference material.
- **Replit App Builder** — students describe an app in natural language and
  Replit Agent builds it on their own Replit account, rendered live inside the
  chat artifacts panel.
- **Canvas MCP** — per-user Canvas integration against the Illinois Canvas API.
- **Brainstorm Rooms** — native multi-user rooms (a shareable link is the join
  capability) with live SSE group chat, presence/typing, mention-gated `@ai`,
  file grounding, polls, and summarize/catch-up. Room owners can turn a
  discussion into a live web app via the Replit MCP.

It is a monorepo. New backend code is TypeScript in `packages/api`; the `/api`
Express server is a thin JS layer over it. Shared types live in
`packages/data-provider`, database models in `packages/data-schemas`, and the
React SPA in `client`.

| Workspace | Purpose |
|---|---|
| `api` | Express server (thin JS wrappers over `packages/api`) |
| `packages/api` | Backend logic (TypeScript) |
| `packages/data-schemas` | Mongoose models/schemas |
| `packages/data-provider` | Shared API types, endpoints, data-service (frontend + backend) |
| `client` | Frontend React SPA |
| `packages/client` | Shared frontend utilities |

## Setup

**Prerequisites**

- Node.js 24 (`v24.16.0`)
- MongoDB (local or hosted)
- Docker (optional — used for the local runtime and supporting services such as
  the RAG API and MeiliSearch)

**Install**

```bash
npm ci
npm run build            # build all workspaces via Turborepo
```

If dependencies or the lockfile changed, `npm run smart-reinstall` installs and
builds in one step; `npm run reinstall` does a clean reinstall.

**Configure**

1. Copy the environment template and fill it in:
   ```bash
   cp .env.example .env
   ```
   Required secrets include `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
   `CREDS_KEY` (64 hex chars), `CREDS_IV` (32 hex chars), and `MEILI_MASTER_KEY`.
   `DOMAIN_CLIENT` / `DOMAIN_SERVER` must match the URL the app is served from.
   Never commit real secrets.
2. App configuration — endpoints, MCP servers, and feature flags such as
   `interface.brainstormRooms` — lives in `librechat.yaml` at the repo root.

## Usage

**Run locally**

```bash
npm run backend:dev      # Express API with file watching (http://localhost:3080)
npm run frontend:dev     # Frontend dev server with HMR (http://localhost:3090)
```

`npm run backend` runs the production server. The frontend dev server needs the
backend running and a built `client/dist` (`npm run build`).

**Rebuild a single package** after changing it, e.g. shared types:

```bash
npm run build:data-provider
```

**Tests**

Tests use Jest and run per workspace, from that workspace's directory:

```bash
cd packages/api && npx jest <pattern>
cd api && npx jest <pattern>
cd client && npx jest <pattern>
```

Backend tests use `mongodb-memory-server` for a real in-memory MongoDB rather
than mocking database calls.

## License

GiesChat is derived from LibreChat and distributed under the same license; see
the upstream [LibreChat](https://github.com/danny-avila/LibreChat) project for
license terms and full platform documentation.
