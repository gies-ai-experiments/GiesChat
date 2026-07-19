# GiesChat

Customized LibreChat deployment for Gies College of Business. Setup, dev commands, workspace layout, and test instructions are in [README.md](README.md) — read that first; don't duplicate it here.

## Non-obvious operational facts

- **Deploys automatically on push to `main`** via `.github/workflows/azure-deploy.yml` → Azure Web App `gieschat` (image `dlacrgieschat.azurecr.io/gieschat/api`). Pushing to main IS deploying — treat it accordingly.
- **`gh issue list` / `gh pr list` without `-R` resolve to upstream LibreChat** (fork inherits issue redirect). Always use `-R gies-ai-experiments/GiesChat`.
- **Upstream sync**: remote `upstream` = danny-avila/LibreChat. Sync pattern is a merge commit on main (see `00ef3ad5a`, 2026-07-14). Keeping Gies customizations mergeable with upstream is an open concern — see issue #11 before large refactors of shared LibreChat code.
- App config (endpoints, MCP servers, feature flags like `interface.brainstormRooms`) lives in `librechat.yaml`; secrets in `.env` (never commit).
- MS365 Outlook MCP Entra redirect-URI fix: `infra/ms365-mcp/README.md` (AADSTS50011).
- Collaborator **ashcastelinocs124** (Ash) commits directly to main — pull before starting work.

## Current Focus

Faculty trial is live: invite sent 2026-07-19 to 40 BADM faculty (GiesChat + Quick continuum, fall-deployment framing) — respond to use-case replies as they arrive. Replit meeting 7/22 12pm CT (auth/Azure-deploy/DPA/credits — outcome may drop App Builder's personal-Replit-account requirement). Still pending: drift strategy (issue #11), nav redesign (PR #12), MindForum rooms (#8).

## Session Log

### 2026-07-19
- Completed: **Sent the faculty trial invite to 40 BADM faculty** — one email positioning a continuum: Quick (quick.disruptionlab.illinois.edu) for classroom apps including students, GiesChat App Builder for faculty wanting more control (free personal Replit account required for now); Azure hosting + built-in AI as headline; CTA = bring a course or research use case for fall deployment. Draft in `docs/outreach/` (local-only, git-excluded via `.git/info/exclude` since Vishal doesn't develop in this repo). Composed via the Outlook skill (Thunderbird MCP wasn't connected). Also filed a promotion-dossier evidence note (`~/admin/associate-2026-promotion/evidence/gieschat-quick-summer-2026.md` — private, not shared with faculty). Pulled Ash's latest (default model → gpt-5.4-mini, tour step for report-issue).
- Next: (1) **Respond to faculty use-case replies**; log them in `docs/outreach/responses.md` as they land. (2) **Before ANY faculty puts students on Quick: build the per-site daily AI cap + Azure Cost Management alert** (uniquick roadmap #4 — pre-committed hard gate). (3) Replit meeting 7/22 12pm CT; if the personal-account requirement drops, tell responding faculty. (4) Carry-over: issue #11 drift decisions, PR #12 nav redesign, issue #8 MindForum rooms.
